# API Specification: Prairie Genomics Suite

## Overview

The Prairie Genomics Suite API provides programmatic access to all platform capabilities through a modern GraphQL interface. This specification details the API schema, authentication, rate limits, and integration patterns for developers and bioinformaticians.

## API Architecture

### GraphQL Endpoint
```
Production: https://api.prairie-genomics.com/graphql
Staging: https://staging-api.prairie-genomics.com/graphql
```

### Authentication
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Rate Limits
```yaml
Rate Limits:
  Free Tier: 1,000 requests/hour
  Professional: 10,000 requests/hour  
  Enterprise: Unlimited
  
Burst Limits:
  All Tiers: 100 requests/minute
```

## Core Schema Definitions

### User Management

```graphql
# User Types
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  role: UserRole!
  organization: Organization
  preferences: UserPreferences!
  createdAt: DateTime!
  lastLogin: DateTime
}

enum UserRole {
  RESEARCHER
  BIOINFORMATICIAN
  LAB_MANAGER
  ADMIN
}

type UserPreferences {
  theme: Theme!
  notifications: NotificationSettings!
  analysisDefaults: AnalysisDefaults!
}

# Organization Management
type Organization {
  id: ID!
  name: String!
  type: OrganizationType!
  members: [User!]!
  projects: [Project!]!
  billing: BillingInfo!
  settings: OrganizationSettings!
}

enum OrganizationType {
  ACADEMIC
  BIOTECH
  PHARMACEUTICAL
  CLINICAL
  GOVERNMENT
}
```

### Project & Data Management

```graphql
# Project Structure
type Project {
  id: ID!
  name: String!
  description: String
  owner: User!
  collaborators: [Collaborator!]!
  datasets: [Dataset!]!
  analyses: [Analysis!]!
  sharing: SharingSettings!
  tags: [String!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Collaborator {
  user: User!
  role: CollaborationRole!
  permissions: [Permission!]!
  addedAt: DateTime!
}

enum CollaborationRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

# Dataset Management
type Dataset {
  id: ID!
  project: Project!
  name: String!
  description: String
  type: DatasetType!
  subtype: String
  files: [DataFile!]!
  metadata: DatasetMetadata!
  preprocessing: PreprocessingStatus!
  qcResults: QualityControlResults
  status: DatasetStatus!
  size: Int! # bytes
  sampleCount: Int
  featureCount: Int
  createdAt: DateTime!
}

enum DatasetType {
  RNA_SEQ
  DNA_SEQ
  CHIP_SEQ
  ATAC_SEQ
  SINGLE_CELL_RNA
  PROTEOMICS
  METABOLOMICS
  CLINICAL
  OTHER
}

type DataFile {
  id: ID!
  filename: String!
  path: String!
  size: Int!
  checksum: String!
  format: FileFormat!
  compression: CompressionType
  metadata: FileMetadata!
  uploadedAt: DateTime!
}

enum FileFormat {
  FASTQ
  BAM
  SAM
  VCF
  CSV
  TSV
  HDF5
  EXCEL
  PDF
}
```

### Analysis Engine

```graphql
# Analysis Workflows
type Analysis {
  id: ID!
  name: String!
  description: String
  project: Project!
  dataset: Dataset!
  pipeline: AnalysisPipeline!
  parameters: AnalysisParameters!
  status: AnalysisStatus!
  progress: AnalysisProgress!
  results: AnalysisResults
  logs: [AnalysisLog!]!
  cost: AnalysisCost!
  startedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
}

enum AnalysisStatus {
  DRAFT
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

type AnalysisPipeline {
  id: ID!
  name: String!
  version: String!
  description: String!
  category: AnalysisCategory!
  steps: [PipelineStep!]!
  inputRequirements: InputRequirements!
  outputDescription: OutputDescription!
  computeRequirements: ComputeRequirements!
  estimatedRuntime: Int # seconds
  documentation: String!
}

enum AnalysisCategory {
  QUALITY_CONTROL
  ALIGNMENT
  QUANTIFICATION
  DIFFERENTIAL_EXPRESSION
  PATHWAY_ANALYSIS
  VARIANT_CALLING
  MACHINE_LEARNING
  VISUALIZATION
  CUSTOM
}

type AnalysisResults {
  id: ID!
  analysis: Analysis!
  summary: ResultSummary!
  tables: [ResultTable!]!
  visualizations: [Visualization!]!
  files: [DataFile!]!
  statistics: StatisticalSummary!
  interpretation: AIInterpretation
}

# AI-Powered Recommendations
type AnalysisRecommendation {
  pipeline: AnalysisPipeline!
  confidence: Float! # 0.0 to 1.0
  reasoning: String!
  suggestedParameters: AnalysisParameters!
  expectedRuntime: Int
  estimatedCost: Float
}
```

