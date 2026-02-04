import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ExactMatchFeaturePayload } from '../types';

const createFeatureMutationKey = ['features', 'create'] as const;

async function createFeature(payload: ExactMatchFeaturePayload): Promise<unknown> {
  return apiClient.post('/features', payload);
}

/**
 * React Query mutation for creating a feature (POST /features).
 * Used by TagFeatureEditor; requires QueryClientProvider in the editor iframe.
 */
export function useCreateFeatureMutation() {
  return useMutation({
    mutationKey: createFeatureMutationKey,
    mutationFn: createFeature,
  });
}
