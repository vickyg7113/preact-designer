import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface PageItem {
  page_id: string;
  product_id: string | null;
  area_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface PagesListResponse {
  status: string;
  total: number;
  data: PageItem[];
}

const pagesListQueryKey = ['pages', 'list'] as const;

async function fetchPagesList(): Promise<PagesListResponse> {
  return apiClient.get<PagesListResponse>('/pages');
}

/**
 * React Query for GET /pages - list of all pages.
 * Filter by slug (e.g. current selection URL) on the client to show "pages tagged to this URL".
 */
export function usePagesList() {
  return useQuery({
    queryKey: pagesListQueryKey,
    queryFn: fetchPagesList,
    retry: 0,
  });
}
