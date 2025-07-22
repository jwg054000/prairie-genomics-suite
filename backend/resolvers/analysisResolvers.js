const { ForbiddenError } = require('apollo-server-express');
const { withFilter } = require('graphql-subscriptions');

const analysisResolvers = {
  Query: {
    analysis: async (parent, { id }, context) => {
      const { userId } = context.user;
      return await context.services.analysis.getAnalysisById(id, userId);
    },

    analyses: async (parent, { projectId, status, limit, offset }, context) => {
      const { userId } = context.user;
      
      if (projectId) {
        return await context.services.analysis.getProjectAnalyses(projectId, userId, {
          status,
          limit,
          offset
        });
      }

      // Get analyses across all user's projects
      const userProjects = await context.services.project.getUserProjects(userId);
      const projectIds = userProjects.map(p => p.id);
      
      const allAnalyses = [];
      for (const pId of projectIds) {
        const projectAnalyses = await context.services.analysis.getProjectAnalyses(pId, userId, {
          status,
          limit: limit || 50,
          offset: offset || 0
        });
        allAnalyses.push(...projectAnalyses);
      }

      // Sort by creation date and apply limit
      const sortedAnalyses = allAnalyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return sortedAnalyses.slice(0, limit || 50);
    },

    analysisRecommendations: async (parent, { datasetId, researchQuestion }, context) => {
      const { userId } = context.user;
      return await context.services.analysis.getAnalysisRecommendations(datasetId, userId, researchQuestion);
    }
  },

  Mutation: {
    runAnalysis: async (parent, { input }, context) => {
      const { userId } = context.user;
      
      // Add missing projectId if not provided
      if (!input.projectId) {
        const dataset = await context.services.dataset.getDatasetById(input.datasetId, userId);
        input.projectId = dataset.projectId.toString();
      }

      const analysis = await context.services.analysis.runAnalysis(userId, input);
      
      // Increment pipeline usage
      await context.services.pipeline.incrementUsage(input.pipelineId);
      
      return analysis;
    },

    cancelAnalysis: async (parent, { id }, context) => {
      const { userId } = context.user;
      return await context.services.analysis.cancelAnalysis(id, userId);
    },

    cloneAnalysis: async (parent, { id, modifications }, context) => {
      const { userId } = context.user;
      return await context.services.analysis.cloneAnalysis(id, userId, modifications);
    },

    deleteAnalysis: async (parent, { id }, context) => {
      const { userId } = context.user;
      return await context.services.analysis.deleteAnalysis(id, userId);
    }
  },

  Subscription: {
    analysisProgress: {
      subscribe: withFilter(
        (parent, args, context) => {
          return context.pubsub.asyncIterator(`ANALYSIS_PROGRESS_${args.analysisId}`);
        },
        async (payload, variables, context) => {
          // Check if user has access to this analysis
          try {
            await context.services.analysis.getAnalysisById(variables.analysisId, context.user.userId);
            return true;
          } catch (error) {
            return false;
          }
        }
      )
    },

    analysisCompleted: {
      subscribe: withFilter(
        (parent, args, context) => {
          return context.pubsub.asyncIterator('ANALYSIS_COMPLETED');
        },
        async (payload, variables, context) => {
          // Only send notification if the analysis belongs to the user
          return payload.analysisCompleted.ownerId.toString() === variables.userId;
        }
      )
    }
  },

  Analysis: {
    project: async (analysis, args, context) => {
      const { userId } = context.user;
      return await context.services.project.getProjectById(analysis.projectId, userId);
    },

    dataset: async (analysis, args, context) => {
      const { userId } = context.user;
      return await context.services.dataset.getDatasetById(analysis.datasetId, userId);
    },

    pipeline: async (analysis, args, context) => {
      return await context.services.pipeline.getPipelineById(analysis.pipelineId);
    },

    results: async (analysis, args, context) => {
      // Results are already included in the analysis object from the service
      return analysis.results;
    },

    logs: async (analysis, args, context) => {
      // Logs are already included in the analysis object
      return analysis.logs || [];
    },

    cost: async (analysis, args, context) => {
      // Cost is already included in the analysis object
      return analysis.cost;
    }
  },

  AnalysisResults: {
    analysis: async (results, args, context) => {
      const { userId } = context.user;
      return await context.services.analysis.getAnalysisById(results.analysis, userId);
    },

    tables: async (results, args, context) => {
      // Tables are already included in the results object
      return results.tables || [];
    },

    visualizations: async (results, args, context) => {
      // Visualizations are already included in the results object
      return results.visualizations || [];
    },

    files: async (results, args, context) => {
      // Files are already included in the results object
      return results.files || [];
    },

    statistics: async (results, args, context) => {
      // Statistics are already included in the results object
      return results.statistics || {};
    },

    interpretation: async (results, args, context) => {
      // AI interpretation is already included in the results object
      return results.interpretation;
    }
  },

  ResultTable: {
    data: async (table, args, context) => {
      // In a real implementation, you might want to lazy-load large datasets
      // or implement pagination for table data
      return table.data;
    },

    preview: async (table, args, context) => {
      // Generate preview if not already available
      if (table.preview) {
        return table.preview;
      }

      // Generate preview from data
      const data = table.data || [];
      const headers = table.headers || Object.keys(data[0] || {});
      const rows = data.slice(0, 5).map(row => 
        headers.map(header => String(row[header] || ''))
      );

      return {
        headers,
        rows,
        hasMore: data.length > 5
      };
    }
  },

  AnalysisRecommendation: {
    pipeline: async (recommendation, args, context) => {
      return recommendation.pipeline; // Already populated by service
    },

    suggestedParameters: async (recommendation, args, context) => {
      return recommendation.suggestedParameters; // Already populated by service
    }
  },

  AnalysisLog: {
    timestamp: (log) => log.timestamp,
    level: (log) => log.level,
    message: (log) => log.message,
    step: (log) => log.step,
    details: (log) => log.details || null
  },

  AnalysisProgress: {
    percentage: (progress) => progress.percentage || 0,
    currentStep: (progress) => progress.currentStep || 'Initializing',
    estimatedTimeRemaining: (progress) => progress.estimatedTimeRemaining,
    stepProgress: (progress) => progress.stepProgress || []
  },

  StepProgress: {
    stepName: (step) => step.stepName,
    status: (step) => step.status,
    progress: (step) => step.progress || 0,
    startedAt: (step) => step.startedAt,
    estimatedCompletion: (step) => step.estimatedCompletion
  },

  AnalysisCost: {
    estimated: (cost) => cost.estimated || 0,
    actual: (cost) => cost.actual,
    breakdown: (cost) => cost.breakdown || {
      compute: 0,
      storage: 0,
      dataTransfer: 0,
      additionalServices: 0
    }
  },

  CostBreakdown: {
    compute: (breakdown) => breakdown.compute || 0,
    storage: (breakdown) => breakdown.storage || 0,
    dataTransfer: (breakdown) => breakdown.dataTransfer || 0,
    additionalServices: (breakdown) => breakdown.additionalServices || 0
  },

  StatisticalSummary: {
    tests: (summary) => summary.tests || [],
    corrections: (summary) => summary.corrections || [],
    effectSizes: (summary) => summary.effectSizes || [],
    confidenceIntervals: (summary) => summary.confidenceIntervals || null
  },

  StatisticalTest: {
    name: (test) => test.name,
    statistic: (test) => test.statistic,
    pValue: (test) => test.pValue,
    degreesOfFreedom: (test) => test.degreesOfFreedom,
    assumptions: (test) => test.assumptions || []
  },

  MultipleTestingCorrection: {
    method: (correction) => correction.method,
    originalPValues: (correction) => correction.originalPValues,
    significantAfterCorrection: (correction) => correction.significantAfterCorrection,
    threshold: (correction) => correction.threshold
  },

  EffectSize: {
    measure: (effect) => effect.measure,
    value: (effect) => effect.value,
    confidenceInterval: (effect) => effect.confidenceInterval || [],
    interpretation: (effect) => effect.interpretation
  },

  AIInterpretation: {
    keyFindings: (interpretation) => interpretation.keyFindings || [],
    statisticalSummary: (interpretation) => interpretation.statisticalSummary || '',
    biologicalInsights: (interpretation) => interpretation.biologicalInsights || [],
    recommendations: (interpretation) => interpretation.recommendations || [],
    confidence: (interpretation) => interpretation.confidence || 0,
    sources: (interpretation) => interpretation.sources || []
  }
};

module.exports = analysisResolvers;