import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { 
  GET_ANALYSIS, 
  RUN_ANALYSIS, 
  CANCEL_ANALYSIS,
  ANALYSIS_PROGRESS_SUBSCRIPTION 
} from '../graphql/queries';

export interface AnalysisParams {
  datasetId: string;
  pipelineId: string;
  parameters: Record<string, any>;
  name?: string;
  description?: string;
}

export interface AnalysisProgress {
  percentage: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

export interface AnalysisResult {
  id: string;
  name: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: AnalysisProgress;
  results?: {
    summary: Record<string, any>;
    tables: Array<{
      id: string;
      name: string;
      type: string;
      data: any[];
    }>;
    visualizations: Array<{
      id: string;
      name: string;
      type: string;
      config: any;
      data: any;
    }>;
  };
  cost?: number;
  startedAt?: string;
  completedAt?: string;
}

export const useAnalysis = (analysisId?: string) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch analysis data
  const { data: analysisData, loading: analysisLoading, refetch } = useQuery(
    GET_ANALYSIS,
    {
      variables: { id: analysisId },
      skip: !analysisId,
      onError: (error) => setError(error.message)
    }
  );

  // Subscribe to real-time updates
  useSubscription(ANALYSIS_PROGRESS_SUBSCRIPTION, {
    variables: { analysisId },
    skip: !analysisId || analysis?.status === 'COMPLETED' || analysis?.status === 'FAILED',
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data) {
        setAnalysis(prev => ({
          ...prev!,
          progress: subscriptionData.data.analysisProgress.progress,
          status: subscriptionData.data.analysisProgress.status
        }));
      }
    }
  });

  // Run analysis mutation
  const [runAnalysisMutation, { loading: runLoading }] = useMutation(RUN_ANALYSIS, {
    onError: (error) => setError(error.message)
  });

  // Cancel analysis mutation
  const [cancelAnalysisMutation, { loading: cancelLoading }] = useMutation(CANCEL_ANALYSIS, {
    onError: (error) => setError(error.message)
  });

  const runAnalysis = useCallback(async (params: AnalysisParams): Promise<string> => {
    try {
      setError(null);
      const result = await runAnalysisMutation({
        variables: {
          input: {
            name: params.name || 'New Analysis',
            description: params.description,
            datasetId: params.datasetId,
            pipelineId: params.pipelineId,
            parameters: params.parameters
          }
        }
      });

      const newAnalysis = result.data.runAnalysis;
      setAnalysis(newAnalysis);
      return newAnalysis.id;
    } catch (error) {
      throw new Error(`Failed to start analysis: ${error}`);
    }
  }, [runAnalysisMutation]);

  const cancelAnalysis = useCallback(async (): Promise<void> => {
    if (!analysisId) return;

    try {
      await cancelAnalysisMutation({
        variables: { id: analysisId }
      });
      
      setAnalysis(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
    } catch (error) {
      throw new Error(`Failed to cancel analysis: ${error}`);
    }
  }, [analysisId, cancelAnalysisMutation]);

  const refreshAnalysis = useCallback(async () => {
    if (analysisId) {
      await refetch();
    }
  }, [analysisId, refetch]);

  // Update local state when query data changes
  useEffect(() => {
    if (analysisData?.analysis) {
      setAnalysis(analysisData.analysis);
    }
  }, [analysisData]);

  // Helper functions
  const isRunning = analysis?.status === 'RUNNING' || analysis?.status === 'QUEUED';
  const isCompleted = analysis?.status === 'COMPLETED';
  const isFailed = analysis?.status === 'FAILED';
  const isCancelled = analysis?.status === 'CANCELLED';

  const getProgressPercentage = (): number => {
    return analysis?.progress?.percentage || 0;
  };

  const getEstimatedTimeRemaining = (): string | null => {
    const remaining = analysis?.progress?.estimatedTimeRemaining;
    if (!remaining) return null;

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getCurrentStep = (): string => {
    return analysis?.progress?.currentStep || 'Initializing...';
  };

  const getRecentLogs = (count: number = 5) => {
    return analysis?.progress?.logs?.slice(-count) || [];
  };

  return {
    // Data
    analysis,
    error,
    
    // Loading states
    loading: analysisLoading || runLoading || cancelLoading,
    runLoading,
    cancelLoading,
    
    // Status helpers
    isRunning,
    isCompleted,
    isFailed,
    isCancelled,
    
    // Progress helpers
    getProgressPercentage,
    getEstimatedTimeRemaining,
    getCurrentStep,
    getRecentLogs,
    
    // Actions
    runAnalysis,
    cancelAnalysis,
    refreshAnalysis
  };
};

// Hook for managing multiple analyses
export const useAnalysisList = (projectId: string) => {
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_ANALYSES, {
    variables: { projectId },
    onError: (error) => console.error('Failed to fetch analyses:', error)
  });

  const analyses = data?.project?.analyses || [];

  const getAnalysesByStatus = (status: string) => {
    return analyses.filter((analysis: AnalysisResult) => analysis.status === status);
  };

  const getRunningAnalyses = () => getAnalysesByStatus('RUNNING');
  const getCompletedAnalyses = () => getAnalysesByStatus('COMPLETED');
  const getFailedAnalyses = () => getAnalysesByStatus('FAILED');

  return {
    analyses,
    loading,
    error,
    refetch,
    getAnalysesByStatus,
    getRunningAnalyses,
    getCompletedAnalyses,
    getFailedAnalyses
  };
};

// Hook for analysis recommendations
export const useAnalysisRecommendations = (datasetId: string, researchQuestion?: string) => {
  const { data, loading, error } = useQuery(GET_ANALYSIS_RECOMMENDATIONS, {
    variables: { datasetId, researchQuestion },
    skip: !datasetId
  });

  const recommendations = data?.analysisRecommendations || [];

  const getTopRecommendations = (count: number = 3) => {
    return recommendations
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, count);
  };

  const getRecommendationsByCategory = (category: string) => {
    return recommendations.filter((rec: any) => 
      rec.pipeline.category === category
    );
  };

  return {
    recommendations,
    loading,
    error,
    getTopRecommendations,
    getRecommendationsByCategory
  };
};

const GET_PROJECT_ANALYSES = `
  query GetProjectAnalyses($projectId: ID!) {
    project(id: $projectId) {
      analyses {
        id
        name
        status
        pipeline {
          name
          category
        }
        progress {
          percentage
          currentStep
        }
        createdAt
        completedAt
      }
    }
  }
`;

const GET_ANALYSIS_RECOMMENDATIONS = `
  query GetAnalysisRecommendations($datasetId: ID!, $researchQuestion: String) {
    analysisRecommendations(datasetId: $datasetId, researchQuestion: $researchQuestion) {
      pipeline {
        id
        name
        description
        category
        estimatedRuntime
      }
      confidence
      reasoning
      suggestedParameters {
        key
        value
        description
      }
      estimatedCost
    }
  }
`;