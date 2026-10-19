import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  ClinicalNote,
  ClinicalRadiologyOrder,
  DepartmentRef,
  Diagnosis,
  DischargeSummary,
  Encounter,
  EncounterDetail,
  EncounterListParams,
  FollowUp,
  LabOrder,
  MedicationRef,
  Prescription,
  ProcedureRecord,
  Referral,
  SpecialtyRef,
  TreatmentPlan,
  UserRef,
  VitalSigns,
} from './types';

export const clinicalApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- encounters ---
    getEncounters: b.query<Paginated<Encounter>, EncounterListParams>({
      query: (params) => ({ url: '/encounters/', params }),
      providesTags: ['Encounter'],
    }),
    getEncounter: b.query<EncounterDetail, number>({
      query: (id) => `/encounters/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Encounter', id }],
    }),
    createEncounter: b.mutation<Encounter, Partial<Encounter>>({
      query: (body) => ({ url: '/encounters/', method: 'POST', body }),
      invalidatesTags: ['Encounter'],
    }),
    updateEncounter: b.mutation<Encounter, { id: number; body: Partial<Encounter> }>({
      query: ({ id, body }) => ({ url: `/encounters/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Encounter', id }],
    }),
    deleteEncounter: b.mutation<void, number>({
      query: (id) => ({ url: `/encounters/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Encounter'],
    }),
    completeEncounter: b.mutation<Encounter, number>({
      query: (id) => ({ url: `/encounters/${id}/complete/`, method: 'POST' }),
      invalidatesTags: ['Encounter'],
    }),

    // --- vitals ---
    getVitals: b.query<Paginated<VitalSigns>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/vitals/', params }),
      providesTags: ['Vital'],
    }),
    createVital: b.mutation<VitalSigns, Partial<VitalSigns>>({
      query: (body) => ({ url: '/vitals/', method: 'POST', body }),
      invalidatesTags: ['Vital', 'Encounter'],
    }),
    deleteVital: b.mutation<void, number>({
      query: (id) => ({ url: `/vitals/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Vital'],
    }),

    // --- diagnoses ---
    getDiagnoses: b.query<Paginated<Diagnosis>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/diagnoses/', params }),
      providesTags: ['Diagnosis'],
    }),
    createDiagnosis: b.mutation<Diagnosis, Partial<Diagnosis>>({
      query: (body) => ({ url: '/diagnoses/', method: 'POST', body }),
      invalidatesTags: ['Diagnosis', 'Encounter'],
    }),
    deleteDiagnosis: b.mutation<void, number>({
      query: (id) => ({ url: `/diagnoses/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Diagnosis'],
    }),

    // --- notes ---
    getNotes: b.query<Paginated<ClinicalNote>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/notes/', params }),
      providesTags: ['Note'],
    }),
    createNote: b.mutation<ClinicalNote, Partial<ClinicalNote>>({
      query: (body) => ({ url: '/notes/', method: 'POST', body }),
      invalidatesTags: ['Note', 'Encounter'],
    }),
    updateNote: b.mutation<ClinicalNote, { id: number; body: Partial<ClinicalNote> }>({
      query: ({ id, body }) => ({ url: `/notes/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Note'],
    }),
    signNote: b.mutation<ClinicalNote, number>({
      query: (id) => ({ url: `/notes/${id}/sign/`, method: 'POST' }),
      invalidatesTags: ['Note'],
    }),
    deleteNote: b.mutation<void, number>({
      query: (id) => ({ url: `/notes/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Note'],
    }),

    // --- treatment plans ---
    getTreatmentPlans: b.query<Paginated<TreatmentPlan>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/treatment-plans/', params }),
      providesTags: ['TreatmentPlan'],
    }),
    createTreatmentPlan: b.mutation<TreatmentPlan, Partial<TreatmentPlan>>({
      query: (body) => ({ url: '/treatment-plans/', method: 'POST', body }),
      invalidatesTags: ['TreatmentPlan', 'Encounter'],
    }),
    updateTreatmentPlan: b.mutation<TreatmentPlan, { id: number; body: Partial<TreatmentPlan> }>({
      query: ({ id, body }) => ({ url: `/treatment-plans/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['TreatmentPlan'],
    }),
    deleteTreatmentPlan: b.mutation<void, number>({
      query: (id) => ({ url: `/treatment-plans/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['TreatmentPlan'],
    }),

    // --- prescriptions ---
    getPrescriptions: b.query<Paginated<Prescription>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/prescriptions/', params }),
      providesTags: ['Prescription'],
    }),
    createPrescription: b.mutation<Prescription, { body: Partial<Prescription> & { override?: boolean } }>({
      query: ({ body }) => ({ url: '/prescriptions/', method: 'POST', body }),
      invalidatesTags: ['Prescription', 'Encounter'],
    }),
    cancelPrescription: b.mutation<Prescription, number>({
      query: (id) => ({ url: `/prescriptions/${id}/cancel/`, method: 'POST' }),
      invalidatesTags: ['Prescription'],
    }),
    deletePrescription: b.mutation<void, number>({
      query: (id) => ({ url: `/prescriptions/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Prescription'],
    }),

    // --- procedures ---
    getProcedures: b.query<Paginated<ProcedureRecord>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/procedures/', params }),
      providesTags: ['Procedure'],
    }),
    createProcedure: b.mutation<ProcedureRecord, Partial<ProcedureRecord>>({
      query: (body) => ({ url: '/procedures/', method: 'POST', body }),
      invalidatesTags: ['Procedure', 'Encounter'],
    }),
    deleteProcedure: b.mutation<void, number>({
      query: (id) => ({ url: `/procedures/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Procedure'],
    }),

    // --- lab orders (create laboratory.LabOrder) ---
    getClinicalLabOrders: b.query<Paginated<LabOrder>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/lab-orders/', params }),
      providesTags: ['EncounterLabOrder'],
    }),
    createLabOrder: b.mutation<LabOrder, Partial<LabOrder>>({
      query: (body) => ({ url: '/lab-orders/', method: 'POST', body }),
      invalidatesTags: ['EncounterLabOrder', 'Encounter'],
    }),
    deleteLabOrder: b.mutation<void, number>({
      query: (id) => ({ url: `/lab-orders/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['EncounterLabOrder'],
    }),

    // --- radiology orders (create radiology.RadiologyOrder) ---
    getClinicalRadiologyOrders: b.query<Paginated<ClinicalRadiologyOrder>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/radiology-orders/', params }),
      providesTags: ['EncounterRadiologyOrder'],
    }),
    createRadiologyOrder: b.mutation<ClinicalRadiologyOrder, Partial<ClinicalRadiologyOrder>>({
      query: (body) => ({ url: '/radiology-orders/', method: 'POST', body }),
      invalidatesTags: ['EncounterRadiologyOrder', 'Encounter'],
    }),
    deleteRadiologyOrder: b.mutation<void, number>({
      query: (id) => ({ url: `/radiology-orders/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['EncounterRadiologyOrder'],
    }),

    // --- referrals ---
    getReferrals: b.query<Paginated<Referral>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/referrals/', params }),
      providesTags: ['Referral'],
    }),
    createReferral: b.mutation<Referral, Partial<Referral>>({
      query: (body) => ({ url: '/referrals/', method: 'POST', body }),
      invalidatesTags: ['Referral', 'Encounter'],
    }),
    acceptReferral: b.mutation<Referral, number>({
      query: (id) => ({ url: `/referrals/${id}/accept/`, method: 'POST' }),
      invalidatesTags: ['Referral'],
    }),
    declineReferral: b.mutation<Referral, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/referrals/${id}/decline/`, method: 'POST', body: reason ? { reason } : {} }),
      invalidatesTags: ['Referral'],
    }),
    deleteReferral: b.mutation<void, number>({
      query: (id) => ({ url: `/referrals/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Referral'],
    }),

    // --- follow-ups ---
    getFollowUps: b.query<Paginated<FollowUp>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/follow-ups/', params }),
      providesTags: ['FollowUp'],
    }),
    createFollowUp: b.mutation<FollowUp, Partial<FollowUp>>({
      query: (body) => ({ url: '/follow-ups/', method: 'POST', body }),
      invalidatesTags: ['FollowUp', 'Encounter'],
    }),
    updateFollowUp: b.mutation<FollowUp, { id: number; body: Partial<FollowUp> }>({
      query: ({ id, body }) => ({ url: `/follow-ups/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['FollowUp'],
    }),
    deleteFollowUp: b.mutation<void, number>({
      query: (id) => ({ url: `/follow-ups/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['FollowUp'],
    }),

    // --- discharge summaries ---
    getDischargeSummaries: b.query<Paginated<DischargeSummary>, { encounter?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/discharge-summaries/', params }),
      providesTags: ['DischargeSummary'],
    }),
    createDischargeSummary: b.mutation<DischargeSummary, Partial<DischargeSummary>>({
      query: (body) => ({ url: '/discharge-summaries/', method: 'POST', body }),
      invalidatesTags: ['DischargeSummary', 'Encounter'],
    }),
    updateDischargeSummary: b.mutation<DischargeSummary, { id: number; body: Partial<DischargeSummary> }>({
      query: ({ id, body }) => ({ url: `/discharge-summaries/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['DischargeSummary'],
    }),
    finalizeDischargeSummary: b.mutation<DischargeSummary, number>({
      query: (id) => ({ url: `/discharge-summaries/${id}/finalize/`, method: 'POST' }),
      invalidatesTags: ['DischargeSummary'],
    }),

    // --- cross-module lookups ---
    getPrescriptionMedications: b.query<Paginated<MedicationRef>, { page_size?: number; search?: string }>({
      query: (params) => ({ url: '/pharmacy/medications/', params }),
    }),
    getEncounterSpecialties: b.query<Paginated<SpecialtyRef>, { page_size?: number }>({
      query: (params) => ({ url: '/organizations/specialties/', params }),
    }),
    searchEncounterPatients: b.query<Paginated<{ id: number; mrn: string; first_name: string; last_name: string; full_name?: string }>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
    searchEncounterDoctors: b.query<Paginated<UserRef>, { role?: string; search?: string; page_size?: number }>({
      query: (params) => ({ url: '/auth/users/', params }),
    }),
    getEncounterDepartments: b.query<Paginated<DepartmentRef>, { page_size?: number }>({
      query: (params) => ({ url: '/organizations/departments/', params }),
    }),
    getLabTestsCatalog: b.query<Paginated<{ id: number; code: string; name: string; category?: string; sample_type?: string }>, { page_size?: number; active?: boolean }>({
      query: (params) => ({ url: '/laboratory/tests/', params }),
    }),
  }),
});

export const {
  useGetEncountersQuery,
  useGetEncounterQuery,
  useCreateEncounterMutation,
  useUpdateEncounterMutation,
  useDeleteEncounterMutation,
  useCompleteEncounterMutation,
  useGetVitalsQuery,
  useCreateVitalMutation,
  useDeleteVitalMutation,
  useGetDiagnosesQuery,
  useCreateDiagnosisMutation,
  useDeleteDiagnosisMutation,
  useGetNotesQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useSignNoteMutation,
  useDeleteNoteMutation,
  useGetTreatmentPlansQuery,
  useCreateTreatmentPlanMutation,
  useUpdateTreatmentPlanMutation,
  useDeleteTreatmentPlanMutation,
  useGetPrescriptionsQuery,
  useCreatePrescriptionMutation,
  useCancelPrescriptionMutation,
  useDeletePrescriptionMutation,
  useGetProceduresQuery,
  useCreateProcedureMutation,
  useDeleteProcedureMutation,
  useGetClinicalLabOrdersQuery,
  useCreateLabOrderMutation,
  useDeleteLabOrderMutation,
  useGetClinicalRadiologyOrdersQuery,
  useCreateRadiologyOrderMutation,
  useDeleteRadiologyOrderMutation,
  useGetReferralsQuery,
  useCreateReferralMutation,
  useAcceptReferralMutation,
  useDeclineReferralMutation,
  useDeleteReferralMutation,
  useGetFollowUpsQuery,
  useCreateFollowUpMutation,
  useUpdateFollowUpMutation,
  useDeleteFollowUpMutation,
  useGetDischargeSummariesQuery,
  useCreateDischargeSummaryMutation,
  useUpdateDischargeSummaryMutation,
  useFinalizeDischargeSummaryMutation,
  useGetPrescriptionMedicationsQuery,
  useGetEncounterSpecialtiesQuery,
  useSearchEncounterPatientsQuery,
  useSearchEncounterDoctorsQuery,
  useGetEncounterDepartmentsQuery,
  useGetLabTestsCatalogQuery,
} = clinicalApi;
