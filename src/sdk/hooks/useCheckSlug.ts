import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface CheckSlugResponse {
  exists: boolean;
}

const checkSlugQueryKey = (slug: string) => ['pages', 'check-slug', slug] as const;

async function fetchCheckSlug(slug: string): Promise<CheckSlugResponse> {
  return apiClient.get<CheckSlugResponse>(`/pages/check-slug?slug=${encodeURIComponent(slug)}`);
}

/**
 * React Query for GET /pages/check-slug?slug=...
 * Returns { exists: true } when the page is tagged.
 */
export function useCheckSlug(slug: string) {
  return useQuery({
    queryKey: checkSlugQueryKey(slug),
    queryFn: () => fetchCheckSlug(slug),
    enabled: !!slug,
    retry: 0,
  });
}
