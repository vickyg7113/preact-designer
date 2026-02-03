import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { CreatePagePayload } from '../types';

const createPageMutationKey = ['pages', 'create'] as const;

async function createPage(payload: CreatePagePayload): Promise<unknown> {
  return apiClient.post('/pages', {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    status: 'active',
  });
}

/**
 * React Query mutation for creating a page (POST /pages).
 * Used by TagPageEditor inside the SDK; requires QueryClientProvider in the editor iframe.
 */
export function useCreatePageMutation() {
  return useMutation({
    mutationKey: createPageMutationKey,
    mutationFn: createPage,
  });
}
