import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  Admission,
  AdmissionDetail,
  AdmissionListParams,
  Bed,
  CarePlan,
  Discharge,
  DoctorRound,
  InpatientRoom,
  InpatientStats,
  MedicationAdministration,
  NursingObservation,
  PatientTransfer,
  Ward,
} from './types';

export const inpatientApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- wards ---
    getWards: b.query<Paginated<Ward>, { page_size?: number }>({
      query: (params) => ({ url: '/inpatient/wards/', params }),
      providesTags: ['Ward'],
    }),
    createWard: b.mutation<Ward, Partial<Ward>>({
      query: (body) => ({ url: '/inpatient/wards/', method: 'POST', body }),
      invalidatesTags: ['Ward'],
    }),
    updateWard: b.mutation<Ward, { id: number; body: Partial<Ward> }>({
      query: ({ id, body }) => ({ url: `/inpatient/wards/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Ward'],
    }),
    getWardRooms: b.query<InpatientRoom[], number>({
      query: (wardId) => `/inpatient/wards/${wardId}/rooms/`,
      providesTags: ['Room', 'Bed'],
    }),

    // --- rooms ---
    getInpatientRooms: b.query<Paginated<InpatientRoom>, { page_size?: number; ward?: number | string }>({
      query: (params) => ({ url: '/inpatient/rooms/', params }),
      providesTags: ['Room'],
    }),
    createInpatientRoom: b.mutation<InpatientRoom, Partial<InpatientRoom>>({
      query: (body) => ({ url: '/inpatient/rooms/', method: 'POST', body }),
      invalidatesTags: ['Room'],
    }),
    updateInpatientRoom: b.mutation<InpatientRoom, { id: number; body: Partial<InpatientRoom> }>({
      query: ({ id, body }) => ({ url: `/inpatient/rooms/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Room'],
    }),

    // --- beds ---
    getBeds: b.query<Paginated<Bed>, { page_size?: number; status?: string; room?: number | string }>({
      query: (params) => ({ url: '/inpatient/beds/', params }),
      providesTags: ['Bed'],
    }),
    createBed: b.mutation<Bed, Partial<Bed>>({
      query: (body) => ({ url: '/inpatient/beds/', method: 'POST', body }),
      invalidatesTags: ['Bed', 'Room'],
    }),
    updateBed: b.mutation<Bed, { id: number; body: Partial<Bed> }>({
      query: ({ id, body }) => ({ url: `/inpatient/beds/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Bed'],
    }),
    assignBed: b.mutation<Bed, { id: number; admission_id: number }>({
      query: ({ id, admission_id }) => ({ url: `/inpatient/beds/${id}/assign/`, method: 'POST', body: { admission_id } }),
      invalidatesTags: ['Bed', 'Admission', 'Room'],
    }),
    freeBed: b.mutation<Bed, number>({
      query: (id) => ({ url: `/inpatient/beds/${id}/free/`, method: 'POST' }),
      invalidatesTags: ['Bed', 'Admission'],
    }),
    maintenanceBed: b.mutation<Bed, number>({
      query: (id) => ({ url: `/inpatient/beds/${id}/maintenance/`, method: 'POST' }),
      invalidatesTags: ['Bed'],
    }),

    // --- admissions ---
    getAdmissions: b.query<Paginated<Admission>, AdmissionListParams>({
      query: (params) => ({ url: '/inpatient/admissions/', params }),
      providesTags: ['Admission'],
    }),
    getAdmission: b.query<AdmissionDetail, number>({
      query: (id) => `/inpatient/admissions/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Admission', id }],
    }),
    createAdmission: b.mutation<Admission, Partial<Admission>>({
      query: (body) => ({ url: '/inpatient/admissions/', method: 'POST', body }),
      invalidatesTags: ['Admission', 'Bed'],
    }),
    updateAdmission: b.mutation<Admission, { id: number; body: Partial<Admission> }>({
      query: ({ id, body }) => ({ url: `/inpatient/admissions/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Admission', id }],
    }),
    transferAdmission: b.mutation<Admission, { id: number; bed_id: number; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/inpatient/admissions/${id}/transfer/`, method: 'POST', body }),
      invalidatesTags: ['Admission', 'Bed', 'Transfer'],
    }),
    dischargeAdmission: b.mutation<Admission, { id: number; body: Partial<Discharge> }>({
      query: ({ id, body }) => ({ url: `/inpatient/admissions/${id}/discharge/`, method: 'POST', body }),
      invalidatesTags: ['Admission', 'Bed', 'Discharge'],
    }),

    // --- transfers ---
    getTransfers: b.query<Paginated<PatientTransfer>, { page_size?: number; admission?: number | string }>({
      query: (params) => ({ url: '/inpatient/transfers/', params }),
      providesTags: ['Transfer'],
    }),

    // --- observations ---
    getObservations: b.query<Paginated<NursingObservation>, { admission?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/inpatient/observations/', params }),
      providesTags: ['Observation'],
    }),
    createObservation: b.mutation<NursingObservation, Partial<NursingObservation>>({
      query: (body) => ({ url: '/inpatient/observations/', method: 'POST', body }),
      invalidatesTags: ['Observation', 'Admission'],
    }),

    // --- medication administrations ---
    getMedicationAdministrations: b.query<Paginated<MedicationAdministration>, { admission?: number | string; status?: string; page_size?: number }>({
      query: (params) => ({ url: '/inpatient/medication-administrations/', params }),
      providesTags: ['MedicationAdministration'],
    }),
    createMedicationAdministration: b.mutation<MedicationAdministration, Partial<MedicationAdministration>>({
      query: (body) => ({ url: '/inpatient/medication-administrations/', method: 'POST', body }),
      invalidatesTags: ['MedicationAdministration', 'Admission'],
    }),
    updateMedicationAdministration: b.mutation<MedicationAdministration, { id: number; body: Partial<MedicationAdministration> }>({
      query: ({ id, body }) => ({ url: `/inpatient/medication-administrations/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['MedicationAdministration'],
    }),

    // --- rounds ---
    getRounds: b.query<Paginated<DoctorRound>, { admission?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/inpatient/rounds/', params }),
      providesTags: ['Round'],
    }),
    createRound: b.mutation<DoctorRound, Partial<DoctorRound>>({
      query: (body) => ({ url: '/inpatient/rounds/', method: 'POST', body }),
      invalidatesTags: ['Round', 'Admission'],
    }),

    // --- care plans ---
    getCarePlans: b.query<Paginated<CarePlan>, { admission?: number | string; page_size?: number }>({
      query: (params) => ({ url: '/inpatient/care-plans/', params }),
      providesTags: ['CarePlan'],
    }),
    createCarePlan: b.mutation<CarePlan, Partial<CarePlan>>({
      query: (body) => ({ url: '/inpatient/care-plans/', method: 'POST', body }),
      invalidatesTags: ['CarePlan', 'Admission'],
    }),
    updateCarePlan: b.mutation<CarePlan, { id: number; body: Partial<CarePlan> }>({
      query: ({ id, body }) => ({ url: `/inpatient/care-plans/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['CarePlan'],
    }),

    // --- discharges ---
    getDischarges: b.query<Paginated<Discharge>, { page_size?: number; admission?: number | string }>({
      query: (params) => ({ url: '/inpatient/discharges/', params }),
      providesTags: ['Discharge'],
    }),
    createDischarge: b.mutation<Discharge, Partial<Discharge>>({
      query: (body) => ({ url: '/inpatient/discharges/', method: 'POST', body }),
      invalidatesTags: ['Discharge', 'Admission'],
    }),
    finalizeDischarge: b.mutation<Discharge, number>({
      query: (id) => ({ url: `/inpatient/discharges/${id}/finalize/`, method: 'POST' }),
      invalidatesTags: ['Discharge'],
    }),

    // --- stats ---
    getInpatientStats: b.query<InpatientStats, void>({
      query: () => '/inpatient/stats/',
      providesTags: ['Bed', 'Admission'],
    }),

    // --- cross-module lookups ---
    searchAdmissionPatients: b.query<Paginated<{ id: number; mrn: string; first_name: string; last_name: string; full_name?: string }>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
    getInpatientDepartments: b.query<Paginated<{ id: number; name: string }>, { page_size?: number }>({
      query: (params) => ({ url: '/organizations/departments/', params }),
    }),
    getInpatientMedications: b.query<Paginated<{ id: number; name: string; strength: string }>, { page_size?: number }>({
      query: (params) => ({ url: '/pharmacy/medications/', params }),
    }),
  }),
});

export const {
  useGetWardsQuery,
  useCreateWardMutation,
  useUpdateWardMutation,
  useGetWardRoomsQuery,
  useGetInpatientRoomsQuery,
  useCreateInpatientRoomMutation,
  useUpdateInpatientRoomMutation,
  useGetBedsQuery,
  useCreateBedMutation,
  useUpdateBedMutation,
  useAssignBedMutation,
  useFreeBedMutation,
  useMaintenanceBedMutation,
  useGetAdmissionsQuery,
  useGetAdmissionQuery,
  useCreateAdmissionMutation,
  useUpdateAdmissionMutation,
  useTransferAdmissionMutation,
  useDischargeAdmissionMutation,
  useGetTransfersQuery,
  useGetObservationsQuery,
  useCreateObservationMutation,
  useGetMedicationAdministrationsQuery,
  useCreateMedicationAdministrationMutation,
  useUpdateMedicationAdministrationMutation,
  useGetRoundsQuery,
  useCreateRoundMutation,
  useGetCarePlansQuery,
  useCreateCarePlanMutation,
  useUpdateCarePlanMutation,
  useGetDischargesQuery,
  useCreateDischargeMutation,
  useFinalizeDischargeMutation,
  useGetInpatientStatsQuery,
  useSearchAdmissionPatientsQuery,
  useGetInpatientDepartmentsQuery,
  useGetInpatientMedicationsQuery,
} = inpatientApi;
