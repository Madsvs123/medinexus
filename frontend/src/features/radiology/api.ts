import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  PatientLite,
  RadiologyOrder,
  RadiologyOrderListParams,
  RadiologyReport,
} from './types';

export const radiologyApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- orders ---
    getRadiologyOrders: b.query<Paginated<RadiologyOrder>, RadiologyOrderListParams>({
      query: (params) => ({ url: '/radiology/orders/', params }),
      providesTags: ['RadiologyOrder'],
    }),
    getRadiologyOrder: b.query<RadiologyOrder, number>({
      query: (id) => `/radiology/orders/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'RadiologyOrder', id }],
    }),
    createRadiologyOrder: b.mutation<RadiologyOrder, { patient: number; encounter?: number | null; modality: string; body_part: string; clinical_indication?: string; priority?: string; notes?: string }>({
      query: (body) => ({ url: '/radiology/orders/', method: 'POST', body }),
      invalidatesTags: ['RadiologyOrder'],
    }),
    updateRadiologyOrder: b.mutation<RadiologyOrder, { id: number; body: Partial<RadiologyOrder> }>({
      query: ({ id, body }) => ({ url: `/radiology/orders/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'RadiologyOrder', id }],
    }),
    startRadiologyOrder: b.mutation<RadiologyOrder, number>({
      query: (id) => ({ url: `/radiology/orders/${id}/start/`, method: 'POST' }),
      invalidatesTags: ['RadiologyOrder'],
    }),
    completeRadiologyOrder: b.mutation<RadiologyOrder, number>({
      query: (id) => ({ url: `/radiology/orders/${id}/complete/`, method: 'POST' }),
      invalidatesTags: ['RadiologyOrder', 'RadiologyReport'],
    }),
    cancelRadiologyOrder: b.mutation<RadiologyOrder, number>({
      query: (id) => ({ url: `/radiology/orders/${id}/cancel/`, method: 'POST' }),
      invalidatesTags: ['RadiologyOrder'],
    }),

    // --- reports ---
    getRadiologyReports: b.query<Paginated<RadiologyReport>, { page_size?: number; order?: number | string }>({
      query: (params) => ({ url: '/radiology/reports/', params }),
      providesTags: ['RadiologyReport'],
    }),
    createRadiologyReport: b.mutation<RadiologyReport, Partial<RadiologyReport> | FormData>({
      query: (body) => ({ url: '/radiology/reports/', method: 'POST', body }),
      invalidatesTags: ['RadiologyReport', 'RadiologyOrder'],
    }),
    updateRadiologyReport: b.mutation<RadiologyReport, { id: number; body: Partial<RadiologyReport> | FormData }>({
      query: ({ id, body }) => ({ url: `/radiology/reports/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['RadiologyReport'],
    }),
    finalizeRadiologyReport: b.mutation<RadiologyReport, number>({
      query: (id) => ({ url: `/radiology/reports/${id}/finalize/`, method: 'POST' }),
      invalidatesTags: ['RadiologyReport', 'RadiologyOrder'],
    }),

    // --- cross-module lookups ---
    searchRadiologyPatients: b.query<Paginated<PatientLite>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
    searchRadiologyEncounters: b.query<Paginated<{ id: number; patient: PatientLite | number; status: string }>, { patient?: number | string; status?: string; page_size?: number }>({
      query: (params) => ({ url: '/encounters/', params }),
    }),
  }),
});

export const {
  useGetRadiologyOrdersQuery,
  useGetRadiologyOrderQuery,
  useCreateRadiologyOrderMutation,
  useUpdateRadiologyOrderMutation,
  useStartRadiologyOrderMutation,
  useCompleteRadiologyOrderMutation,
  useCancelRadiologyOrderMutation,
  useGetRadiologyReportsQuery,
  useCreateRadiologyReportMutation,
  useUpdateRadiologyReportMutation,
  useFinalizeRadiologyReportMutation,
  useSearchRadiologyPatientsQuery,
  useSearchRadiologyEncountersQuery,
} = radiologyApi;
