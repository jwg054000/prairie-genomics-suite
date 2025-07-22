const { UserInputError, ForbiddenError } = require('apollo-server-express');
const { ObjectId } = require('mongodb');
const { EventEmitter } = require('events');

class AnalysisService extends EventEmitter {
  constructor(db, logger, projectService, datasetService, pipelineService) {
    super();
    this.db = db;
    this.logger = logger;
    this.projectService = projectService;
    this.datasetService = datasetService;
    this.pipelineService = pipelineService;
  }

  async runAnalysis(userId, analysisData) {
    const { 
      name, 
      description, 
      projectId, 
      datasetId, 
      pipelineId, 
      parameters,
      computePreferences = {},
      notifications = {}
    } = analysisData;

    // Verify project access
    const project = await this.projectService.getProjectById(projectId, userId);
    if (!this.projectService.canUserEditProject(project, userId)) {
      throw new ForbiddenError('Permission denied to run analyses in this project');
    }

    // Verify dataset exists and is ready
    const dataset = await this.datasetService.getDatasetById(datasetId, userId);
    if (dataset.status !== 'READY') {
      throw new UserInputError('Dataset is not ready for analysis');
    }

    // Verify pipeline exists
    const pipeline = await this.pipelineService.getPipelineById(pipelineId);

    // Validate dataset compatibility with pipeline
    this.validateDatasetPipelineCompatibility(dataset, pipeline);

    // Calculate estimated cost and runtime
    const estimatedCost = this.calculateEstimatedCost(pipeline, dataset, computePreferences);
    const estimatedRuntime = this.calculateEstimatedRuntime(pipeline, dataset);

    const analysis = {
      name,
      description,
      projectId: new ObjectId(projectId),
      datasetId: new ObjectId(datasetId),
      pipelineId: new ObjectId(pipelineId),
      ownerId: userId,
      parameters: {
        statistical: parameters.statistical || {},
        filtering: parameters.filtering || {},
        visualization: parameters.visualization || {},
        custom: parameters.custom || {}
      },
      status: 'QUEUED',
      progress: {
        percentage: 0,
        currentStep: 'Initializing',
        estimatedTimeRemaining: estimatedRuntime,
        stepProgress: []
      },
      results: null,
      logs: [{
        id: new ObjectId(),
        timestamp: new Date(),
        level: 'INFO',
        message: 'Analysis queued',
        step: null,
        details: null
      }],
      cost: {
        estimated: estimatedCost,
        actual: null,
        breakdown: {
          compute: estimatedCost * 0.7,
          storage: estimatedCost * 0.2,
          dataTransfer: estimatedCost * 0.05,
          additionalServices: estimatedCost * 0.05
        }
      },
      queuePosition: await this.getQueuePosition(),
      startedAt: null,
      completedAt: null,
      createdAt: new Date()
    };

    const result = await this.db.collection('analyses').insertOne(analysis);
    const analysisId = result.insertedId;

    this.logger.info('Analysis created', { 
      analysisId, 
      userId, 
      projectId, 
      datasetId, 
      pipelineId,
      estimatedCost 
    });

    // Queue the analysis for execution
    this.queueAnalysisExecution(analysisId.toString());

    return { ...analysis, id: analysisId };
  }

  async getAnalysisById(analysisId, userId) {
    const analysis = await this.db.collection('analyses').findOne({ _id: new ObjectId(analysisId) });
    
    if (!analysis) {
      throw new UserInputError('Analysis not found');
    }

    // Check project access
    const project = await this.projectService.getProjectById(analysis.projectId, userId);

    // Populate related entities
    const dataset = await this.datasetService.getDatasetById(analysis.datasetId, userId);
    const pipeline = await this.pipelineService.getPipelineById(analysis.pipelineId);

    return { 
      ...analysis, 
      id: analysis._id,
      project,
      dataset,
      pipeline
    };
  }

