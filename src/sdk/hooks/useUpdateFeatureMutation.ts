import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ExactMatchFeaturePayload } from '../types';

const updateFeatureMutationKey = ['features', 'update'] as const;

async function updateFeature({
  featureId,
  payload,
}: {
  featureId: string;
  payload: ExactMatchFeaturePayload;
}): Promise<unknown> {
  return apiClient.put(`/features/${featureId}`, payload);
}

/**
 * React Query mutation for updating a feature (PUT /features/:feature_id).
 */
export function useUpdateFeatureMutation() {
  return useMutation({
    mutationKey: updateFeatureMutationKey,
    mutationFn: updateFeature,
  });
}
