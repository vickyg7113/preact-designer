import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { FeatureItem } from '../types';

export interface FeaturesListResponse {
  status?: string;
  total?: number;
  data: FeatureItem[];
}

const featuresListQueryKey = ['features', 'list'] as const;

async function fetchFeaturesList(): Promise<FeaturesListResponse> {
  const res = await apiClient.get<FeaturesListResponse | FeatureItem[]>('/features');
  if (Array.isArray(res)) {
    return { data: res };
  }
  return res as FeaturesListResponse;
}

/**
 * React Query for GET /features - list of all features.
 */
export function useFeaturesList() {
  return useQuery({
    queryKey: featuresListQueryKey,
    queryFn: fetchFeaturesList,
    retry: 0,
  });
}

export { featuresListQueryKey };