  async cancelAnalysis(analysisId, userId) {
    const analysis = await this.getAnalysisById(analysisId, userId);

    if (!['QUEUED', 'RUNNING'].includes(analysis.status)) {
      throw new UserInputError('Analysis cannot be cancelled in current state');
    }

    // Check if user can cancel (owner or project admin)
    if (analysis.ownerId.toString() !== userId.toString() && 
        !this.projectService.canUserEditProject(analysis.project, userId)) {
      throw new ForbiddenError('Permission denied to cancel this analysis');
    }

    const result = await this.db.collection('analyses').findOneAndUpdate(
      { _id: new ObjectId(analysisId) },
      {
        $set: {
          status: 'CANCELLED',
          completedAt: new Date()
        },
        $push: {
          logs: {
            id: new ObjectId(),
            timestamp: new Date(),
            level: 'INFO',
            message: 'Analysis cancelled by user',
            step: null,
            details: { cancelledBy: userId }
          }
        }
      },
      { returnDocument: 'after' }
    );

    this.logger.info('Analysis cancelled', { analysisId, userId });

    // Emit cancellation event for real-time updates
    this.emit('analysisCancelled', { analysisId, userId });

    return { ...result.value, id: result.value._id };
  }

  async cloneAnalysis(analysisId, userId, modifications = {}) {
    const originalAnalysis = await this.getAnalysisById(analysisId, userId);

    const cloneData = {
      name: modifications.name || `${originalAnalysis.name} (Copy)`,
      description: originalAnalysis.description,
      projectId: originalAnalysis.projectId.toString(),
      datasetId: originalAnalysis.datasetId.toString(),
      pipelineId: originalAnalysis.pipelineId.toString(),
      parameters: {
        ...originalAnalysis.parameters,
        ...(modifications.parameters || {})
      },
      computePreferences: modifications.computePreferences || {},
      notifications: {}
    };

    return await this.runAnalysis(userId, cloneData);
  }

  async deleteAnalysis(analysisId, userId) {
    const analysis = await this.getAnalysisById(analysisId, userId);

    // Only allow deletion if analysis is not running
    if (analysis.status === 'RUNNING') {
      throw new UserInputError('Cannot delete running analysis. Cancel it first.');
    }

    // Check permissions
    if (analysis.ownerId.toString() !== userId.toString() && 
        !this.projectService.canUserEditProject(analysis.project, userId)) {
      throw new ForbiddenError('Permission denied to delete this analysis');
    }

    // Delete analysis results from storage if they exist
    if (analysis.results && analysis.results.files) {
      for (const file of analysis.results.files) {
        try {
          await this.fileService.deleteFile(file.path);
        } catch (error) {
          this.logger.warn('Failed to delete analysis result file', { 
            filePath: file.path, 
            error: error.message 
          });
        }
      }
    }

    await this.db.collection('analyses').deleteOne({ _id: new ObjectId(analysisId) });

    this.logger.info('Analysis deleted', { analysisId, userId });

    return true;
  }

  async getProjectAnalyses(projectId, userId, filters = {}) {
    // Verify project access
    const project = await this.projectService.getProjectById(projectId, userId);

    const query = { projectId: new ObjectId(projectId) };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.pipelineId) {
      query.pipelineId = new ObjectId(filters.pipelineId);
    }

