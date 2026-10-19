import { baseApi, readStoredTokens } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type { ImportJob, Organization, OrganizationSettings } from './types';

export const configurationApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getOrganization: b.query<Organization, void>({
      query: () => '/organizations/me/',
      providesTags: ['Organization'],
    }),
    updateOrganization: b.mutation<Organization, { body: Partial<Omit<Organization, 'logo'>> & { logo?: File | null } }>({
      query: ({ body }) => {
        const { logo, ...fields } = body;
        if (logo instanceof File) {
          const form = new FormData();
          form.append('logo', logo);
          for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined && v !== null) form.append(k, String(v));
          }
          return { url: '/organizations/me/', method: 'PATCH', body: form };
        }
        return { url: '/organizations/me/', method: 'PATCH', body: fields };
      },
      invalidatesTags: ['Organization'],
    }),
    getSettings: b.query<OrganizationSettings, void>({
      query: () => '/configuration/settings/',
      providesTags: ['Settings'],
    }),
    updateSettings: b.mutation<OrganizationSettings, Partial<OrganizationSettings>>({
      query: (body) => ({ url: '/configuration/settings/', method: 'PATCH', body }),
      invalidatesTags: ['Settings'],
    }),
    getImportJobs: b.query<Paginated<ImportJob>, { page?: number; page_size?: number }>({
      query: (params) => ({ url: '/configuration/imports/', params }),
      providesTags: ['ImportJob'],
    }),
    createImportJob: b.mutation<ImportJob, { kind: string; file: File }>({
      query: ({ kind, file }) => {
        const form = new FormData();
        form.append('kind', kind);
        form.append('file', file);
        return { url: '/configuration/imports/', method: 'POST', body: form };
      },
      invalidatesTags: ['ImportJob'],
    }),
  }),
});

/**
 * Template download: GET /configuration/imports/download-template/?kind=<kind>
 * (openpyxl-generated CSV with headers per §4.19). Streams to a blob.
 */
export async function downloadImportTemplate(kind: string): Promise<void> {
  const token = readStoredTokens().access ?? '';
  const res = await fetch(`/api/v1/configuration/imports/download-template/?kind=${encodeURIComponent(kind)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Template download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${kind}-template.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const {
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetImportJobsQuery,
  useCreateImportJobMutation,
} = configurationApi;
