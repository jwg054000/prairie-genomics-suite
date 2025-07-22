const { UserInputError, ForbiddenError } = require('apollo-server-express');
const { ObjectId } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DatasetService {
  constructor(db, logger, projectService, fileService) {
    this.db = db;
    this.logger = logger;
    this.projectService = projectService;
    this.fileService = fileService;
  }

  async createDataset(userId, datasetData) {
    const { projectId, name, description, type, subtype, metadata = {} } = datasetData;

    // Verify project access
    const project = await this.projectService.getProjectById(projectId, userId);
    if (!this.projectService.canUserEditProject(project, userId)) {
      throw new ForbiddenError('Permission denied to create datasets in this project');
    }

    const dataset = {
      projectId: new ObjectId(projectId),
      name,
      description,
      type,
      subtype,
      files: [],
      metadata: {
        organism: metadata.organism || null,
        tissue: metadata.tissue || null,
        condition: metadata.condition || [],
        treatmentGroups: metadata.treatmentGroups || [],
        timePoints: metadata.timePoints || [],
        platform: metadata.platform || null,
        libraryType: metadata.libraryType || null,
        customFields: metadata.customFields || {}
      },
      preprocessing: {
        status: 'PENDING',
        steps: [],
        currentStep: null,
        progress: 0,
        logs: []
      },
      qcResults: null,
      status: 'UPLOADING',
      size: 0,
      sampleCount: null,
      featureCount: null,
      createdAt: new Date()
    };

    const result = await this.db.collection('datasets').insertOne(dataset);
    
    this.logger.info('Dataset created', { datasetId: result.insertedId, projectId, userId, name });
    
    return { ...dataset, id: result.insertedId };
  }

  async getDatasetById(datasetId, userId) {
    const dataset = await this.db.collection('datasets').findOne({ _id: new ObjectId(datasetId) });
    
    if (!dataset) {
      throw new UserInputError('Dataset not found');
    }

    // Check project access
    const project = await this.projectService.getProjectById(dataset.projectId, userId);

    return { ...dataset, id: dataset._id, project };
  }

  async updateDataset(datasetId, userId, updates) {
    const dataset = await this.getDatasetById(datasetId, userId);

    // Check if user can edit
    if (!this.projectService.canUserEditProject(dataset.project, userId)) {
      throw new ForbiddenError('Permission denied to edit this dataset');
    }

    const allowedUpdates = ['name', 'description', 'metadata'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new UserInputError('No valid fields to update');
    }

    const result = await this.db.collection('datasets').findOneAndUpdate(
      { _id: new ObjectId(datasetId) },
      { $set: { ...filteredUpdates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    this.logger.info('Dataset updated', { datasetId, userId, updates: Object.keys(filteredUpdates) });
    
    return { ...result.value, id: result.value._id };
  }

  async deleteDataset(datasetId, userId) {
    const dataset = await this.getDatasetById(datasetId, userId);

    // Check if user can edit
    if (!this.projectService.canUserEditProject(dataset.project, userId)) {
      throw new ForbiddenError('Permission denied to delete this dataset');
    }

    // Check if dataset is used in analyses
    const analysisCount = await this.db.collection('analyses').countDocuments({ datasetId: new ObjectId(datasetId) });
    if (analysisCount > 0) {
      throw new UserInputError('Cannot delete dataset that is used in analyses');
    }

    // Delete files from storage
    for (const file of dataset.files) {
      try {
        await this.fileService.deleteFile(file.path);
      } catch (error) {
        this.logger.warn('Failed to delete file', { filePath: file.path, error: error.message });
      }
    }

    await this.db.collection('datasets').deleteOne({ _id: new ObjectId(datasetId) });

    this.logger.info('Dataset deleted', { datasetId, userId });
    
    return true;
  }

  async uploadFiles(datasetId, userId, files) {
    const dataset = await this.getDatasetById(datasetId, userId);

    // Check if user can edit
    if (!this.projectService.canUserEditProject(dataset.project, userId)) {
      throw new ForbiddenError('Permission denied to upload files to this dataset');
    }

    const uploadedFiles = [];
    let totalSize = dataset.size;

    for (const file of files) {
      try {
        // Generate file path
        const fileId = crypto.randomBytes(16).toString('hex');
        const fileExtension = path.extname(file.filename);
        const storagePath = `datasets/${datasetId}/${fileId}${fileExtension}`;

        // Upload file to storage
        const uploadResult = await this.fileService.uploadFile(file, storagePath);

        // Calculate checksum
        const checksum = await this.calculateFileChecksum(uploadResult.path);

        // Detect file metadata
        const fileMetadata = await this.detectFileMetadata(uploadResult.path, file.filename);

        const fileDoc = {
          id: fileId,
          filename: file.filename,
          path: uploadResult.path,
          size: uploadResult.size,
          checksum,
          format: this.detectFileFormat(file.filename),
          compression: this.detectCompression(file.filename),
          metadata: fileMetadata,
          uploadedAt: new Date()
        };

        uploadedFiles.push(fileDoc);
        totalSize += uploadResult.size;

      } catch (error) {
        this.logger.error('File upload failed', { 
          datasetId, 
          filename: file.filename, 
          error: error.message 
        });
        throw new UserInputError(`Failed to upload file ${file.filename}: ${error.message}`);
      }
    }

    // Update dataset with new files
    const result = await this.db.collection('datasets').findOneAndUpdate(
      { _id: new ObjectId(datasetId) },
      { 
        $push: { files: { $each: uploadedFiles } },
        $set: { 
          size: totalSize,
          status: 'PROCESSING',
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    this.logger.info('Files uploaded', { 
      datasetId, 
      userId, 
      fileCount: uploadedFiles.length,
      totalSize 
    });

    // Trigger preprocessing
    await this.startPreprocessing(datasetId, userId);

    return uploadedFiles;
  }

  async startPreprocessing(datasetId, userId, options = {}) {
    const dataset = await this.getDatasetById(datasetId, userId);

    if (dataset.files.length === 0) {
      throw new UserInputError('Cannot preprocess dataset with no files');
    }

    // Define preprocessing steps based on dataset type
    const steps = this.getPreprocessingSteps(dataset.type, options);

    // Update dataset with preprocessing plan
    await this.db.collection('datasets').updateOne(
      { _id: new ObjectId(datasetId) },
      {
        $set: {
          preprocessing: {
            status: 'RUNNING',
            steps: steps.map(step => ({
              name: step.name,
              status: 'PENDING',
              startedAt: null,
              completedAt: null,
              output: null
            })),
            currentStep: steps[0].name,
            progress: 0,
            logs: [{
              timestamp: new Date(),
              level: 'INFO',
              message: 'Preprocessing started',
              step: null
            }]
          }
        }
      }
    );

    // Queue preprocessing job (in real implementation, this would use a job queue)
    this.queuePreprocessingJob(datasetId, steps, options);

    this.logger.info('Preprocessing started', { datasetId, userId, stepCount: steps.length });

    return dataset;
  }

  async getPreprocessingStatus(datasetId, userId) {
    const dataset = await this.getDatasetById(datasetId, userId);
    return dataset.preprocessing;
  }

  async searchDatasets(userId, query, filters = {}) {
    const searchQuery = {};

    // Add project access filter
    const userProjects = await this.projectService.getUserProjects(userId);
    const projectIds = userProjects.map(p => p.id);
    searchQuery.projectId = { $in: projectIds.map(id => new ObjectId(id)) };

    // Add text search
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'metadata.organism': { $regex: query, $options: 'i' } },
        { 'metadata.tissue': { $regex: query, $options: 'i' } }
      ];
    }

    // Add filters
    if (filters.types && filters.types.length > 0) {
      searchQuery.type = { $in: filters.types };
    }

    if (filters.organisms && filters.organisms.length > 0) {
      searchQuery['metadata.organism'] = { $in: filters.organisms };
    }

    if (filters.tissues && filters.tissues.length > 0) {
      searchQuery['metadata.tissue'] = { $in: filters.tissues };
    }

    if (filters.dateRange) {
      searchQuery.createdAt = {
        $gte: new Date(filters.dateRange.start),
        $lte: new Date(filters.dateRange.end)
      };
    }

    const totalCount = await this.db.collection('datasets').countDocuments(searchQuery);
    
    const datasets = await this.db.collection('datasets')
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 20)
      .skip(filters.offset || 0)
      .toArray();

    // Calculate facets for search refinement
    const facets = await this.calculateSearchFacets(searchQuery);

    return {
      totalCount,
      datasets: datasets.map(dataset => ({ ...dataset, id: dataset._id })),
      facets
    };
  }

  // Helper methods
  detectFileFormat(filename) {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.fastq') || ext.endsWith('.fq')) return 'FASTQ';
    if (ext.endsWith('.bam')) return 'BAM';
    if (ext.endsWith('.sam')) return 'SAM';
    if (ext.endsWith('.vcf')) return 'VCF';
    if (ext.endsWith('.csv')) return 'CSV';
    if (ext.endsWith('.tsv') || ext.endsWith('.txt')) return 'TSV';
    if (ext.endsWith('.h5') || ext.endsWith('.hdf5')) return 'HDF5';
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return 'EXCEL';
    return 'PDF';
  }

  detectCompression(filename) {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.gz')) return 'GZIP';
    if (ext.endsWith('.bz2')) return 'BZIP2';
    if (ext.endsWith('.xz')) return 'XZ';
    return 'NONE';
  }

  async detectFileMetadata(filePath, filename) {
    const format = this.detectFileFormat(filename);
    const metadata = {
      headers: [],
      rowCount: null,
      columnCount: null,
      encoding: 'UTF-8',
      delimiter: null
    };

    try {
      if (format === 'CSV') {
        metadata.delimiter = ',';
        // In real implementation, would analyze file headers and structure
        metadata.headers = ['sample1', 'sample2']; // Placeholder
        metadata.rowCount = 1000; // Placeholder
        metadata.columnCount = 50; // Placeholder
      } else if (format === 'TSV') {
        metadata.delimiter = '\t';
        // Similar analysis for TSV files
      }
    } catch (error) {
      this.logger.warn('Failed to detect file metadata', { filePath, error: error.message });
    }

    return metadata;
  }

  async calculateFileChecksum(filePath) {
    // In real implementation, would calculate actual checksum
    return crypto.randomBytes(32).toString('hex');
  }

  getPreprocessingSteps(datasetType, options) {
    const baseSteps = [
      { name: 'File Validation', description: 'Validate file formats and integrity' },
      { name: 'Quality Control', description: 'Generate QC metrics and reports' }
    ];

    const typeSpecificSteps = {
      'RNA_SEQ': [
        { name: 'Read Counting', description: 'Count reads per gene/transcript' },
        { name: 'Normalization', description: 'Normalize expression values' }
      ],
      'DNA_SEQ': [
        { name: 'Variant Calling', description: 'Call genetic variants' },
        { name: 'Annotation', description: 'Annotate variants with functional information' }
      ],
      'SINGLE_CELL_RNA': [
        { name: 'Cell Filtering', description: 'Filter low-quality cells' },
        { name: 'Gene Filtering', description: 'Filter low-expression genes' },
        { name: 'Dimensionality Reduction', description: 'Perform PCA and UMAP' }
      ]
    };

    return [...baseSteps, ...(typeSpecificSteps[datasetType] || [])];
  }

  async queuePreprocessingJob(datasetId, steps, options) {
    // In real implementation, this would submit to a job queue
    // For now, we'll simulate the process
    setTimeout(async () => {
      await this.simulatePreprocessing(datasetId, steps);
    }, 1000);
  }

  async simulatePreprocessing(datasetId, steps) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = ((i + 1) / steps.length) * 100;

      await this.db.collection('datasets').updateOne(
        { _id: new ObjectId(datasetId) },
        {
          $set: {
            'preprocessing.currentStep': step.name,
            'preprocessing.progress': progress,
            [`preprocessing.steps.${i}.status`]: 'RUNNING',
            [`preprocessing.steps.${i}.startedAt`]: new Date()
          },
          $push: {
            'preprocessing.logs': {
              timestamp: new Date(),
              level: 'INFO',
              message: `Started ${step.name}`,
              step: step.name
            }
          }
        }
      );

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.db.collection('datasets').updateOne(
        { _id: new ObjectId(datasetId) },
        {
          $set: {
            [`preprocessing.steps.${i}.status`]: 'COMPLETED',
            [`preprocessing.steps.${i}.completedAt`]: new Date()
          },
          $push: {
            'preprocessing.logs': {
              timestamp: new Date(),
              level: 'INFO',
              message: `Completed ${step.name}`,
              step: step.name
            }
          }
        }
      );
    }

    // Mark preprocessing as complete
    await this.db.collection('datasets').updateOne(
      { _id: new ObjectId(datasetId) },
      {
        $set: {
          'preprocessing.status': 'COMPLETED',
          'preprocessing.currentStep': null,
          'preprocessing.progress': 100,
          status: 'READY',
          sampleCount: Math.floor(Math.random() * 100) + 10,
          featureCount: Math.floor(Math.random() * 20000) + 5000
        }
      }
    );

    this.logger.info('Preprocessing completed', { datasetId });
  }

  async calculateSearchFacets(baseQuery) {
    // Calculate facet counts for search refinement
    const facetPipeline = [
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          types: { $push: '$type' },
          organisms: { $push: '$metadata.organism' },
          tissues: { $push: '$metadata.tissue' }
        }
      }
    ];

    const facetResults = await this.db.collection('datasets').aggregate(facetPipeline).toArray();
    
    if (facetResults.length === 0) {
      return { types: [], organisms: [], tissues: [] };
    }

    const result = facetResults[0];
    
    return {
      types: this.countFacetValues(result.types),
      organisms: this.countFacetValues(result.organisms.filter(Boolean)),
      tissues: this.countFacetValues(result.tissues.filter(Boolean))
    };
  }

  countFacetValues(values) {
    const counts = {};
    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }
}

module.exports = DatasetService;