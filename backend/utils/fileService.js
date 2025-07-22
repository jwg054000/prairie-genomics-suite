const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

class FileService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024; // 5GB default
    this.ensureUploadDirectory();
  }

  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch (error) {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  // Configure multer for file uploads
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        // Accept common genomics file formats
        const allowedTypes = [
          'text/csv',
          'text/tab-separated-values',
          'text/plain',
          'application/gzip',
          'application/octet-stream',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        const allowedExtensions = [
          '.csv', '.tsv', '.txt', '.fastq', '.fq', '.fastq.gz', '.fq.gz',
          '.bam', '.sam', '.vcf', '.vcf.gz', '.h5', '.hdf5', '.xlsx', '.xls'
        ];

        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not supported: ${file.originalname}`));
        }
      }
    });
  }

  async uploadFile(fileData, destinationPath) {
    const fullPath = path.join(this.uploadPath, destinationPath);
    const directory = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file data
    await fs.writeFile(fullPath, fileData.buffer || fileData);
    
    // Get file stats
    const stats = await fs.stat(fullPath);
    
    return {
      path: fullPath,
      size: stats.size,
      relativePath: destinationPath
    };
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return false; // File didn't exist
    }
  }

  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      throw error;
    }
  }

  async readFile(filePath, options = {}) {
    const { encoding = 'utf8', maxSize = 100 * 1024 * 1024 } = options; // 100MB default max
    
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      throw new Error(`File too large to read: ${stats.size} bytes (max: ${maxSize})`);
    }
    
    return await fs.readFile(filePath, encoding);
  }

  async copyFile(sourcePath, destinationPath) {
    const fullDestPath = path.join(this.uploadPath, destinationPath);
    const directory = path.dirname(fullDestPath);
    
    await fs.mkdir(directory, { recursive: true });
    await fs.copyFile(sourcePath, fullDestPath);
    
    const stats = await fs.stat(fullDestPath);
    
    return {
      path: fullDestPath,
      size: stats.size,
      relativePath: destinationPath
    };
  }

  async moveFile(sourcePath, destinationPath) {
    const result = await this.copyFile(sourcePath, destinationPath);
    await this.deleteFile(sourcePath);
    return result;
  }

  generateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = require('fs').createReadStream(filePath);
      
      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  async analyzeFile(filePath) {
    const stats = await fs.stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const checksum = await this.generateChecksum(filePath);
    
    const analysis = {
      filename: path.basename(filePath),
      extension,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      checksum,
      format: this.detectFormat(extension),
      compression: this.detectCompression(extension)
    };

    // Additional analysis for text files
    if (['.csv', '.tsv', '.txt'].includes(extension)) {
      try {
        const sampleData = await this.readFile(filePath, { maxSize: 1024 * 1024 }); // Read first 1MB
        analysis.textAnalysis = this.analyzeTextFile(sampleData, extension);
      } catch (error) {
        analysis.textAnalysisError = error.message;
      }
    }

    return analysis;
  }

  detectFormat(extension) {
    const formatMap = {
      '.csv': 'CSV',
      '.tsv': 'TSV',
      '.txt': 'TEXT',
      '.fastq': 'FASTQ',
      '.fq': 'FASTQ',
      '.bam': 'BAM',
      '.sam': 'SAM',
      '.vcf': 'VCF',
      '.h5': 'HDF5',
      '.hdf5': 'HDF5',
      '.xlsx': 'EXCEL',
      '.xls': 'EXCEL'
    };

    return formatMap[extension] || 'UNKNOWN';
  }

  detectCompression(filename) {
    if (filename.endsWith('.gz')) return 'GZIP';
    if (filename.endsWith('.bz2')) return 'BZIP2';
    if (filename.endsWith('.xz')) return 'XZ';
    return 'NONE';
  }

  analyzeTextFile(content, extension) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (nonEmptyLines.length === 0) {
      return { error: 'File appears to be empty' };
    }

    const firstLine = nonEmptyLines[0];
    let delimiter = ',';
    
    if (extension === '.tsv' || firstLine.includes('\t')) {
      delimiter = '\t';
    }

    const headers = firstLine.split(delimiter);
    const sampleRow = nonEmptyLines.length > 1 ? nonEmptyLines[1].split(delimiter) : [];

    return {
      totalLines: lines.length,
      nonEmptyLines: nonEmptyLines.length,
      delimiter,
      headers: headers.map(h => h.trim()),
      columnCount: headers.length,
      sampleRowColumnCount: sampleRow.length,
      hasHeaders: this.looksLikeHeaders(headers),
      encoding: 'UTF-8' // Simplified - would use actual encoding detection in production
    };
  }

  looksLikeHeaders(headers) {
    // Simple heuristic: if most columns contain text (not numbers), likely headers
    const textCount = headers.filter(header => {
      const trimmed = header.trim().replace(/['"]/g, '');
      return isNaN(parseFloat(trimmed)) || trimmed.length > 10;
    }).length;

    return textCount > headers.length / 2;
  }

  async cleanupOldFiles(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const cutoffDate = new Date(Date.now() - maxAge);
    const deletedFiles = [];
    
    async function cleanDirectory(dirPath) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await cleanDirectory(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            if (stats.mtime < cutoffDate) {
              await fs.unlink(fullPath);
              deletedFiles.push(fullPath);
            }
          }
        }
        
        // Remove empty directories
        const remainingEntries = await fs.readdir(dirPath);
        if (remainingEntries.length === 0 && dirPath !== this.uploadPath) {
          await fs.rmdir(dirPath);
        }
      } catch (error) {
        // Directory might not exist or might not be accessible
        console.warn(`Cleanup warning for ${dirPath}:`, error.message);
      }
    }

    await cleanDirectory(this.uploadPath);
    return deletedFiles;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStorageStats() {
    // This would be implemented to get storage usage statistics
    // For now, return a placeholder
    return {
      totalFiles: 0,
      totalSize: 0,
      availableSpace: '1TB', // Placeholder
      oldestFile: null,
      newestFile: null
    };
  }
}

module.exports = FileService;