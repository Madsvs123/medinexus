// Global search types (mirror §4.18)

export type SearchType = 'patients' | 'encounters' | 'prescriptions' | 'invoices' | 'medications' | 'tests' | 'users';

export const SEARCH_TYPES: SearchType[] = ['patients', 'encounters', 'prescriptions', 'invoices', 'medications', 'tests', 'users'];

export interface SearchResult {
  id: number;
  label: string;
  subtitle: string;
  url: string;
}

export type SearchResponse = Partial<Record<SearchType, SearchResult[]>>;
