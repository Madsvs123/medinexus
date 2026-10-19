import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  ConsentRecord,
  EmergencyContact,
  Patient,
  PatientAllergy,
  PatientCondition,
  PatientDetail,
  PatientDocument,
  PatientListParams,
  TimelineEvent,
} from './types';

export const patientsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- patients ---
    getPatients: b.query<Paginated<Patient>, PatientListParams>({
      query: (params) => ({ url: '/patients/', params }),
      providesTags: ['Patient'],
    }),
    getPatient: b.query<PatientDetail, number>({
      query: (id) => `/patients/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Patient', id }],
    }),
    createPatient: b.mutation<Patient, Partial<Patient> | FormData>({
      query: (body) => ({ url: '/patients/', method: 'POST', body }),
      invalidatesTags: ['Patient'],
    }),
    updatePatient: b.mutation<Patient, { id: number; body: Partial<Patient> | FormData }>({
      query: ({ id, body }) => ({ url: `/patients/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Patient', id }],
    }),
    deletePatient: b.mutation<void, number>({
      query: (id) => ({ url: `/patients/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Patient'],
    }),
    getPatientTimeline: b.query<TimelineEvent[], number>({
      query: (id) => `/patients/${id}/timeline/`,
      providesTags: ['Patient'],
    }),

    // --- allergies ---
    getPatientAllergies: b.query<PatientAllergy[], number>({
      query: (patientId) => `/patients/${patientId}/allergies/`,
      providesTags: ['PatientAllergy'],
    }),
    createPatientAllergy: b.mutation<PatientAllergy, { patientId: number; body: Partial<PatientAllergy> }>({
      query: ({ patientId, body }) => ({ url: `/patients/${patientId}/allergies/`, method: 'POST', body }),
      invalidatesTags: ['PatientAllergy', 'Patient'],
    }),
    updatePatientAllergy: b.mutation<PatientAllergy, { patientId: number; id: number; body: Partial<PatientAllergy> }>({
      query: ({ patientId, id, body }) => ({ url: `/patients/${patientId}/allergies/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['PatientAllergy', 'Patient'],
    }),
    deletePatientAllergy: b.mutation<void, { patientId: number; id: number }>({
      query: ({ patientId, id }) => ({ url: `/patients/${patientId}/allergies/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PatientAllergy', 'Patient'],
    }),

    // --- conditions ---
    getPatientConditions: b.query<PatientCondition[], number>({
      query: (patientId) => `/patients/${patientId}/conditions/`,
      providesTags: ['PatientCondition'],
    }),
    createPatientCondition: b.mutation<PatientCondition, { patientId: number; body: Partial<PatientCondition> }>({
      query: ({ patientId, body }) => ({ url: `/patients/${patientId}/conditions/`, method: 'POST', body }),
      invalidatesTags: ['PatientCondition', 'Patient'],
    }),
    updatePatientCondition: b.mutation<PatientCondition, { patientId: number; id: number; body: Partial<PatientCondition> }>({
      query: ({ patientId, id, body }) => ({ url: `/patients/${patientId}/conditions/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['PatientCondition', 'Patient'],
    }),
    deletePatientCondition: b.mutation<void, { patientId: number; id: number }>({
      query: ({ patientId, id }) => ({ url: `/patients/${patientId}/conditions/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PatientCondition', 'Patient'],
    }),

    // --- emergency contacts ---
    getPatientContacts: b.query<EmergencyContact[], number>({
      query: (patientId) => `/patients/${patientId}/contacts/`,
      providesTags: ['PatientContact'],
    }),
    createPatientContact: b.mutation<EmergencyContact, { patientId: number; body: Partial<EmergencyContact> }>({
      query: ({ patientId, body }) => ({ url: `/patients/${patientId}/contacts/`, method: 'POST', body }),
      invalidatesTags: ['PatientContact', 'Patient'],
    }),
    updatePatientContact: b.mutation<EmergencyContact, { patientId: number; id: number; body: Partial<EmergencyContact> }>({
      query: ({ patientId, id, body }) => ({ url: `/patients/${patientId}/contacts/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['PatientContact', 'Patient'],
    }),
    deletePatientContact: b.mutation<void, { patientId: number; id: number }>({
      query: ({ patientId, id }) => ({ url: `/patients/${patientId}/contacts/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PatientContact', 'Patient'],
    }),

    // --- documents ---
    getPatientDocuments: b.query<PatientDocument[], number>({
      query: (patientId) => `/patients/${patientId}/documents/`,
      providesTags: ['PatientDocument'],
    }),
    uploadPatientDocument: b.mutation<PatientDocument, { patientId: number; formData: FormData }>({
      query: ({ patientId, formData }) => ({ url: `/patients/${patientId}/documents/`, method: 'POST', body: formData }),
      invalidatesTags: ['PatientDocument', 'Patient'],
    }),
    deletePatientDocument: b.mutation<void, { patientId: number; id: number }>({
      query: ({ patientId, id }) => ({ url: `/patients/${patientId}/documents/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PatientDocument', 'Patient'],
    }),

    // --- consents ---
    getPatientConsents: b.query<ConsentRecord[], number>({
      query: (patientId) => `/patients/${patientId}/consents/`,
      providesTags: ['PatientConsent'],
    }),
    createPatientConsent: b.mutation<ConsentRecord, { patientId: number; body: Partial<ConsentRecord> | FormData }>({
      query: ({ patientId, body }) => ({ url: `/patients/${patientId}/consents/`, method: 'POST', body }),
      invalidatesTags: ['PatientConsent', 'Patient'],
    }),
    updatePatientConsent: b.mutation<ConsentRecord, { patientId: number; id: number; body: Partial<ConsentRecord> }>({
      query: ({ patientId, id, body }) => ({ url: `/patients/${patientId}/consents/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['PatientConsent', 'Patient'],
    }),
    deletePatientConsent: b.mutation<void, { patientId: number; id: number }>({
      query: ({ patientId, id }) => ({ url: `/patients/${patientId}/consents/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PatientConsent', 'Patient'],
    }),
  }),
});

export const {
  useGetPatientsQuery,
  useGetPatientQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useGetPatientTimelineQuery,
  useGetPatientAllergiesQuery,
  useCreatePatientAllergyMutation,
  useUpdatePatientAllergyMutation,
  useDeletePatientAllergyMutation,
  useGetPatientConditionsQuery,
  useCreatePatientConditionMutation,
  useUpdatePatientConditionMutation,
  useDeletePatientConditionMutation,
  useGetPatientContactsQuery,
  useCreatePatientContactMutation,
  useUpdatePatientContactMutation,
  useDeletePatientContactMutation,
  useGetPatientDocumentsQuery,
  useUploadPatientDocumentMutation,
  useDeletePatientDocumentMutation,
  useGetPatientConsentsQuery,
  useCreatePatientConsentMutation,
  useUpdatePatientConsentMutation,
  useDeletePatientConsentMutation,
} = patientsApi;
