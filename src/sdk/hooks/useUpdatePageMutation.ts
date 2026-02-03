import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface UpdatePagePayload {
  name: string;
  slug: string;
  description?: string;
  status?: string;
}

const updatePageMutationKey = ['pages', 'update'] as const;

async function updatePage({ pageId, payload }: { pageId: string; payload: UpdatePagePayload }): Promise<unknown> {
  return apiClient.put(`/pages/${pageId}`, {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    status: payload.status ?? 'active',
  });
}

/**
 * React Query mutation for updating a page (PUT /pages/:page_id).
 */
export function useUpdatePageMutation() {
  return useMutation({
    mutationKey: updatePageMutationKey,
    mutationFn: updatePage,
  });
}