### Visualization System

```graphql
type Visualization {
  id: ID!
  name: String!
  type: VisualizationType!
  analysis: Analysis
  dataset: Dataset
  config: VisualizationConfig!
  data: VisualizationData!
  interactive: Boolean!
  exportFormats: [ExportFormat!]!
  sharing: SharingSettings!
  createdAt: DateTime!
}

enum VisualizationType {
  SCATTER_PLOT
  LINE_PLOT
  BAR_CHART
  HEATMAP
  VOLCANO_PLOT
  PCA_PLOT
  BOX_PLOT
  VIOLIN_PLOT
  NETWORK_GRAPH
  PATHWAY_DIAGRAM
  GENOME_BROWSER
  THREE_D_PLOT
}

type VisualizationConfig {
  title: String
  xAxis: AxisConfig!
  yAxis: AxisConfig!
  colorScheme: ColorScheme!
  styling: PlotStyling!
  interactivity: InteractivitySettings!
  annotations: [PlotAnnotation!]!
}

# Publication-Ready Export
type PublicationPackage {
  id: ID!
  analysis: Analysis!
  journalStyle: JournalStyle!
  figures: [PublicationFigure!]!
  tables: [PublicationTable!]!
  methods: String!
  results: String!
  references: [Reference!]!
  supplementaryData: [DataFile!]!
  generatedAt: DateTime!
}

enum JournalStyle {
  NATURE
  SCIENCE
  CELL
  PNAS
  PLOS_ONE
  BMC
  CUSTOM
}
```

## Query Operations

### Basic Data Queries

```graphql
# Get user profile and projects
query GetUserProfile {
  me {
    id
    name
    email
    organization {
      name
      type
    }
    projects {
      id
      name
      datasets {
        id
        name
        type
        status
      }
      analyses {
        id
        name
        status
        progress {
          percentage
          currentStep
        }
      }
    }
  }
}

# Get project details
query GetProject($id: ID!) {
  project(id: $id) {
    id
    name
    description
    collaborators {
      user {
        name
        email
      }
      role
      permissions
    }
    datasets {
      id
      name
      type
      status
      qcResults {
        overallScore
        warnings
        recommendations
      }
    }
    analyses {
      id
      name
      pipeline {
        name
        category
      }
      status
      results {
        summary {
          significantFeatures
          totalFeatures
          pValueThreshold
        }
      }
    }
  }
}

# Search datasets
query SearchDatasets($query: String!, $filters: DatasetFilters) {
  searchDatasets(query: $query, filters: $filters) {
    totalCount
    datasets {
      id
      name
      type
      project {
        name
        owner {
          name
        }
      }
      metadata {
        organism
        tissue
        condition
        platform
      }
      createdAt
    }
  }
}
```

### Analysis Queries

```graphql
# Get analysis recommendations
query GetAnalysisRecommendations($datasetId: ID!, $researchQuestion: String) {
  analysisRecommendations(datasetId: $datasetId, researchQuestion: $researchQuestion) {
    pipeline {
      id
      name
      description
      category
    }
    confidence
    reasoning
    suggestedParameters {
      key
      value
      description
    }
    expectedRuntime
    estimatedCost
  }
}

# Get analysis results
query GetAnalysisResults($analysisId: ID!) {
  analysis(id: $analysisId) {
    id
    name
    status
    results {
      summary {
        significantFeatures
        totalFeatures
        foldChangeRange
        pValueRange
      }
      tables {
        id
        name
        type
        rowCount
        columnCount
        preview {
          headers
          rows
        }
      }
      visualizations {
        id
        name
        type
        config {
          title
          xAxis {
            label
            scale
          }
          yAxis {
            label  
            scale
          }
        }
      }
      interpretation {
        keyFindings
        statisticalSummary
        biologicalInsights
        recommendations
      }
    }
  }
}
```

## Mutation Operations

### Project & Dataset Management

