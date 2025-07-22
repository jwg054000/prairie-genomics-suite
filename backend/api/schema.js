const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON
  scalar Upload

  # User Management
  enum UserRole {
    RESEARCHER
    BIOINFORMATICIAN
    LAB_MANAGER
    ADMIN
  }

  type User {
    id: ID!
    email: String!
    name: String!
    avatar: String
    role: UserRole!
    organization: Organization
    preferences: UserPreferences!
    projects: [Project!]!
    createdAt: DateTime!
    lastLogin: DateTime
  }

  type UserPreferences {
    theme: Theme!
    notifications: NotificationSettings!
    analysisDefaults: AnalysisDefaults!
  }

  enum Theme {
    LIGHT
    DARK
    AUTO
  }

  type NotificationSettings {
    email: Boolean!
    browser: Boolean!
    analysisComplete: Boolean!
    collaborationUpdates: Boolean!
  }

  type AnalysisDefaults {
    pValueThreshold: Float!
    foldChangeThreshold: Float!
    multipleTestingCorrection: MultipleTestingMethod!
  }

  enum MultipleTestingMethod {
    BONFERRONI
    FDR_BH
    FDR_BY
    HOLM
  }

  # Organization Management
  enum OrganizationType {
    ACADEMIC
    BIOTECH
    PHARMACEUTICAL
    CLINICAL
    GOVERNMENT
  }

  type Organization {
    id: ID!
    name: String!
    type: OrganizationType!
    members: [User!]!
    projects: [Project!]!
    billing: BillingInfo!
    settings: OrganizationSettings!
  }

  type BillingInfo {
    plan: BillingPlan!
    usage: UsageStats!
    nextBillingDate: DateTime
    paymentMethod: PaymentMethod
  }

  enum BillingPlan {
    FREE
    PROFESSIONAL
    ENTERPRISE
  }

  type UsageStats {
    storageUsed: Int! # bytes
    computeHours: Float!
    analysesRun: Int!
    monthlyUsage: JSON!
  }

  type PaymentMethod {
    type: String!
    last4: String
    expiryMonth: Int
    expiryYear: Int
  }

  type OrganizationSettings {
    allowPublicProjects: Boolean!
    defaultProjectPermissions: JSON!
    ssoEnabled: Boolean!
    dataRetentionPolicy: Int! # days
  }

  # Project Management
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

  enum Permission {
    READ_DATA
    WRITE_DATA
    RUN_ANALYSIS
    MANAGE_SHARING
    DELETE_PROJECT
  }

  type SharingSettings {
    isPublic: Boolean!
    shareUrl: String
    allowedDomains: [String!]!
    expiresAt: DateTime
  }

  # Dataset Management
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

  enum DatasetStatus {
    UPLOADING
    PROCESSING
    READY
    ERROR
  }

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

  enum CompressionType {
    NONE
    GZIP
    BZIP2
    XZ
  }

  type FileMetadata {
    headers: [String!]
    rowCount: Int
    columnCount: Int
    encoding: String
    delimiter: String
  }

  type DatasetMetadata {
    organism: String
    tissue: String
    condition: [String!]
    treatmentGroups: [String!]
    timePoints: [String!]
    platform: String
    libraryType: String
    customFields: JSON
  }

  type PreprocessingStatus {
    status: ProcessingStatus!
    steps: [ProcessingStep!]!
    currentStep: String
    progress: Float # 0.0 to 1.0
    logs: [ProcessingLog!]!
  }

  enum ProcessingStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
  }

  type ProcessingStep {
    name: String!
    status: ProcessingStatus!
    startedAt: DateTime
    completedAt: DateTime
    output: JSON
  }

  type ProcessingLog {
    timestamp: DateTime!
    level: LogLevel!
    message: String!
    step: String
  }

  enum LogLevel {
    DEBUG
    INFO
    WARNING
    ERROR
  }

  type QualityControlResults {
    overallScore: Float! # 0.0 to 1.0
    warnings: [String!]!
    recommendations: [String!]!
    metrics: JSON!
    plots: [QCPlot!]!
  }

  type QCPlot {
    type: String!
    title: String!
    data: JSON!
    config: JSON!
  }

  # Analysis Engine
  enum AnalysisStatus {
    DRAFT
    QUEUED
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
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
    queuePosition: Int
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
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
    isPublic: Boolean!
    author: User
  }

  type PipelineStep {
    id: String!
    name: String!
    description: String!
    tool: String!
    version: String!
    parameters: JSON!
    dependencies: [String!]!
  }

  type InputRequirements {
    dataTypes: [DatasetType!]!
    fileFormats: [FileFormat!]!
    minSamples: Int!
    maxSamples: Int
    requiredMetadata: [String!]!
  }

  type OutputDescription {
    files: [OutputFile!]!
    visualizations: [OutputVisualization!]!
    statistics: [OutputStatistic!]!
  }

  type OutputFile {
    name: String!
    type: String!
    description: String!
    format: FileFormat!
  }

  type OutputVisualization {
    name: String!
    type: VisualizationType!
    description: String!
  }

  type OutputStatistic {
    name: String!
    type: String!
    description: String!
  }

  type ComputeRequirements {
    minCpu: Int!
    maxCpu: Int!
    minMemory: Int! # MB
    maxMemory: Int! # MB
    gpu: Boolean!
    storage: Int! # GB
    estimatedCost: Float # USD per run
  }

  type AnalysisParameters {
    statistical: StatisticalParameters
    filtering: FilteringParameters
    visualization: VisualizationParameters
    custom: JSON
  }

  type StatisticalParameters {
    pValueThreshold: Float
    foldChangeThreshold: Float
    multipleTestingCorrection: MultipleTestingMethod
    confidenceLevel: Float
  }

  type FilteringParameters {
    minExpression: Float
    minSamples: Int
    varianceFilter: Boolean
    removeOutliers: Boolean
  }

  type VisualizationParameters {
    colorScheme: ColorScheme
    plotDimensions: PlotDimensions
    theme: Theme
    exportFormats: [ExportFormat!]
  }

  enum ColorScheme {
    DEFAULT
    COLORBLIND_SAFE
    GRAYSCALE
    VIBRANT
    PASTEL
  }

  type PlotDimensions {
    width: Int!
    height: Int!
    dpi: Int!
  }

  enum ExportFormat {
    PDF
    PNG
    SVG
    EPS
    TIFF
  }

  type AnalysisProgress {
    percentage: Float! # 0.0 to 100.0
    currentStep: String!
    estimatedTimeRemaining: Int # seconds
    stepProgress: [StepProgress!]!
  }

  type StepProgress {
    stepName: String!
    status: ProcessingStatus!
    progress: Float!
    startedAt: DateTime
    estimatedCompletion: DateTime
  }

  type AnalysisLog {
    id: ID!
    timestamp: DateTime!
    level: LogLevel!
    message: String!
    step: String
    details: JSON
  }

  type AnalysisCost {
    estimated: Float! # USD
    actual: Float # USD (when completed)
    breakdown: CostBreakdown!
  }

  type CostBreakdown {
    compute: Float!
    storage: Float!
    dataTransfer: Float!
    additionalServices: Float!
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

  type ResultSummary {
    significantFeatures: Int
    totalFeatures: Int
    pValueRange: [Float!]
    foldChangeRange: [Float!]
    keyFindings: [String!]!
  }

  type ResultTable {
    id: ID!
    name: String!
    type: String!
    description: String
    data: JSON!
    rowCount: Int!
    columnCount: Int!
    preview: TablePreview!
  }

  type TablePreview {
    headers: [String!]!
    rows: [[String!]!]!
    hasMore: Boolean!
  }

  type StatisticalSummary {
    tests: [StatisticalTest!]!
    corrections: [MultipleTestingCorrection!]!
    effectSizes: [EffectSize!]!
    confidenceIntervals: JSON
  }

  type StatisticalTest {
    name: String!
    statistic: Float!
    pValue: Float!
    degreesOfFreedom: Int
    assumptions: [String!]!
  }

  type MultipleTestingCorrection {
    method: MultipleTestingMethod!
    originalPValues: Int!
    significantAfterCorrection: Int!
    threshold: Float!
  }

  type EffectSize {
    measure: String!
    value: Float!
    confidenceInterval: [Float!]
    interpretation: String!
  }

  type AIInterpretation {
    keyFindings: [String!]!
    statisticalSummary: String!
    biologicalInsights: [String!]!
    recommendations: [String!]!
    confidence: Float! # 0.0 to 1.0
    sources: [String!]!
  }

  # Visualization System
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

  type Visualization {
    id: ID!
    name: String!
    description: String
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

  type VisualizationConfig {
    title: String
    subtitle: String
    xAxis: AxisConfig!
    yAxis: AxisConfig!
    zAxis: AxisConfig
    colorScheme: ColorScheme!
    styling: PlotStyling!
    interactivity: InteractivitySettings!
    annotations: [PlotAnnotation!]!
  }

  type AxisConfig {
    label: String!
    scale: AxisScale!
    range: [Float!]
    tickFormat: String
    showGrid: Boolean!
  }

  enum AxisScale {
    LINEAR
    LOG
    SQRT
    CATEGORICAL
  }

  type PlotStyling {
    backgroundColor: String!
    gridColor: String!
    textColor: String!
    fontSize: Int!
    fontFamily: String!
    lineWidth: Float!
    markerSize: Float!
  }

  type InteractivitySettings {
    zoom: Boolean!
    pan: Boolean!
    hover: Boolean!
    select: Boolean!
    brush: Boolean!
  }

  type PlotAnnotation {
    type: AnnotationType!
    position: [Float!]!
    text: String
    style: JSON
  }

  enum AnnotationType {
    TEXT
    ARROW
    LINE
    RECTANGLE
    CIRCLE
  }

  type VisualizationData {
    format: String! # JSON, CSV, etc.
    data: JSON!
    metadata: JSON
  }

  # AI Recommendations
  type AnalysisRecommendation {
    pipeline: AnalysisPipeline!
    confidence: Float! # 0.0 to 1.0
    reasoning: String!
    suggestedParameters: AnalysisParameters!
    expectedRuntime: Int # seconds
    estimatedCost: Float # USD
    prerequisites: [String!]!
    alternativeApproaches: [String!]!
  }

  # Publication System
  enum JournalStyle {
    NATURE
    SCIENCE
    CELL
    PNAS
    PLOS_ONE
    BMC
    CUSTOM
  }

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

  type PublicationFigure {
    id: ID!
    name: String!
    caption: String!
    visualization: Visualization!
    panelLayout: PanelLayout
    exportUrl: String!
  }

  type PanelLayout {
    panels: [Panel!]!
    arrangement: String! # 'grid', 'horizontal', 'vertical'
    spacing: Float!
  }

  type Panel {
    id: String!
    visualization: Visualization!
    position: PanelPosition!
    label: String # e.g., 'A', 'B', 'C'
  }

  type PanelPosition {
    row: Int!
    column: Int!
    width: Int!
    height: Int!
  }

  type PublicationTable {
    id: ID!
    name: String!
    caption: String!
    table: ResultTable!
    formatting: TableFormatting!
  }

  type TableFormatting {
    style: String!
    significantDigits: Int!
    scientificNotation: Boolean!
    highlightSignificant: Boolean!
  }

  type Reference {
    id: ID!
    type: ReferenceType!
    title: String!
    authors: [String!]!
    journal: String
    year: Int!
    doi: String
    url: String
  }

  enum ReferenceType {
    JOURNAL_ARTICLE
    BOOK
    PREPRINT
    SOFTWARE
    DATABASE
    WEBSITE
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(search: String, role: UserRole, limit: Int, offset: Int): [User!]!

    # Project queries  
    project(id: ID!): Project
    projects(search: String, limit: Int, offset: Int): [Project!]!
    myProjects: [Project!]!
    sharedProjects: [Project!]!

    # Dataset queries
    dataset(id: ID!): Dataset
    datasets(projectId: ID, type: DatasetType, limit: Int, offset: Int): [Dataset!]!
    searchDatasets(query: String!, filters: DatasetFilters): DatasetSearchResult!

    # Analysis queries
    analysis(id: ID!): Analysis
    analyses(projectId: ID, status: AnalysisStatus, limit: Int, offset: Int): [Analysis!]!
    analysisRecommendations(datasetId: ID!, researchQuestion: String): [AnalysisRecommendation!]!
    
    # Pipeline queries
    pipeline(id: ID!): AnalysisPipeline
    pipelines(category: AnalysisCategory, search: String): [AnalysisPipeline!]!
    popularPipelines(limit: Int): [AnalysisPipeline!]!

    # Visualization queries
    visualization(id: ID!): Visualization
    visualizations(analysisId: ID, type: VisualizationType): [Visualization!]!

    # System queries
    systemStatus: SystemStatus!
    usage: UsageStats!
    billing: BillingInfo
  }

  input DatasetFilters {
    types: [DatasetType!]
    organisms: [String!]
    tissues: [String!]
    dateRange: DateRangeInput
  }

  type DateRange {
    start: DateTime!
    end: DateTime!
  }

  input DateRangeInput {
    start: DateTime!
    end: DateTime!
  }

  type DatasetSearchResult {
    totalCount: Int!
    datasets: [Dataset!]!
    facets: SearchFacets!
  }

  type SearchFacets {
    types: [FacetValue!]!
    organisms: [FacetValue!]!
    tissues: [FacetValue!]!
  }

  type FacetValue {
    value: String!
    count: Int!
  }

  type SystemStatus {
    status: String!
    version: String!
    queueLength: Int!
    averageWaitTime: Int # seconds
    uptime: Int # seconds
    maintenanceWindow: MaintenanceWindow
  }

  type MaintenanceWindow {
    scheduled: Boolean!
    startTime: DateTime
    duration: Int # minutes
    description: String
  }

  # Mutations
  type Mutation {
    # User management
    updateProfile(input: UpdateProfileInput!): User!
    updatePreferences(input: UpdatePreferencesInput!): UserPreferences!

    # Project management
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    shareProject(projectId: ID!, sharing: SharingInput!): Project!
    addCollaborator(projectId: ID!, email: String!, role: CollaborationRole!): Collaborator!
    updateCollaborator(projectId: ID!, userId: ID!, role: CollaborationRole!, permissions: [Permission!]!): Collaborator!
    removeCollaborator(projectId: ID!, userId: ID!): Boolean!

    # Dataset management
    createDataset(input: CreateDatasetInput!): Dataset!
    updateDataset(id: ID!, input: UpdateDatasetInput!): Dataset!
    deleteDataset(id: ID!): Boolean!
    uploadFiles(datasetId: ID!, files: [Upload!]!): [DataFile!]!
    updateDatasetMetadata(id: ID!, metadata: DatasetMetadataInput!): Dataset!
    startPreprocessing(datasetId: ID!, options: PreprocessingOptions): Dataset!

    # Analysis management
    runAnalysis(input: RunAnalysisInput!): Analysis!
    cancelAnalysis(id: ID!): Analysis!
    cloneAnalysis(id: ID!, modifications: AnalysisModifications!): Analysis!
    deleteAnalysis(id: ID!): Boolean!
    
    # Visualization management
    createVisualization(input: CreateVisualizationInput!): Visualization!
    updateVisualization(id: ID!, input: UpdateVisualizationInput!): Visualization!
    deleteVisualization(id: ID!): Boolean!
    exportVisualization(id: ID!, format: ExportFormat!, style: JournalStyle): String! # Returns URL

    # Publication tools
    generatePublication(analysisId: ID!, style: JournalStyle!): PublicationPackage!
    exportResults(analysisId: ID!, format: String!): String! # Returns URL

    # Pipeline management
    createPipeline(input: CreatePipelineInput!): AnalysisPipeline!
    updatePipeline(id: ID!, input: UpdatePipelineInput!): AnalysisPipeline!
    publishPipeline(id: ID!): AnalysisPipeline!
  }

  # Input Types
  input UpdateProfileInput {
    name: String
    avatar: String
  }

  input UpdatePreferencesInput {
    theme: Theme
    notifications: NotificationSettingsInput
    analysisDefaults: AnalysisDefaultsInput
  }

  input NotificationSettingsInput {
    email: Boolean
    browser: Boolean
    analysisComplete: Boolean
    collaborationUpdates: Boolean
  }

  input AnalysisDefaultsInput {
    pValueThreshold: Float
    foldChangeThreshold: Float
    multipleTestingCorrection: MultipleTestingMethod
  }

  input CreateProjectInput {
    name: String!
    description: String
    tags: [String!]
    isPublic: Boolean
  }

  input UpdateProjectInput {
    name: String
    description: String
    tags: [String!]
  }

  input SharingInput {
    isPublic: Boolean!
    allowedDomains: [String!]
    expiresAt: DateTime
  }

  input CreateDatasetInput {
    projectId: ID!
    name: String!
    description: String
    type: DatasetType!
    subtype: String
    metadata: DatasetMetadataInput
  }

  input UpdateDatasetInput {
    name: String
    description: String
    metadata: DatasetMetadataInput
  }

  input DatasetMetadataInput {
    organism: String
    tissue: String
    condition: [String!]
    treatmentGroups: [String!]
    timePoints: [String!]
    platform: String
    libraryType: String
    customFields: JSON
  }

  input PreprocessingOptions {
    qualityControl: Boolean
    normalization: String
    filtering: FilteringOptionsInput
  }

  input FilteringOptionsInput {
    minExpression: Float
    minSamples: Int
    varianceThreshold: Float
  }

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
    statistical: StatisticalParametersInput
    filtering: FilteringParametersInput
    visualization: VisualizationParametersInput
    custom: JSON
  }

  input StatisticalParametersInput {
    pValueThreshold: Float
    foldChangeThreshold: Float
    multipleTestingCorrection: MultipleTestingMethod
    confidenceLevel: Float
  }

  input FilteringParametersInput {
    minExpression: Float
    minSamples: Int
    varianceFilter: Boolean
    removeOutliers: Boolean
  }

  input VisualizationParametersInput {
    colorScheme: ColorScheme
    plotDimensions: PlotDimensionsInput
    theme: Theme
    exportFormats: [ExportFormat!]
  }

  input PlotDimensionsInput {
    width: Int!
    height: Int!
    dpi: Int!
  }

  input ComputePreferencesInput {
    priority: ComputePriority
    maxRuntime: Int
    maxCost: Float
    instanceType: String
    spotInstances: Boolean
  }

  enum ComputePriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  input NotificationPreferencesInput {
    email: Boolean
    browser: Boolean
    slack: Boolean
  }

  input AnalysisModifications {
    name: String
    parameters: AnalysisParametersInput
    computePreferences: ComputePreferencesInput
  }

  input CreateVisualizationInput {
    name: String!
    description: String
    type: VisualizationType!
    analysisId: ID
    datasetId: ID
    config: VisualizationConfigInput!
    data: JSON!
  }

  input UpdateVisualizationInput {
    name: String
    description: String
    config: VisualizationConfigInput
  }

  input VisualizationConfigInput {
    title: String
    subtitle: String
    xAxis: AxisConfigInput!
    yAxis: AxisConfigInput!
    zAxis: AxisConfigInput
    colorScheme: ColorScheme!
    styling: PlotStylingInput
    interactivity: InteractivitySettingsInput
    annotations: [PlotAnnotationInput!]
  }

  input AxisConfigInput {
    label: String!
    scale: AxisScale!
    range: [Float!]
    tickFormat: String
    showGrid: Boolean!
  }

  input PlotStylingInput {
    backgroundColor: String
    gridColor: String
    textColor: String
    fontSize: Int
    fontFamily: String
    lineWidth: Float
    markerSize: Float
  }

  input InteractivitySettingsInput {
    zoom: Boolean
    pan: Boolean
    hover: Boolean
    select: Boolean
    brush: Boolean
  }

  input PlotAnnotationInput {
    type: AnnotationType!
    position: [Float!]!
    text: String
    style: JSON
  }

  input CreatePipelineInput {
    name: String!
    description: String!
    category: AnalysisCategory!
    steps: [PipelineStepInput!]!
    inputRequirements: InputRequirementsInput!
    outputDescription: OutputDescriptionInput!
    documentation: String!
    isPublic: Boolean
  }

  input UpdatePipelineInput {
    name: String
    description: String
    steps: [PipelineStepInput!]
    documentation: String
    isPublic: Boolean
  }

  input PipelineStepInput {
    id: String!
    name: String!
    description: String!
    tool: String!
    version: String!
    parameters: JSON!
    dependencies: [String!]!
  }

  input InputRequirementsInput {
    dataTypes: [DatasetType!]!
    fileFormats: [FileFormat!]!
    minSamples: Int!
    maxSamples: Int
    requiredMetadata: [String!]!
  }

  input OutputDescriptionInput {
    files: [OutputFileInput!]!
    visualizations: [OutputVisualizationInput!]!
    statistics: [OutputStatisticInput!]!
  }

  input OutputFileInput {
    name: String!
    type: String!
    description: String!
    format: FileFormat!
  }

  input OutputVisualizationInput {
    name: String!
    type: VisualizationType!
    description: String!
  }

  input OutputStatisticInput {
    name: String!
    type: String!
    description: String!
  }

  # Subscriptions
  type Subscription {
    # Analysis progress
    analysisProgress(analysisId: ID!): AnalysisProgressUpdate!
    analysisCompleted(userId: ID!): Analysis!
    
    # Project collaboration
    projectUpdated(projectId: ID!): ProjectUpdate!
    collaborationEvent(projectId: ID!): CollaborationEvent!
    
    # System notifications
    systemNotification(userId: ID!): SystemNotification!
    maintenanceAlert: MaintenanceAlert!
  }

  type AnalysisProgressUpdate {
    analysisId: ID!
    status: AnalysisStatus!
    progress: AnalysisProgress!
    logs: [AnalysisLog!]!
  }

  type ProjectUpdate {
    projectId: ID!
    type: ProjectUpdateType!
    data: JSON!
    user: User!
    timestamp: DateTime!
  }

  enum ProjectUpdateType {
    DATASET_ADDED
    ANALYSIS_STARTED
    ANALYSIS_COMPLETED
    COLLABORATOR_ADDED
    SETTINGS_CHANGED
  }

  type CollaborationEvent {
    projectId: ID!
    eventType: CollaborationEventType!
    user: User!
    timestamp: DateTime!
    details: JSON!
  }

  enum CollaborationEventType {
    USER_JOINED
    USER_LEFT
    COMMENT_ADDED
    FILE_SHARED
    ANALYSIS_SHARED
  }

  type SystemNotification {
    id: ID!
    type: NotificationType!
    title: String!
    message: String!
    data: JSON
    read: Boolean!
    createdAt: DateTime!
  }

  enum NotificationType {
    ANALYSIS_COMPLETE
    ANALYSIS_FAILED
    STORAGE_LIMIT
    BILLING_ISSUE
    MAINTENANCE_SCHEDULED
    FEATURE_ANNOUNCEMENT
  }

  type MaintenanceAlert {
    scheduled: Boolean!
    startTime: DateTime!
    duration: Int! # minutes
    affectedServices: [String!]!
    description: String!
  }
`;

module.exports = typeDefs;