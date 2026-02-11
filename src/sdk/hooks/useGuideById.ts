import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { GuideByIdResponse } from '../types';

export const guideByIdQueryKey = (guideId: string | null) => ['guides', 'byId', guideId] as const;

async function fetchGuideById(guideId: string): Promise<GuideByIdResponse> {
  const params = new URLSearchParams({ guide_id: guideId });
  return apiClient.get<GuideByIdResponse>(`/guides?${params.toString()}`);
}

/**
 * Fetch a single guide by ID (GET /guides?guide_id=).
 * Enabled only when guideId is truthy.
 */
export function useGuideById(guideId: string | null) {
  return useQuery({
    queryKey: guideByIdQueryKey(guideId),
    queryFn: () => fetchGuideById(guideId!),
    enabled: !!guideId,
    retry: 0,
  });
}
