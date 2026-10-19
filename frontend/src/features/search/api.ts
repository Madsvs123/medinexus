import { baseApi } from '../../app/api/baseApi';
import type { SearchResponse, SearchType } from './types';

export const searchApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    globalSearch: b.query<SearchResponse, { q: string; type?: SearchType | '' }>({
      query: (params) => ({ url: '/search/', params }),
    }),
  }),
});

export const { useGlobalSearchQuery } = searchApi;
