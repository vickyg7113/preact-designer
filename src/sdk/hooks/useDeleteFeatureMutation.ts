import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const deleteFeatureMutationKey = ['features', 'delete'] as const;

async function deleteFeature(featureId: string): Promise<unknown> {
  return apiClient.delete(`/features/${featureId}`);
}

/**
 * React Query mutation for deleting a feature (DELETE /features/:feature_id).
 */
export function useDeleteFeatureMutation() {
  return useMutation({
    mutationKey: deleteFeatureMutationKey,
    mutationFn: deleteFeature,
  });
}
