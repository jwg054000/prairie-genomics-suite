const { UserInputError, ForbiddenError } = require('apollo-server-express');
const { ObjectId } = require('mongodb');

class PipelineService {
  constructor(db, logger, userService) {
    this.db = db;
    this.logger = logger;
    this.userService = userService;
    this.initializeDefaultPipelines();
  }

  async initializeDefaultPipelines() {
    // Check if default pipelines exist, if not create them
    const existingPipelines = await this.db.collection('pipelines').countDocuments({ isDefault: true });
    
    if (existingPipelines === 0) {
      await this.createDefaultPipelines();
    }
  }

  async createDefaultPipelines() {
    const defaultPipelines = [
      {
        name: 'RNA-seq Differential Expression',
        version: '1.0.0',
        description: 'Standard differential expression analysis for bulk RNA-seq data using DESeq2-like methodology',
        category: 'DIFFERENTIAL_EXPRESSION',
        steps: [
          {
            id: 'quality_control',
            name: 'Quality Control',
            description: 'Assess data quality and generate QC metrics',
            tool: 'fastqc',
            version: '0.11.9',
            parameters: { threads: 4 },
            dependencies: []
          },
          {
            id: 'normalization',
            name: 'Count Normalization',
            description: 'Normalize read counts and filter low-expression genes',
            tool: 'deseq2',
            version: '1.32.0',
            parameters: { minCount: 10, minSamples: 3 },
            dependencies: ['quality_control']
          },
          {
            id: 'differential_analysis',
            name: 'Differential Expression Analysis',
            description: 'Perform statistical testing for differential expression',
            tool: 'deseq2',
            version: '1.32.0',
            parameters: { alpha: 0.05, lfcThreshold: 0 },
            dependencies: ['normalization']
          },
          {
            id: 'pathway_analysis',
            name: 'Pathway Enrichment',
            description: 'Perform Gene Ontology and pathway enrichment analysis',
            tool: 'clusterprofiler',
            version: '4.0.5',
            parameters: { pvalueCutoff: 0.05, qvalueCutoff: 0.2 },
            dependencies: ['differential_analysis']
          },
          {
            id: 'visualization',
            name: 'Generate Visualizations',
            description: 'Create PCA plots, volcano plots, and heatmaps',
            tool: 'ggplot2',
            version: '3.3.5',
            parameters: { dpi: 300, format: 'PNG' },
            dependencies: ['differential_analysis', 'pathway_analysis']
          }
        ],
        inputRequirements: {
          dataTypes: ['RNA_SEQ'],
          fileFormats: ['CSV', 'TSV', 'HDF5'],
          minSamples: 6,
          maxSamples: 1000,
          requiredMetadata: ['condition', 'sample_id']
        },
        outputDescription: {
          files: [
            {
              name: 'differential_expression_results.csv',
              type: 'results_table',
              description: 'Statistical results for all tested genes',
              format: 'CSV'
            },
            {
              name: 'normalized_counts.csv',
              type: 'processed_data',
              description: 'Normalized expression counts',
              format: 'CSV'
            }
          ],
          visualizations: [
            {
              name: 'PCA Plot',
              type: 'PCA_PLOT',
              description: 'Principal component analysis of samples'
            },
            {
              name: 'Volcano Plot',
              type: 'VOLCANO_PLOT',
              description: 'Differential expression volcano plot'
            },
            {
              name: 'Expression Heatmap',
              type: 'HEATMAP',
              description: 'Heatmap of top differentially expressed genes'
            }
          ],
          statistics: [
            {
              name: 'Differential Expression Summary',
              type: 'summary_stats',
              description: 'Number of up/down-regulated genes at various thresholds'
            },
            {
              name: 'Pathway Enrichment Results',
              type: 'enrichment_stats',
              description: 'Significantly enriched biological pathways'
            }
          ]
        },
        computeRequirements: {
          minCpu: 2,
          maxCpu: 8,
          minMemory: 4096, // MB
          maxMemory: 32768, // MB
          gpu: false,
          storage: 20, // GB
          estimatedCost: 8.50
        },
        estimatedRuntime: 1200, // 20 minutes
        documentation: `# RNA-seq Differential Expression Pipeline

This pipeline performs standard differential expression analysis for bulk RNA-seq data.

## Input Requirements
- Expression count matrix (genes × samples)
- Sample metadata with condition/treatment information
- Minimum 3 samples per condition (6 total)

## Analysis Steps
1. **Quality Control**: Assess data quality, detect outliers
2. **Normalization**: DESeq2-style normalization and filtering
3. **Statistical Testing**: Wald test for differential expression
4. **Multiple Testing Correction**: Benjamini-Hochberg FDR
5. **Pathway Analysis**: GO and KEGG enrichment
6. **Visualization**: Generate publication-ready plots

## Output
- Differential expression results table
- Normalized count matrix
- Quality control plots
- PCA and volcano plots
- Pathway enrichment results`,
        isPublic: true,
        isDefault: true,
        author: null,
        createdAt: new Date(),
        usage: { count: 0, lastUsed: null }
      },
      {
        name: 'Single-cell RNA-seq Analysis',
        version: '1.0.0',
        description: 'Comprehensive single-cell RNA-seq analysis pipeline including clustering and cell type annotation',
        category: 'SINGLE_CELL_RNA',
        steps: [
          {
            id: 'quality_control',
            name: 'Cell and Gene Filtering',
            description: 'Filter low-quality cells and rarely expressed genes',
            tool: 'scanpy',
            version: '1.8.1',
            parameters: { min_genes_per_cell: 200, min_cells_per_gene: 3 },
            dependencies: []
          },
          {
            id: 'normalization',
            name: 'Normalization and Scaling',
            description: 'Normalize to 10k reads per cell and log-transform',
            tool: 'scanpy',
            version: '1.8.1',
            parameters: { target_sum: 10000, max_value: 10 },
            dependencies: ['quality_control']
          },
          {
            id: 'feature_selection',
            name: 'Highly Variable Genes',
            description: 'Identify highly variable genes for downstream analysis',
            tool: 'scanpy',
            version: '1.8.1',
            parameters: { n_top_genes: 2000, flavor: 'seurat_v3' },
            dependencies: ['normalization']
          },
          {
            id: 'dimensionality_reduction',
            name: 'PCA and UMAP',
            description: 'Perform PCA and UMAP for dimensionality reduction',
            tool: 'scanpy',
            version: '1.8.1',
            parameters: { n_comps: 50, n_neighbors: 15 },
            dependencies: ['feature_selection']
          },
          {
            id: 'clustering',
            name: 'Cell Clustering',
            description: 'Leiden clustering to identify cell populations',
            tool: 'scanpy',
            version: '1.8.1',
            parameters: { resolution: 0.5, method: 'leiden' },
            dependencies: ['dimensionality_reduction']
          },
          {
            id: 'annotation',
            name: 'Cell Type Annotation',
            description: 'Annotate clusters with cell type labels',
            tool: 'celltypist',
            version: '1.2.0',
            parameters: { model: 'Immune_All_Low.pkl' },
            dependencies: ['clustering']
          }
        ],
        inputRequirements: {
          dataTypes: ['SINGLE_CELL_RNA'],
          fileFormats: ['HDF5', 'CSV'],
          minSamples: 1,
          maxSamples: 50,
          requiredMetadata: ['sample_id']
        },
        outputDescription: {
          files: [
            {
              name: 'cell_clusters.csv',
              type: 'results_table',
              description: 'Cell cluster assignments and metadata',
              format: 'CSV'
            },
            {
              name: 'marker_genes.csv',
              type: 'results_table', 
              description: 'Marker genes for each cluster',
              format: 'CSV'
            }
          ],
          visualizations: [
            {
              name: 'UMAP Plot',
              type: 'SCATTER_PLOT',
              description: 'UMAP embedding colored by clusters'
            },
            {
              name: 'Feature Plot',
              type: 'SCATTER_PLOT',
              description: 'Gene expression overlaid on UMAP'
            }
          ],
          statistics: [
            {
              name: 'Clustering Summary',
              type: 'summary_stats',
              description: 'Number of clusters and cells per cluster'
            }
          ]
        },
        computeRequirements: {
          minCpu: 4,
          maxCpu: 16,
          minMemory: 16384,
          maxMemory: 128000,
          gpu: false,
          storage: 50,
          estimatedCost: 25.00
        },
        estimatedRuntime: 2400, // 40 minutes
        documentation: `# Single-cell RNA-seq Analysis Pipeline

Comprehensive analysis pipeline for single-cell RNA sequencing data.

## Features
- Quality control and filtering
- Normalization and scaling
- Dimensionality reduction (PCA, UMAP)
- Unsupervised clustering
- Automatic cell type annotation
- Marker gene identification`,
        isPublic: true,
        isDefault: true,
        author: null,
        createdAt: new Date(),
        usage: { count: 0, lastUsed: null }
      },
      {
        name: 'Variant Calling Pipeline',
        version: '1.0.0',
        description: 'GATK-based variant calling pipeline for whole genome/exome sequencing data',
        category: 'VARIANT_CALLING',
        steps: [
          {
            id: 'alignment',
            name: 'Read Alignment',
            description: 'Align reads to reference genome using BWA-MEM',
            tool: 'bwa',
            version: '0.7.17',
            parameters: { threads: 8 },
            dependencies: []
          },
          {
            id: 'preprocessing',
            name: 'BAM Preprocessing',
            description: 'Sort, mark duplicates, and recalibrate base qualities',
            tool: 'gatk',
            version: '4.2.0',
            parameters: { spark_executor_cores: 4 },
            dependencies: ['alignment']
          },
          {
            id: 'variant_calling',
            name: 'Variant Discovery',
            description: 'Call SNVs and indels using HaplotypeCaller',
            tool: 'gatk',
            version: '4.2.0',
            parameters: { emit_ref_confidence: 'GVCF' },
            dependencies: ['preprocessing']
          },
          {
            id: 'joint_genotyping',
            name: 'Joint Genotyping',
            description: 'Joint genotyping across all samples',
            tool: 'gatk',
            version: '4.2.0',
            parameters: { use_new_qual_calculator: true },
            dependencies: ['variant_calling']
          },
          {
            id: 'filtering',
            name: 'Variant Filtering',
            description: 'Apply quality filters to variant calls',
            tool: 'gatk',
            version: '4.2.0',
            parameters: { filter_expression: 'QD < 2.0 || FS > 60.0' },
            dependencies: ['joint_genotyping']
          },
          {
            id: 'annotation',
            name: 'Variant Annotation',
            description: 'Annotate variants with functional consequences',
            tool: 'vep',
            version: '104',
            parameters: { everything: true, vcf: true },
            dependencies: ['filtering']
          }
        ],
        inputRequirements: {
          dataTypes: ['DNA_SEQ'],
          fileFormats: ['FASTQ', 'BAM'],
          minSamples: 1,
          maxSamples: 100,
          requiredMetadata: ['sample_id', 'library_type']
        },
        outputDescription: {
          files: [
            {
              name: 'variants.vcf.gz',
              type: 'variants',
              description: 'Filtered and annotated variant calls',
              format: 'VCF'
            },
            {
              name: 'variant_summary.txt',
              type: 'summary',
              description: 'Summary statistics of variant calls',
              format: 'TSV'
            }
          ],
          visualizations: [
            {
              name: 'Variant Quality Plots',
              type: 'BOX_PLOT',
              description: 'Distribution of variant quality metrics'
            }
          ],
          statistics: [
            {
              name: 'Variant Call Statistics',
              type: 'summary_stats',
              description: 'Counts of SNVs, indels, and quality metrics'
            }
          ]
        },
        computeRequirements: {
          minCpu: 8,
          maxCpu: 32,
          minMemory: 32768,
          maxMemory: 256000,
          gpu: false,
          storage: 100,
          estimatedCost: 45.00
        },
        estimatedRuntime: 7200, // 2 hours
        documentation: `# Variant Calling Pipeline

GATK4-based pipeline for calling SNVs and indels from DNA sequencing data.

## Features
- BWA-MEM alignment to reference genome
- GATK best practices preprocessing
- HaplotypeCaller for variant discovery
- Joint genotyping across samples
- Variant quality score recalibration
- Functional annotation with VEP`,
        isPublic: true,
        isDefault: true,
        author: null,
        createdAt: new Date(),
        usage: { count: 0, lastUsed: null }
      }
    ];

    await this.db.collection('pipelines').insertMany(defaultPipelines);
    this.logger.info('Default pipelines created', { count: defaultPipelines.length });
  }

