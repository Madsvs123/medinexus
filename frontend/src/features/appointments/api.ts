import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  Appointment,
  AppointmentListParams,
  AppointmentQueueEntry,
  Availability,
  AvailabilitySlots,
  DepartmentRef,
  DoctorRef,
  QueueEntry,
  RecurringRule,
  Room,
} from './types';

export const appointmentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- appointments ---
    getAppointments: b.query<Paginated<Appointment>, AppointmentListParams>({
      query: (params) => ({ url: '/appointments/', params }),
      providesTags: ['Appointment'],
    }),
    getAppointment: b.query<Appointment, number>({
      query: (id) => `/appointments/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Appointment', id }],
    }),
    createAppointment: b.mutation<Appointment, Partial<Appointment>>({
      query: (body) => ({ url: '/appointments/', method: 'POST', body }),
      invalidatesTags: ['Appointment', 'Availability', 'Queue'],
    }),
    updateAppointment: b.mutation<Appointment, { id: number; body: Partial<Appointment> }>({
      query: ({ id, body }) => ({ url: `/appointments/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Appointment', id }],
    }),
    deleteAppointment: b.mutation<void, number>({
      query: (id) => ({ url: `/appointments/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Appointment', 'Queue'],
    }),
    confirmAppointment: b.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/confirm/`, method: 'POST' }),
      invalidatesTags: ['Appointment'],
    }),
    checkinAppointment: b.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/checkin/`, method: 'POST' }),
      invalidatesTags: ['Appointment', 'Queue'],
    }),
    startAppointment: b.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/start/`, method: 'POST' }),
      invalidatesTags: ['Appointment', 'Queue'],
    }),
    completeAppointment: b.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/complete/`, method: 'POST' }),
      invalidatesTags: ['Appointment', 'Queue'],
    }),
    noshowAppointment: b.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/noshow/`, method: 'POST' }),
      invalidatesTags: ['Appointment', 'Queue'],
    }),
    cancelAppointment: b.mutation<Appointment, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/appointments/${id}/cancel/`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Appointment', 'Queue'],
    }),

    // --- availability ---
    getAvailabilities: b.query<Paginated<Availability>, { page_size?: number; doctor?: number | string }>({
      query: (params) => ({ url: '/appointments/availability/', params }),
      providesTags: ['Availability'],
    }),
    getAvailabilitySlots: b.query<AvailabilitySlots, { doctor?: number | string; date?: string }>({
      query: (params) => ({ url: '/appointments/availability/', params }),
      providesTags: ['Availability'],
    }),
    createAvailability: b.mutation<Availability, Partial<Availability>>({
      query: (body) => ({ url: '/appointments/availability/', method: 'POST', body }),
      invalidatesTags: ['Availability'],
    }),
    updateAvailability: b.mutation<Availability, { id: number; body: Partial<Availability> }>({
      query: ({ id, body }) => ({ url: `/appointments/availability/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Availability'],
    }),
    deleteAvailability: b.mutation<void, number>({
      query: (id) => ({ url: `/appointments/availability/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Availability'],
    }),

    // --- rooms ---
    getRooms: b.query<Paginated<Room>, { page_size?: number; status?: string }>({
      query: (params) => ({ url: '/appointments/rooms/', params }),
      providesTags: ['Room'],
    }),
    createRoom: b.mutation<Room, Partial<Room>>({
      query: (body) => ({ url: '/appointments/rooms/', method: 'POST', body }),
      invalidatesTags: ['Room'],
    }),
    updateRoom: b.mutation<Room, { id: number; body: Partial<Room> }>({
      query: ({ id, body }) => ({ url: `/appointments/rooms/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Room'],
    }),

    // --- recurring rules ---
    getRecurringRules: b.query<Paginated<RecurringRule>, { page_size?: number; patient?: number | string }>({
      query: (params) => ({ url: '/appointments/recurring/', params }),
      providesTags: ['RecurringRule'],
    }),
    createRecurringRule: b.mutation<RecurringRule, Partial<RecurringRule>>({
      query: (body) => ({ url: '/appointments/recurring/', method: 'POST', body }),
      invalidatesTags: ['RecurringRule', 'Appointment'],
    }),
    updateRecurringRule: b.mutation<RecurringRule, { id: number; body: Partial<RecurringRule> }>({
      query: ({ id, body }) => ({ url: `/appointments/recurring/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['RecurringRule'],
    }),
    deleteRecurringRule: b.mutation<void, number>({
      query: (id) => ({ url: `/appointments/recurring/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['RecurringRule', 'Appointment'],
    }),

    // --- queue ---
    getQueue: b.query<QueueEntry[], { department?: number | string; date?: string }>({
      query: (params) => ({ url: '/appointments/queue/', params }),
      providesTags: ['Queue'],
    }),
    callNextInQueue: b.mutation<AppointmentQueueEntry, number>({
      query: (id) => ({ url: `/appointments/queue/${id}/next/`, method: 'POST' }),
      invalidatesTags: ['Queue', 'Appointment'],
    }),

    // --- cross-module lookups for booking forms ---
    searchAppointmentDoctors: b.query<Paginated<DoctorRef>, { role?: string; search?: string; page_size?: number }>({
      query: (params) => ({ url: '/auth/users/', params }),
    }),
    getAppointmentDepartments: b.query<Paginated<DepartmentRef>, { page_size?: number }>({
      query: (params) => ({ url: '/organizations/departments/', params }),
    }),
    searchAppointmentPatients: b.query<Paginated<{ id: number; mrn: string; first_name: string; last_name: string; full_name?: string }>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
  }),
});

export const {
  useGetAppointmentsQuery,
  useGetAppointmentQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useConfirmAppointmentMutation,
  useCheckinAppointmentMutation,
  useStartAppointmentMutation,
  useCompleteAppointmentMutation,
  useNoshowAppointmentMutation,
  useCancelAppointmentMutation,
  useGetAvailabilitiesQuery,
  useGetAvailabilitySlotsQuery,
  useCreateAvailabilityMutation,
  useUpdateAvailabilityMutation,
  useDeleteAvailabilityMutation,
  useGetRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useGetRecurringRulesQuery,
  useCreateRecurringRuleMutation,
  useUpdateRecurringRuleMutation,
  useDeleteRecurringRuleMutation,
  useGetQueueQuery,
  useCallNextInQueueMutation,
  useSearchAppointmentDoctorsQuery,
  useGetAppointmentDepartmentsQuery,
  useSearchAppointmentPatientsQuery,
} = appointmentsApi;
