import { baseApi, readStoredTokens } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type { DocumentListParams, DocumentRecord } from './types';

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getDocuments: b.query<Paginated<DocumentRecord>, DocumentListParams>({
      query: (params) => ({ url: '/documents/', params }),
      providesTags: ['Document'],
    }),
    uploadDocument: b.mutation<DocumentRecord, { file: File; title?: string; category?: string; patient?: number | null; notes?: string; tags?: string[] }>({
      query: ({ file, title, category, patient, notes, tags }) => {
        const form = new FormData();
        form.append('file', file);
        if (title) form.append('title', title);
        if (category) form.append('category', category);
        if (patient) form.append('patient', String(patient));
        if (notes) form.append('notes', notes);
        if (tags?.length) form.append('tags', JSON.stringify(tags));
        return { url: '/documents/', method: 'POST', body: form };
      },
      invalidatesTags: ['Document'],
    }),
    updateDocument: b.mutation<DocumentRecord, { id: number; body: Partial<DocumentRecord> }>({
      query: ({ id, body }) => ({ url: `/documents/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Document'],
    }),
    deleteDocument: b.mutation<void, number>({
      query: (id) => ({ url: `/documents/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Document'],
    }),
    searchDocumentPatients: b.query<Paginated<{ id: number; mrn: string; first_name: string; last_name: string; full_name?: string }>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
  }),
});

/**
 * Download helper: GET /documents/<id>/download/ with the JWT header,
 * streams to a blob and triggers a browser download (FileResponse per §4.15).
 */
export async function downloadDocumentFile(id: number, fallbackName = 'document'): Promise<void> {
  const token = readStoredTokens().access ?? '';
  const res = await fetch(`/api/v1/documents/${id}/download/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const name = match?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useLazySearchDocumentPatientsQuery,
} = documentsApi;
