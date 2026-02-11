import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { GuideUpdatePayload } from '../types';
import { guideByIdQueryKey } from './useGuideById';

const updateGuideMutationKey = ['guides', 'update'] as const;

async function updateGuide({
  guideId,
  payload,
}: {
  guideId: string;
  payload: GuideUpdatePayload;
}): Promise<unknown> {
  return apiClient.put(`/guides/${guideId}`, payload);
}

/**
 * React Query mutation for updating a guide (PUT /guides/:guide_id).
 * Invalidates the guide-by-id query on success.
 */
export function useUpdateGuideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: updateGuideMutationKey,
    mutationFn: updateGuide,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: guideByIdQueryKey(variables.guideId) });
    },
  });
}
