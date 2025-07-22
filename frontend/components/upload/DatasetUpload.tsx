import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  detectedFormat?: string;
  validationErrors?: string[];
}

interface DatasetUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  projectId: string;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFormats?: string[];
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({
  onUpload,
  projectId,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024 * 1024, // 5GB
  acceptedFormats = ['.csv', '.tsv', '.fastq', '.fastq.gz', '.bam', '.vcf']
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
      detectedFormat: detectFileFormat(file.name),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: maxFileSize,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/gzip': ['.gz'],
      'application/octet-stream': ['.fastq', '.bam', '.vcf']
    }
  });

  const detectFileFormat = (filename: string): string => {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.csv')) return 'CSV';
    if (ext.endsWith('.tsv') || ext.endsWith('.txt')) return 'TSV';
    if (ext.endsWith('.fastq') || ext.endsWith('.fq')) return 'FASTQ';
    if (ext.endsWith('.fastq.gz') || ext.endsWith('.fq.gz')) return 'FASTQ (compressed)';
    if (ext.endsWith('.bam')) return 'BAM';
    if (ext.endsWith('.vcf')) return 'VCF';
    return 'Unknown';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const filesToUpload = uploadedFiles
        .filter(f => f.status === 'pending')
        .map(f => f.file);
      
      await onUpload(filesToUpload);
      
      // Update file statuses
      setUploadedFiles(prev => 
        prev.map(f => 
          f.status === 'pending' 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        )
      );
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadedFiles(prev => 
        prev.map(f => 
          f.status === 'pending' 
            ? { ...f, status: 'error' }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse your computer
            </p>
          </div>
          
          <div className="text-xs text-gray-400">
            <p>Supported formats: {acceptedFormats.join(', ')}</p>
            <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          
          <div className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {uploadedFile.status === 'completed' && (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {uploadedFile.status === 'error' && (
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    {uploadedFile.status === 'pending' && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {uploadedFile.detectedFormat}
                      </span>
                    </div>
                    
                    {uploadedFile.validationErrors && uploadedFile.validationErrors.length > 0 && (
                      <div className="mt-2">
                        {uploadedFile.validationErrors.map((error, index) => (
                          <p key={index} className="text-xs text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    disabled={isUploading}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                {uploadedFiles.filter(f => f.status === 'pending').length} files ready to upload
              </p>
            </div>
            
            <div className="space-x-3">
              <Button
                variant="outline"
                onClick={() => setUploadedFiles([])}
                disabled={isUploading}
              >
                Clear All
              </Button>
              
              <Button
                onClick={handleUpload}
                loading={isUploading}
                disabled={uploadedFiles.filter(f => f.status === 'pending').length === 0}
              >
                Upload Files
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};