    const analyses = await this.db.collection('analyses')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.offset || 0)
      .toArray();

    return analyses.map(analysis => ({ ...analysis, id: analysis._id }));
  }

  async getAnalysisRecommendations(datasetId, userId, researchQuestion = null) {
    const dataset = await this.datasetService.getDatasetById(datasetId, userId);
    
    // Get compatible pipelines
    const pipelines = await this.pipelineService.getCompatiblePipelines(dataset.type);
    
    // Score pipelines based on dataset characteristics and research question
    const recommendations = pipelines.map(pipeline => {
      const confidence = this.calculateRecommendationConfidence(dataset, pipeline, researchQuestion);
      const reasoning = this.generateRecommendationReasoning(dataset, pipeline, researchQuestion);
      const suggestedParameters = this.generateSuggestedParameters(dataset, pipeline);
      
      return {
        pipeline,
        confidence,
        reasoning,
        suggestedParameters,
        expectedRuntime: pipeline.estimatedRuntime || 0,
        estimatedCost: this.calculateEstimatedCost(pipeline, dataset),
        prerequisites: this.getAnalysisPrerequisites(dataset, pipeline),
        alternativeApproaches: []
      };
    });

    // Sort by confidence score
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  async updateAnalysisProgress(analysisId, progressUpdate) {
    const { status, progress, logs = [] } = progressUpdate;

    const updateDoc = {
      $set: {
        status,
        'progress.percentage': progress.percentage,
        'progress.currentStep': progress.currentStep,
        'progress.estimatedTimeRemaining': progress.estimatedTimeRemaining,
        'progress.stepProgress': progress.stepProgress
      }
    };

    if (logs.length > 0) {
      updateDoc.$push = {
        logs: { $each: logs.map(log => ({ ...log, id: new ObjectId() })) }
      };
    }

    if (status === 'RUNNING' && !progressUpdate.startedAt) {
      updateDoc.$set.startedAt = new Date();
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      updateDoc.$set.completedAt = new Date();
    }

    const result = await this.db.collection('analyses').findOneAndUpdate(
      { _id: new ObjectId(analysisId) },
      updateDoc,
      { returnDocument: 'after' }
    );

    // Emit progress event for real-time updates
    this.emit('analysisProgress', {
      analysisId,
      status: result.value.status,
      progress: result.value.progress,
      logs: logs
    });

    return result.value;
  }

  async setAnalysisResults(analysisId, results) {
    const analysis = await this.db.collection('analyses').findOne({ _id: new ObjectId(analysisId) });
    
    if (!analysis) {
      throw new UserInputError('Analysis not found');
    }

    // Calculate actual cost
    const actualCost = this.calculateActualCost(analysis);

    const result = await this.db.collection('analyses').findOneAndUpdate(
      { _id: new ObjectId(analysisId) },
      {
        $set: {
          results: {
            id: new ObjectId(),
            analysis: analysis._id,
            summary: results.summary,
            tables: results.tables || [],
            visualizations: results.visualizations || [],
            files: results.files || [],
            statistics: results.statistics || {},
            interpretation: results.interpretation || null
          },
          'cost.actual': actualCost,
          status: 'COMPLETED',
          completedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    this.logger.info('Analysis results saved', { 
      analysisId, 
      tableCount: results.tables?.length || 0,
      visualizationCount: results.visualizations?.length || 0,
      actualCost
    });

    // Emit completion event
    this.emit('analysisCompleted', {
      analysisId,
      analysis: result.value
    });

    return result.value.results;
  }

  // Queue and execution methods
  async queueAnalysisExecution(analysisId) {
    // In real implementation, this would use a proper job queue like Bull or AWS SQS
    setTimeout(async () => {
      await this.executeAnalysis(analysisId);
    }, Math.random() * 5000 + 1000); // Random delay to simulate queue
  }

  async executeAnalysis(analysisId) {
    try {
      const analysis = await this.db.collection('analyses').findOne({ _id: new ObjectId(analysisId) });
      
      if (!analysis || analysis.status !== 'QUEUED') {
        return;
      }

      // Start analysis
      await this.updateAnalysisProgress(analysisId, {
        status: 'RUNNING',
        progress: {
          percentage: 0,
          currentStep: 'Initializing analysis',
          estimatedTimeRemaining: analysis.cost.estimated * 60, // Rough estimate in seconds
          stepProgress: []
        },
        logs: [{
          timestamp: new Date(),
          level: 'INFO',
          message: 'Analysis execution started',
          step: 'initialization'
        }]
      });

      // Get pipeline steps
      const pipeline = await this.pipelineService.getPipelineById(analysis.pipelineId);
      const steps = pipeline.steps || [];

      // Execute each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const progress = ((i + 1) / steps.length) * 100;

        await this.updateAnalysisProgress(analysisId, {
          status: 'RUNNING',
          progress: {
            percentage: progress,
            currentStep: step.name,
            estimatedTimeRemaining: Math.max(0, (100 - progress) * 10),
            stepProgress: steps.map((s, idx) => ({
              stepName: s.name,
              status: idx < i ? 'COMPLETED' : idx === i ? 'RUNNING' : 'PENDING',
              progress: idx < i ? 100 : idx === i ? 50 : 0,
              startedAt: idx <= i ? new Date() : null,
              estimatedCompletion: null
            }))
          },
          logs: [{
            timestamp: new Date(),
            level: 'INFO',
            message: `Executing step: ${step.name}`,
            step: step.name
          }]
        });

        // Simulate step execution
        await this.simulateStepExecution(analysisId, step, analysis);

        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 3000));
      }

      // Generate mock results
      const results = await this.generateMockResults(analysis);
      await this.setAnalysisResults(analysisId, results);

    } catch (error) {
      this.logger.error('Analysis execution failed', { analysisId, error: error.message });

      await this.updateAnalysisProgress(analysisId, {
        status: 'FAILED',
        progress: {
          percentage: 0,
          currentStep: 'Failed',
          estimatedTimeRemaining: 0,
          stepProgress: []
        },
        logs: [{
          timestamp: new Date(),
          level: 'ERROR',
          message: `Analysis failed: ${error.message}`,
          step: null,
          details: { error: error.stack }
        }]
      });
    }
  }

  // Helper methods
  validateDatasetPipelineCompatibility(dataset, pipeline) {
    const requirements = pipeline.inputRequirements;

    if (!requirements.dataTypes.includes(dataset.type)) {
      throw new UserInputError(`Pipeline requires dataset type ${requirements.dataTypes.join(' or ')}, but dataset is ${dataset.type}`);
    }

    if (dataset.sampleCount < requirements.minSamples) {
      throw new UserInputError(`Pipeline requires at least ${requirements.minSamples} samples, but dataset has ${dataset.sampleCount}`);
    }

    if (requirements.maxSamples && dataset.sampleCount > requirements.maxSamples) {
      throw new UserInputError(`Pipeline supports at most ${requirements.maxSamples} samples, but dataset has ${dataset.sampleCount}`);
    }
  }

  calculateEstimatedCost(pipeline, dataset, computePreferences = {}) {
    const baseCost = pipeline.computeRequirements.estimatedCost || 5.0;
    const sampleMultiplier = Math.max(1, (dataset.sampleCount || 10) / 10);
    const featureMultiplier = Math.max(1, (dataset.featureCount || 1000) / 1000);
    
    let cost = baseCost * sampleMultiplier * featureMultiplier;

    if (computePreferences.priority === 'HIGH') cost *= 1.5;
    if (computePreferences.priority === 'URGENT') cost *= 2.0;

    return Math.round(cost * 100) / 100;
  }

  calculateEstimatedRuntime(pipeline, dataset) {
    const baseRuntime = pipeline.estimatedRuntime || 300; // seconds
    const sampleMultiplier = Math.max(1, (dataset.sampleCount || 10) / 10);
    
    return Math.round(baseRuntime * sampleMultiplier);
  }

  calculateActualCost(analysis) {
    if (!analysis.startedAt || !analysis.completedAt) {
      return analysis.cost.estimated;
    }

    const durationMinutes = (analysis.completedAt - analysis.startedAt) / (1000 * 60);
    const costPerMinute = 0.1; // Example rate
    
    return Math.round(durationMinutes * costPerMinute * 100) / 100;
  }

  async getQueuePosition() {
    const queuedCount = await this.db.collection('analyses').countDocuments({ status: 'QUEUED' });
    return queuedCount + 1;
  }

  calculateRecommendationConfidence(dataset, pipeline, researchQuestion) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on dataset type match
    if (pipeline.inputRequirements.dataTypes.includes(dataset.type)) {
      confidence += 0.3;
    }

    // Increase confidence based on research question keywords
    if (researchQuestion && pipeline.description) {
      const questionWords = researchQuestion.toLowerCase().split(' ');
      const descWords = pipeline.description.toLowerCase();
      const matches = questionWords.filter(word => descWords.includes(word));
      confidence += (matches.length / questionWords.length) * 0.2;
    }

    return Math.min(1.0, confidence);
  }

  generateRecommendationReasoning(dataset, pipeline, researchQuestion) {
    let reasoning = `This pipeline is compatible with ${dataset.type} data`;
    
    if (dataset.sampleCount) {
      reasoning += ` and works well with your dataset of ${dataset.sampleCount} samples`;
    }

    if (researchQuestion) {
      reasoning += `. It aligns with your research question about ${researchQuestion}`;
    }

    return reasoning;
  }

  generateSuggestedParameters(dataset, pipeline) {
    // Return pipeline-specific default parameters
    return {
      statistical: {
        pValueThreshold: 0.05,
        foldChangeThreshold: 1.5,
        multipleTestingCorrection: 'FDR_BH'
      },
      filtering: {
        minExpression: 1.0,
        minSamples: Math.max(3, Math.floor(dataset.sampleCount * 0.1))
      }
    };
  }

  getAnalysisPrerequisites(dataset, pipeline) {
    const prerequisites = [];

    if (dataset.status !== 'READY') {
      prerequisites.push('Dataset must be fully processed');
    }

    if (!dataset.qcResults) {
      prerequisites.push('Quality control assessment needed');
    }

    return prerequisites;
  }

  async simulateStepExecution(analysisId, step, analysis) {
    // Simulate different step execution times
    const stepDurations = {
      'Quality Control': 2000,
      'Normalization': 3000,
      'Differential Expression': 5000,
      'Pathway Analysis': 4000,
      'Visualization': 2000
    };

    const duration = stepDurations[step.name] || 3000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  async generateMockResults(analysis) {
    // Generate mock analysis results based on pipeline type
    const mockResults = {
      summary: {
        significantFeatures: Math.floor(Math.random() * 500) + 100,
        totalFeatures: 15000,
        pValueRange: [1e-10, 0.05],
        foldChangeRange: [-5.2, 4.8],
        keyFindings: [
          'Identified 347 significantly differentially expressed genes',
          'Top pathway: Immune response signaling',
          'Strong clustering observed between treatment groups'
        ]
      },
      tables: [
        {
          id: new ObjectId(),
          name: 'Differential Expression Results',
          type: 'differential_expression',
          description: 'Statistical results for all tested features',
          data: [], // Would contain actual results data
          rowCount: 347,
          columnCount: 8,
          preview: {
            headers: ['Gene', 'Log2FC', 'P-value', 'Adj. P-value', 'Significance'],
            rows: [
              ['GENE1', '2.34', '1.2e-5', '0.001', 'Up'],
              ['GENE2', '-1.87', '3.4e-4', '0.023', 'Down']
            ],
            hasMore: true
          }
        }
      ],
      visualizations: [
        {
          id: new ObjectId(),
          name: 'PCA Plot',
          type: 'PCA_PLOT',
          data: {}, // Would contain plot data
          config: {
            title: 'Principal Component Analysis',
            xAxis: { label: 'PC1 (45.2% variance)' },
            yAxis: { label: 'PC2 (23.1% variance)' }
          }
        },
        {
          id: new ObjectId(),
          name: 'Volcano Plot',
          type: 'VOLCANO_PLOT',
          data: {}, // Would contain plot data
          config: {
            title: 'Differential Expression',
            xAxis: { label: 'Log2 Fold Change' },
            yAxis: { label: '-Log10(p-value)' }
          }
        }
      ],
      files: [],
      statistics: {
        tests: [{
          name: 'T-test',
          statistic: 2.34,
          pValue: 0.023,
          degreesOfFreedom: 178,
          assumptions: ['Normality', 'Equal variance']
        }],
        corrections: [{
          method: 'FDR_BH',
          originalPValues: 15000,
          significantAfterCorrection: 347,
          threshold: 0.05
        }],
        effectSizes: [{
          measure: 'Cohen\'s d',
          value: 0.8,
          confidenceInterval: [0.6, 1.0],
          interpretation: 'Large effect'
        }]
      }
    };

    return mockResults;
  }
}

module.exports = AnalysisService;