```graphql
# Create new project
mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
    name
    description
    owner {
      name
      email
    }
    sharing {
      isPublic
      allowedDomains
    }
  }
}

# Upload dataset
mutation UploadDataset($input: UploadDatasetInput!) {
  uploadDataset(input: $input) {
    id
    name
    type
    uploadUrl
    uploadToken
    expectedFiles {
      name
      type
      required
    }
  }
}

# Update dataset metadata
mutation UpdateDatasetMetadata($id: ID!, $metadata: DatasetMetadataInput!) {
  updateDatasetMetadata(id: $id, metadata: $metadata) {
    id
    metadata {
      organism
      tissue
      condition
      treatmentGroups
      timePoints
      platform
      libraryType
      customFields
    }
  }
}
```

### Analysis Execution

```graphql
# Run analysis
mutation RunAnalysis($input: RunAnalysisInput!) {
  runAnalysis(input: $input) {
    id
    name
    pipeline {
      name
      estimatedRuntime
    }
    status
    queuePosition
    estimatedCost
  }
}

# Cancel analysis  
mutation CancelAnalysis($id: ID!) {
  cancelAnalysis(id: $id) {
    id
    status
    cancelledAt
  }
}

# Clone analysis with modified parameters
mutation CloneAnalysis($id: ID!, $modifications: AnalysisModifications!) {
  cloneAnalysis(id: $id, modifications: $modifications) {
    id
    name
    parameters
    estimatedCost
  }
}
```

### Collaboration & Sharing

```graphql
# Share project
mutation ShareProject($projectId: ID!, $sharing: SharingInput!) {
  shareProject(projectId: $projectId, sharing: $sharing) {
    id
    sharing {
      isPublic
      shareUrl
      collaborators {
        user {
          name
          email
        }
        role
        addedAt
      }
    }
  }
}

# Add collaborator
mutation AddCollaborator($projectId: ID!, $email: String!, $role: CollaborationRole!) {
  addCollaborator(projectId: $projectId, email: $email, role: $role) {
    user {
      id
      name
      email
    }
    role
    permissions
    invitation {
      status
      sentAt
      expiresAt
    }
  }
}
```

## Subscription Operations

### Real-Time Updates

```graphql
# Analysis progress updates
subscription AnalysisProgress($analysisId: ID!) {
  analysisProgress(analysisId: $analysisId) {
    analysisId
    status
    progress {
      percentage
      currentStep
      estimatedTimeRemaining
    }
    logs {
      timestamp
      level
      message
      step
    }
  }
}

# Project collaboration events
subscription ProjectCollaboration($projectId: ID!) {
  projectCollaboration(projectId: $projectId) {
    projectId
    eventType
    user {
      name
      avatar
    }
    timestamp
    details {
      ... on AnalysisStartedEvent {
        analysisId
        analysisName
      }
      ... on DatasetUploadedEvent {
        datasetId
        datasetName
      }
      ... on CommentAddedEvent {
        commentId
        content
        target
      }
    }
  }
}

# System status updates
subscription SystemStatus {
  systemStatus {
    timestamp
    status
    queueLength
    averageWaitTime
    maintenanceWindow {
      scheduled
      startTime
      duration
      description
    }
  }
}
```

## Input Types & Parameters

### Analysis Configuration

```graphql
input RunAnalysisInput {
  name: String!
  description: String
  projectId: ID!
  datasetId: ID!
  pipelineId: ID!
  parameters: AnalysisParametersInput!
  computePreferences: ComputePreferencesInput
  notifications: NotificationPreferencesInput
}

input AnalysisParametersInput {
  # Statistical parameters
  pValueThreshold: Float
  foldChangeThreshold: Float
  multipleTestingCorrection: MultipleTestingMethod
  
  # Filtering parameters  
  minExpression: Float
  minSamples: Int
  varianceFilter: Boolean
  
  # Grouping variables
  treatmentGroups: [String!]!
  covariates: [String!]
  pairedSamples: Boolean
  
  # Visualization preferences
  colorScheme: ColorScheme
  plotDimensions: PlotDimensions
  exportFormats: [ExportFormat!]
  
  # Custom parameters (pipeline-specific)
  customParameters: JSON
}

input ComputePreferencesInput {
  priority: ComputePriority
  maxRuntime: Int # seconds
  maxCost: Float # dollars
  instanceType: String
  spotInstances: Boolean
}

enum ComputePriority {
  LOW
  NORMAL  
  HIGH
  URGENT
}
```

## Error Handling

### GraphQL Error Structure

