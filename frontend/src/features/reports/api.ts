import { baseApi, readStoredTokens } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  AnalyticsRange,
  AppointmentsAnalytics,
  ClinicalAnalytics,
  GeneratedReport,
  LaboratoryAnalytics,
  PharmacyAnalytics,
  RevenueAnalytics,
} from './types';

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAppointmentsAnalytics: b.query<AppointmentsAnalytics, AnalyticsRange>({
      query: (params) => ({ url: '/reports/analytics/appointments/', params }),
    }),
    getRevenueAnalytics: b.query<RevenueAnalytics, AnalyticsRange>({
      query: (params) => ({ url: '/reports/analytics/revenue/', params }),
    }),
    getClinicalAnalytics: b.query<ClinicalAnalytics, AnalyticsRange>({
      query: (params) => ({ url: '/reports/analytics/clinical/', params }),
    }),
    getLaboratoryAnalytics: b.query<LaboratoryAnalytics, AnalyticsRange>({
      query: (params) => ({ url: '/reports/analytics/laboratory/', params }),
    }),
    getPharmacyAnalytics: b.query<PharmacyAnalytics, AnalyticsRange>({
      query: (params) => ({ url: '/reports/analytics/pharmacy/', params }),
    }),
    getGeneratedReports: b.query<Paginated<GeneratedReport>, { page?: number; page_size?: number; kind?: string }>({
      query: (params) => ({ url: '/reports/generated/', params }),
      providesTags: ['GeneratedReport'],
    }),
    createGeneratedReport: b.mutation<GeneratedReport, { kind: string; params?: Record<string, unknown> }>({
      query: (body) => ({ url: '/reports/generated/', method: 'POST', body }),
      invalidatesTags: ['GeneratedReport'],
    }),
  }),
});

/**
 * Download helper for generated reports: GET /reports/generated/<id>/download/
 * with JWT header, streams to a blob and triggers a browser download.
 */
export async function downloadGeneratedReportFile(id: number, fallbackName = 'report'): Promise<void> {
  const token = readStoredTokens().access ?? '';
  const res = await fetch(`/api/v1/reports/generated/${id}/download/`, {
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
  useGetAppointmentsAnalyticsQuery,
  useGetRevenueAnalyticsQuery,
  useGetClinicalAnalyticsQuery,
  useGetLaboratoryAnalyticsQuery,
  useGetPharmacyAnalyticsQuery,
  useGetGeneratedReportsQuery,
  useCreateGeneratedReportMutation,
} = reportsApi;
