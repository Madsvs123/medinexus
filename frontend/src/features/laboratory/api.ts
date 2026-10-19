import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  LabOrder,
  LabOrderListParams,
  LabReport,
  LabResult,
  LabSample,
  LabTest,
  PatientLite,
  WorkQueueEntry,
} from './types';

export const laboratoryApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- tests catalog ---
    getLabTests: b.query<Paginated<LabTest>, { page?: number; page_size?: number; category?: string; active?: boolean }>({
      query: (params) => ({ url: '/laboratory/tests/', params }),
      providesTags: ['LabTest'],
    }),
    createLabTest: b.mutation<LabTest, Partial<LabTest>>({
      query: (body) => ({ url: '/laboratory/tests/', method: 'POST', body }),
      invalidatesTags: ['LabTest'],
    }),
    updateLabTest: b.mutation<LabTest, { id: number; body: Partial<LabTest> }>({
      query: ({ id, body }) => ({ url: `/laboratory/tests/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['LabTest'],
    }),

    // --- orders ---
    getLabOrders: b.query<Paginated<LabOrder>, LabOrderListParams>({
      query: (params) => ({ url: '/laboratory/orders/', params }),
      providesTags: ['LabOrder'],
    }),
    getLabOrder: b.query<LabOrder, number>({
      query: (id) => `/laboratory/orders/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'LabOrder', id }],
    }),
    createLabOrder: b.mutation<LabOrder, { patient: number; encounter?: number | null; tests: number[]; priority?: string; notes?: string }>({
      query: (body) => ({ url: '/laboratory/orders/', method: 'POST', body }),
      invalidatesTags: ['LabOrder', 'LabSample'],
    }),
    cancelLabOrder: b.mutation<LabOrder, number>({
      query: (id) => ({ url: `/laboratory/orders/${id}/cancel/`, method: 'POST' }),
      invalidatesTags: ['LabOrder'],
    }),
    collectLabOrder: b.mutation<LabOrder, number>({
      query: (id) => ({ url: `/laboratory/orders/${id}/collect/`, method: 'POST' }),
      invalidatesTags: ['LabOrder', 'LabSample', 'WorkQueue'],
    }),

    // --- samples ---
    getLabSamples: b.query<Paginated<LabSample>, { page_size?: number; status?: string; order?: number | string }>({
      query: (params) => ({ url: '/laboratory/samples/', params }),
      providesTags: ['LabSample'],
    }),
    updateLabSample: b.mutation<LabSample, { id: number; body: Partial<LabSample> }>({
      query: ({ id, body }) => ({ url: `/laboratory/samples/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['LabSample', 'WorkQueue'],
    }),

    // --- results ---
    getLabResults: b.query<Paginated<LabResult>, { page?: number; page_size?: number; order?: number | string; status?: string; flag?: string }>({
      query: (params) => ({ url: '/laboratory/results/', params }),
      providesTags: ['LabResult'],
    }),
    createLabResult: b.mutation<LabResult, Partial<LabResult>>({
      query: (body) => ({ url: '/laboratory/results/', method: 'POST', body }),
      invalidatesTags: ['LabResult', 'LabOrder', 'WorkQueue'],
    }),
    updateLabResult: b.mutation<LabResult, { id: number; body: Partial<LabResult> }>({
      query: ({ id, body }) => ({ url: `/laboratory/results/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['LabResult'],
    }),
    approveLabResult: b.mutation<LabResult, number>({
      query: (id) => ({ url: `/laboratory/results/${id}/approve/`, method: 'POST' }),
      invalidatesTags: ['LabResult', 'LabOrder', 'WorkQueue'],
    }),
    rejectLabResult: b.mutation<LabResult, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/laboratory/results/${id}/reject/`, method: 'POST', body: { reason } }),
      invalidatesTags: ['LabResult', 'WorkQueue'],
    }),

    // --- workqueue ---
    getWorkQueue: b.query<WorkQueueEntry[], { status?: string }>({
      query: (params) => ({ url: '/laboratory/workqueue/', params }),
      providesTags: ['WorkQueue'],
    }),

    // --- reports ---
    getLabReports: b.query<Paginated<LabReport>, { page_size?: number; order?: number | string }>({
      query: (params) => ({ url: '/laboratory/reports/', params }),
      providesTags: ['LabReport'],
    }),

    // --- cross-module lookups ---
    searchLabPatients: b.query<Paginated<PatientLite>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
    searchLabEncounters: b.query<Paginated<{ id: number; patient: PatientLite | number; status: string; chief_complaint?: string }>, { patient?: number | string; status?: string; page_size?: number }>({
      query: (params) => ({ url: '/encounters/', params }),
    }),
  }),
});

export const {
  useGetLabTestsQuery,
  useCreateLabTestMutation,
  useUpdateLabTestMutation,
  useGetLabOrdersQuery,
  useGetLabOrderQuery,
  useCreateLabOrderMutation,
  useCancelLabOrderMutation,
  useCollectLabOrderMutation,
  useGetLabSamplesQuery,
  useUpdateLabSampleMutation,
  useGetLabResultsQuery,
  useCreateLabResultMutation,
  useUpdateLabResultMutation,
  useApproveLabResultMutation,
  useRejectLabResultMutation,
  useGetWorkQueueQuery,
  useGetLabReportsQuery,
  useSearchLabPatientsQuery,
  useSearchLabEncountersQuery,
} = laboratoryApi;