```graphql
type Error {
  message: String!
  code: ErrorCode!
  path: [String!]
  details: ErrorDetails
  timestamp: DateTime!
}

enum ErrorCode {
  # Authentication errors
  UNAUTHORIZED
  FORBIDDEN
  TOKEN_EXPIRED
  
  # Validation errors
  INVALID_INPUT
  MISSING_REQUIRED_FIELD
  CONSTRAINT_VIOLATION
  
  # Business logic errors  
  INSUFFICIENT_CREDITS
  ANALYSIS_FAILED
  DATASET_NOT_READY
  PIPELINE_NOT_COMPATIBLE
  
  # System errors
  INTERNAL_ERROR
  SERVICE_UNAVAILABLE
  RATE_LIMIT_EXCEEDED
  TIMEOUT
}

type ErrorDetails {
  field: String
  rejectedValue: String
  suggestion: String
  documentation: String
}
```

### Error Examples

```json
{
  "errors": [
    {
      "message": "Dataset is not ready for analysis",
      "code": "DATASET_NOT_READY",
      "path": ["runAnalysis"],
      "details": {
        "field": "datasetId",
        "rejectedValue": "dataset_123",
        "suggestion": "Wait for dataset preprocessing to complete",
        "documentation": "https://docs.prairie-genomics.com/datasets/status"
      },
      "timestamp": "2025-01-22T10:30:00Z"
    }
  ],
  "data": null
}
```

## SDK & Client Libraries

### Python SDK
```python
from prairie_genomics import PrairieClient

# Initialize client
client = PrairieClient(api_key="your_api_key")

# Upload dataset
dataset = client.datasets.upload(
    project_id="proj_123",
    files=["data.csv", "metadata.csv"],
    dataset_type="RNA_SEQ"
)

# Run analysis
analysis = client.analyses.run(
    dataset_id=dataset.id,
    pipeline="differential_expression",
    parameters={
        "treatment_groups": ["control", "treatment"],
        "p_value_threshold": 0.05,
        "fold_change_threshold": 1.5
    }
)

# Wait for completion and get results
results = analysis.wait_for_completion()
results.download_figures(format="pdf", style="nature")
```

### R SDK
```r
library(PrairieGenomics)

# Initialize client
client <- prairie_client(api_key = "your_api_key")

# Upload dataset
dataset <- upload_dataset(
  client = client,
  project_id = "proj_123", 
  files = c("data.csv", "metadata.csv"),
  type = "RNA_SEQ"
)

# Run differential expression analysis
analysis <- run_analysis(
  client = client,
  dataset_id = dataset$id,
  pipeline = "differential_expression",
  treatment_groups = c("control", "treatment")
)

# Get results as data frame
results <- get_analysis_results(client, analysis$id)
deg_table <- results$tables$differential_expression
```

### JavaScript/TypeScript SDK
```typescript
import { PrairieClient } from '@prairie-genomics/sdk';

// Initialize client
const client = new PrairieClient({
  apiKey: process.env.PRAIRIE_API_KEY,
  endpoint: 'https://api.prairie-genomics.com/graphql'
});

// Upload and analyze
const dataset = await client.datasets.upload({
  projectId: 'proj_123',
  files: ['data.csv'],
  type: 'RNA_SEQ'
});

const analysis = await client.analyses.run({
  datasetId: dataset.id,
  pipeline: 'differential_expression',
  parameters: {
    treatmentGroups: ['control', 'treatment'],
    pValueThreshold: 0.05
  }
});

// Subscribe to progress updates
analysis.onProgress((progress) => {
  console.log(`Analysis ${progress.percentage}% complete`);
});

const results = await analysis.waitForCompletion();
```

## Webhooks

### Event Notifications

```yaml
# Webhook Configuration
webhook_endpoints:
  url: "https://your-app.com/webhooks/prairie"
  events:
    - "analysis.completed"
    - "analysis.failed"
    - "dataset.uploaded"
    - "collaboration.invited"
  
# Webhook Payload Example
{
  "event": "analysis.completed",
  "timestamp": "2025-01-22T10:30:00Z",
  "data": {
    "analysis_id": "analysis_123",
    "project_id": "proj_456", 
    "status": "COMPLETED",
    "runtime": 1800,
    "cost": 2.50,
    "results_summary": {
      "significant_genes": 142,
      "total_genes": 15000
    }
  },
  "signature": "sha256=abcdef123456..."
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: Monthly during active development  
**Owner**: Engineering Team  
**Stakeholders**: Product, Developer Relations, Partners