  async getPipelineById(pipelineId) {
    const pipeline = await this.db.collection('pipelines').findOne({ _id: new ObjectId(pipelineId) });
    
    if (!pipeline) {
      throw new UserInputError('Pipeline not found');
    }

    // Populate author if exists
    let author = null;
    if (pipeline.author) {
      try {
        author = await this.userService.getUserById(pipeline.author);
      } catch (error) {
        this.logger.warn('Failed to fetch pipeline author', { pipelineId, authorId: pipeline.author });
      }
    }

    return { ...pipeline, id: pipeline._id, author };
  }

  async searchPipelines(filters = {}) {
    const query = {};

    // Only show public pipelines or user's own pipelines
    if (filters.userId) {
      query.$or = [
        { isPublic: true },
        { author: filters.userId }
      ];
    } else {
      query.isPublic = true;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ]
      });
    }

    if (filters.dataType) {
      query['inputRequirements.dataTypes'] = filters.dataType;
    }

    const pipelines = await this.db.collection('pipelines')
      .find(query)
      .sort({ 'usage.count': -1, createdAt: -1 }) // Sort by popularity then recency
      .limit(filters.limit || 20)
      .skip(filters.offset || 0)
      .toArray();

    return pipelines.map(pipeline => ({ ...pipeline, id: pipeline._id }));
  }

  async getCompatiblePipelines(datasetType) {
    const query = {
      isPublic: true,
      'inputRequirements.dataTypes': datasetType
    };

    const pipelines = await this.db.collection('pipelines')
      .find(query)
      .sort({ 'usage.count': -1 })
      .toArray();

    return pipelines.map(pipeline => ({ ...pipeline, id: pipeline._id }));
  }

  async getPopularPipelines(limit = 10) {
    const pipelines = await this.db.collection('pipelines')
      .find({ isPublic: true })
      .sort({ 'usage.count': -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return pipelines.map(pipeline => ({ ...pipeline, id: pipeline._id }));
  }

  async createPipeline(userId, pipelineData) {
    const {
      name,
      description,
      category,
      steps,
      inputRequirements,
      outputDescription,
      documentation,
      isPublic = false
    } = pipelineData;

    // Validate user exists
    await this.userService.getUserById(userId);

    // Validate pipeline data
    this.validatePipelineData(pipelineData);

    const pipeline = {
      name,
      version: '1.0.0',
      description,
      category,
      steps,
      inputRequirements,
      outputDescription,
      computeRequirements: {
        minCpu: 2,
        maxCpu: 8,
        minMemory: 4096,
        maxMemory: 32768,
        gpu: false,
        storage: 10,
        estimatedCost: 5.0
      },
      estimatedRuntime: 600, // Default 10 minutes
      documentation,
      isPublic,
      isDefault: false,
      author: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: { count: 0, lastUsed: null }
    };

    const result = await this.db.collection('pipelines').insertOne(pipeline);

    this.logger.info('Pipeline created', { 
      pipelineId: result.insertedId, 
      userId, 
      name,
      isPublic 
    });

    return { ...pipeline, id: result.insertedId };
  }

  async updatePipeline(pipelineId, userId, updates) {
    const pipeline = await this.getPipelineById(pipelineId);

    // Check if user can edit (author only)
    if (!pipeline.author || pipeline.author.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the pipeline author can edit this pipeline');
    }

    const allowedUpdates = ['name', 'description', 'steps', 'documentation', 'isPublic'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new UserInputError('No valid fields to update');
    }

    // Increment version if steps are updated
    if (updates.steps) {
      const versionParts = pipeline.version.split('.');
      versionParts[1] = (parseInt(versionParts[1]) + 1).toString();
      filteredUpdates.version = versionParts.join('.');
    }

    const result = await this.db.collection('pipelines').findOneAndUpdate(
      { _id: new ObjectId(pipelineId) },
      { 
        $set: { 
          ...filteredUpdates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    this.logger.info('Pipeline updated', { 
      pipelineId, 
      userId, 
      updates: Object.keys(filteredUpdates) 
    });

    return { ...result.value, id: result.value._id };
  }

  async publishPipeline(pipelineId, userId) {
    const pipeline = await this.getPipelineById(pipelineId);

    // Check if user can publish (author only)
    if (!pipeline.author || pipeline.author.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the pipeline author can publish this pipeline');
    }

    if (pipeline.isPublic) {
      throw new UserInputError('Pipeline is already public');
    }

    const result = await this.db.collection('pipelines').findOneAndUpdate(
      { _id: new ObjectId(pipelineId) },
      { 
        $set: { 
          isPublic: true,
          publishedAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );

    this.logger.info('Pipeline published', { pipelineId, userId });

    return { ...result.value, id: result.value._id };
  }

  async deletePipeline(pipelineId, userId) {
    const pipeline = await this.getPipelineById(pipelineId);

    // Check if user can delete (author only, and not default pipelines)
    if (pipeline.isDefault) {
      throw new ForbiddenError('Cannot delete default system pipelines');
    }

    if (!pipeline.author || pipeline.author.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the pipeline author can delete this pipeline');
    }

    // Check if pipeline is used in any analyses
    const usageCount = await this.db.collection('analyses').countDocuments({ 
      pipelineId: new ObjectId(pipelineId) 
    });

    if (usageCount > 0) {
      throw new UserInputError('Cannot delete pipeline that has been used in analyses');
    }

    await this.db.collection('pipelines').deleteOne({ _id: new ObjectId(pipelineId) });

    this.logger.info('Pipeline deleted', { pipelineId, userId });

    return true;
  }

  async incrementUsage(pipelineId) {
    await this.db.collection('pipelines').updateOne(
      { _id: new ObjectId(pipelineId) },
      { 
        $inc: { 'usage.count': 1 },
        $set: { 'usage.lastUsed': new Date() }
      }
    );
  }

  async getUserPipelines(userId) {
    const pipelines = await this.db.collection('pipelines')
      .find({ author: userId })
      .sort({ updatedAt: -1 })
      .toArray();

    return pipelines.map(pipeline => ({ ...pipeline, id: pipeline._id }));
  }

  async validatePipelineData(pipelineData) {
    const { name, steps, inputRequirements, outputDescription } = pipelineData;

    if (!name || name.trim().length === 0) {
      throw new UserInputError('Pipeline name is required');
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      throw new UserInputError('Pipeline must have at least one step');
    }

    if (!inputRequirements || !inputRequirements.dataTypes || inputRequirements.dataTypes.length === 0) {
      throw new UserInputError('Pipeline must specify input data types');
    }

    if (!outputDescription) {
      throw new UserInputError('Pipeline must specify output description');
    }

    // Validate step dependencies
    const stepIds = new Set(steps.map(step => step.id));
    for (const step of steps) {
      for (const dep of step.dependencies || []) {
        if (!stepIds.has(dep)) {
          throw new UserInputError(`Step ${step.id} has invalid dependency: ${dep}`);
        }
      }
    }
  }

  async getPipelineStats(pipelineId) {
    const pipeline = await this.getPipelineById(pipelineId);
    
    // Get usage statistics
    const totalAnalyses = await this.db.collection('analyses').countDocuments({ 
      pipelineId: new ObjectId(pipelineId) 
    });

    const completedAnalyses = await this.db.collection('analyses').countDocuments({ 
      pipelineId: new ObjectId(pipelineId),
      status: 'COMPLETED'
    });

    const avgRating = await this.calculateAverageRating(pipelineId);

    return {
      totalUsage: totalAnalyses,
      successfulRuns: completedAnalyses,
      successRate: totalAnalyses > 0 ? (completedAnalyses / totalAnalyses) * 100 : 0,
      averageRating: avgRating,
      lastUsed: pipeline.usage.lastUsed
    };
  }

  async calculateAverageRating(pipelineId) {
    // In a full implementation, you might have a ratings collection
    // For now, return a mock rating
    return 4.2;
  }
}

module.exports = PipelineService;