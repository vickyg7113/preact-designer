import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const deletePageMutationKey = ['pages', 'delete'] as const;

async function deletePage(pageId: string): Promise<unknown> {
  return apiClient.delete(`/pages/${pageId}`);
}

/**
 * React Query mutation for deleting a page (DELETE /pages/:page_id).
 */
export function useDeletePageMutation() {
  return useMutation({
    mutationKey: deletePageMutationKey,
    mutationFn: deletePage,
  });
}
