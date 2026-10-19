import { baseApi } from '../../app/api/baseApi';
import type {
  AvailabilityResponse,
  DoctorRef,
  PortalAppointment,
  PortalDocument,
  PortalInvoice,
  PortalNotification,
  PortalPrescription,
  PortalResult,
  PortalSummary,
} from './types';

export const portalApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getPortalSummary: b.query<PortalSummary, void>({
      query: () => '/portal/summary/',
      providesTags: ['PortalSummary', 'PortalAppointment', 'PortalNotification', 'PortalInvoice'],
    }),
    getPortalAppointments: b.query<PortalAppointment[], void>({
      query: () => '/portal/appointments/',
      providesTags: ['PortalAppointment'],
    }),
    bookPortalAppointment: b.mutation<PortalAppointment, { doctor: number; start: string; end: string; type?: string; reason?: string }>({
      query: (body) => ({ url: '/portal/appointments/', method: 'POST', body }),
      invalidatesTags: ['PortalAppointment', 'PortalSummary'],
    }),
    cancelPortalAppointment: b.mutation<PortalAppointment, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/portal/appointments/${id}/cancel/`, method: 'POST', body: { reason: reason ?? '' } }),
      invalidatesTags: ['PortalAppointment', 'PortalSummary'],
    }),
    getPortalDoctors: b.query<DoctorRef[], void>({
      query: () => '/portal/doctors/',
    }),
    getPortalAvailability: b.query<AvailabilityResponse, { doctor: number; date: string }>({
      query: (params) => ({ url: '/portal/availability/', params }),
    }),
    getPortalPrescriptions: b.query<PortalPrescription[], void>({
      query: () => '/portal/prescriptions/',
      providesTags: ['PortalPrescription'],
    }),
    getPortalResults: b.query<PortalResult[], void>({
      query: () => '/portal/results/',
      providesTags: ['PortalResult'],
    }),
    getPortalInvoices: b.query<PortalInvoice[], void>({
      query: () => '/portal/invoices/',
      providesTags: ['PortalInvoice'],
    }),
    payPortalInvoice: b.mutation<PortalInvoice, { id: number; method?: string }>({
      query: ({ id, method }) => ({ url: `/portal/invoices/${id}/pay/`, method: 'POST', body: { method: method ?? 'ONLINE' } }),
      invalidatesTags: ['PortalInvoice', 'PortalSummary'],
    }),
    getPortalDocuments: b.query<PortalDocument[], void>({
      query: () => '/portal/documents/',
      providesTags: ['PortalDocument'],
    }),
    uploadPortalDocument: b.mutation<PortalDocument, { file: File; title?: string; notes?: string }>({
      query: ({ file, title, notes }) => {
        const form = new FormData();
        form.append('file', file);
        form.append('category', 'CONSENT');
        if (title) form.append('title', title);
        if (notes) form.append('notes', notes);
        return { url: '/portal/documents/', method: 'POST', body: form };
      },
      invalidatesTags: ['PortalDocument'],
    }),
    getPortalNotifications: b.query<PortalNotification[], void>({
      query: () => '/portal/notifications/',
      providesTags: ['PortalNotification'],
    }),
    markPortalNotificationRead: b.mutation<PortalNotification, number>({
      query: (id) => ({ url: `/notifications/${id}/`, method: 'PATCH', body: { is_read: true } }),
      invalidatesTags: ['PortalNotification', 'PortalSummary'],
    }),
    getPortalThreads: b.query<Array<{ id: number; title: string; participants: Array<{ id: number; first_name: string; last_name: string; email?: string }>; last_message_at: string | null; last_message?: { id: number; body: string; sender_name?: string; sent_at: string } | null }>, void>({
      query: () => '/portal/messages/',
      providesTags: ['PortalThread'],
    }),
    createPortalThread: b.mutation<{ id: number }, { title?: string; participants?: number[] }>({
      query: (body) => ({ url: '/portal/threads/', method: 'POST', body }),
      invalidatesTags: ['PortalThread'],
    }),
    getPortalThreadMessages: b.query<Array<{ id: number; thread: number; sender: number | { id: number; first_name: string; last_name: string }; body: string; attachment: string | null; sent_at: string }>, { threadId: number }>({
      query: ({ threadId }) => `/portal/threads/${threadId}/messages/`,
      providesTags: (_r, _e, arg) => [{ type: 'PortalMessage', threadId: arg.threadId }],
    }),
    sendPortalMessage: b.mutation<{ id: number }, { threadId: number; body: string }>({
      query: ({ threadId, body }) => ({ url: `/portal/threads/${threadId}/messages/`, method: 'POST', body: { body } }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'PortalMessage', threadId: arg.threadId }, 'PortalThread'],
    }),
  }),
});

export const {
  useGetPortalSummaryQuery,
  useGetPortalAppointmentsQuery,
  useBookPortalAppointmentMutation,
  useCancelPortalAppointmentMutation,
  useGetPortalDoctorsQuery,
  useGetPortalAvailabilityQuery,
  useGetPortalPrescriptionsQuery,
  useGetPortalResultsQuery,
  useGetPortalInvoicesQuery,
  usePayPortalInvoiceMutation,
  useGetPortalDocumentsQuery,
  useUploadPortalDocumentMutation,
  useGetPortalNotificationsQuery,
  useMarkPortalNotificationReadMutation,
  useGetPortalThreadsQuery,
  useCreatePortalThreadMutation,
  useGetPortalThreadMessagesQuery,
  useSendPortalMessageMutation,
} = portalApi;
