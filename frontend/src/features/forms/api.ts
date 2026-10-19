import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type { FormSubmission, FormTemplate } from './types';

export const formsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getFormTemplates: b.query<Paginated<FormTemplate>, { page?: number; page_size?: number; category?: string }>({
      query: (params) => ({ url: '/forms/templates/', params }),
      providesTags: ['FormTemplate'],
    }),
    getFormTemplate: b.query<FormTemplate, number>({
      query: (id) => `/forms/templates/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'FormTemplate', id }],
    }),
    createFormTemplate: b.mutation<FormTemplate, Partial<FormTemplate>>({
      query: (body) => ({ url: '/forms/templates/', method: 'POST', body }),
      invalidatesTags: ['FormTemplate'],
    }),
    updateFormTemplate: b.mutation<FormTemplate, { id: number; body: Partial<FormTemplate> }>({
      query: ({ id, body }) => ({ url: `/forms/templates/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['FormTemplate'],
    }),
    duplicateFormTemplate: b.mutation<FormTemplate, number>({
      query: (id) => ({ url: `/forms/templates/${id}/duplicate/`, method: 'POST' }),
      invalidatesTags: ['FormTemplate'],
    }),
    getFormSubmissions: b.query<Paginated<FormSubmission>, { page?: number; page_size?: number; template?: number | string; patient?: number | string; status?: string }>({
      query: (params) => ({ url: '/forms/submissions/', params }),
      providesTags: ['FormSubmission'],
    }),
    getFormSubmission: b.query<FormSubmission, number>({
      query: (id) => `/forms/submissions/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'FormSubmission', id }],
    }),
    createFormSubmission: b.mutation<FormSubmission, { template: number; patient?: number | null; data: Record<string, unknown> }>({
      query: (body) => ({ url: '/forms/submissions/', method: 'POST', body }),
      invalidatesTags: ['FormSubmission'],
    }),
    updateFormSubmission: b.mutation<FormSubmission, { id: number; body: Partial<FormSubmission> }>({
      query: ({ id, body }) => ({ url: `/forms/submissions/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['FormSubmission'],
    }),
    submitFormSubmission: b.mutation<FormSubmission, number>({
      query: (id) => ({ url: `/forms/submissions/${id}/submit/`, method: 'POST' }),
      invalidatesTags: ['FormSubmission'],
    }),
    approveFormSubmission: b.mutation<FormSubmission, number>({
      query: (id) => ({ url: `/forms/submissions/${id}/approve/`, method: 'POST' }),
      invalidatesTags: ['FormSubmission'],
    }),
    rejectFormSubmission: b.mutation<FormSubmission, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/forms/submissions/${id}/reject/`, method: 'POST', body: { reason } }),
      invalidatesTags: ['FormSubmission'],
    }),
    searchFormPatients: b.query<Paginated<{ id: number; mrn: string; first_name: string; last_name: string; full_name?: string }>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
  }),
});

export const {
  useGetFormTemplatesQuery,
  useGetFormTemplateQuery,
  useCreateFormTemplateMutation,
  useUpdateFormTemplateMutation,
  useDuplicateFormTemplateMutation,
  useGetFormSubmissionsQuery,
  useGetFormSubmissionQuery,
  useCreateFormSubmissionMutation,
  useUpdateFormSubmissionMutation,
  useSubmitFormSubmissionMutation,
  useApproveFormSubmissionMutation,
  useRejectFormSubmissionMutation,
  useLazySearchFormPatientsQuery,
} = formsApi;
