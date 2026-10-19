import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  BillingStats,
  ClaimListParams,
  ClaimStatus,
  Deposit,
  InsuranceClaim,
  InsurancePlan,
  Invoice,
  InvoiceItem,
  InvoiceListParams,
  PatientInsurance,
  Payment,
  PaymentListParams,
  Refund,
  Service,
} from './types';

export const billingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- services ---
    getServices: b.query<Paginated<Service>, { page_size?: number; active?: boolean }>({
      query: (params) => ({ url: '/billing/services/', params }),
      providesTags: ['Service'],
    }),
    createService: b.mutation<Service, Partial<Service>>({
      query: (body) => ({ url: '/billing/services/', method: 'POST', body }),
      invalidatesTags: ['Service'],
    }),
    updateService: b.mutation<Service, { id: number; body: Partial<Service> }>({
      query: ({ id, body }) => ({ url: `/billing/services/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Service'],
    }),

    // --- invoices ---
    getInvoices: b.query<Paginated<Invoice>, InvoiceListParams>({
      query: (params) => ({ url: '/billing/invoices/', params }),
      providesTags: ['Invoice'],
    }),
    getInvoice: b.query<Invoice, number>({
      query: (id) => `/billing/invoices/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Invoice', id }],
    }),
    createInvoice: b.mutation<Invoice, Partial<Invoice>>({
      query: (body) => ({ url: '/billing/invoices/', method: 'POST', body }),
      invalidatesTags: ['Invoice'],
    }),
    updateInvoice: b.mutation<Invoice, { id: number; body: Partial<Invoice> }>({
      query: ({ id, body }) => ({ url: `/billing/invoices/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Invoice'],
    }),
    issueInvoice: b.mutation<Invoice, number>({
      query: (id) => ({ url: `/billing/invoices/${id}/issue/`, method: 'POST' }),
      invalidatesTags: ['Invoice'],
    }),
    voidInvoice: b.mutation<Invoice, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/billing/invoices/${id}/void/`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Invoice'],
    }),
    payInvoice: b.mutation<Invoice, { id: number; amount: number; method: string; reference?: string; deposit_id?: number }>({
      query: ({ id, ...body }) => ({ url: `/billing/invoices/${id}/pay/`, method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Payment', 'Deposit'],
    }),
    addInvoiceItem: b.mutation<Invoice, { id: number; body: Partial<InvoiceItem> }>({
      query: ({ id, body }) => ({ url: `/billing/invoices/${id}/add-item/`, method: 'POST', body }),
      invalidatesTags: ['Invoice'],
    }),

    // --- payments ---
    getPayments: b.query<Paginated<Payment>, PaymentListParams>({
      query: (params) => ({ url: '/billing/payments/', params }),
      providesTags: ['Payment'],
    }),
    createPayment: b.mutation<Payment, Partial<Payment>>({
      query: (body) => ({ url: '/billing/payments/', method: 'POST', body }),
      invalidatesTags: ['Payment', 'Invoice'],
    }),
    refundPayment: b.mutation<Refund, { id: number; amount: number; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/billing/payments/${id}/refund/`, method: 'POST', body }),
      invalidatesTags: ['Refund', 'Payment', 'Invoice'],
    }),

    // --- refunds ---
    getRefunds: b.query<Paginated<Refund>, { page?: number; page_size?: number; status?: string }>({
      query: (params) => ({ url: '/billing/refunds/', params }),
      providesTags: ['Refund'],
    }),
    createRefund: b.mutation<Refund, Partial<Refund>>({
      query: (body) => ({ url: '/billing/refunds/', method: 'POST', body }),
      invalidatesTags: ['Refund'],
    }),
    processRefund: b.mutation<Refund, { id: number; approved: boolean }>({
      query: ({ id, approved }) => ({ url: `/billing/refunds/${id}/process/`, method: 'POST', body: { approved } }),
      invalidatesTags: ['Refund', 'Payment', 'Invoice'],
    }),

    // --- deposits ---
    getDeposits: b.query<Paginated<Deposit>, { page?: number; page_size?: number; patient?: number | string }>({
      query: (params) => ({ url: '/billing/deposits/', params }),
      providesTags: ['Deposit'],
    }),
    createDeposit: b.mutation<Deposit, Partial<Deposit>>({
      query: (body) => ({ url: '/billing/deposits/', method: 'POST', body }),
      invalidatesTags: ['Deposit'],
    }),
    applyDeposit: b.mutation<Deposit, { id: number; invoice_id: number; amount: number }>({
      query: ({ id, ...body }) => ({ url: `/billing/deposits/${id}/apply/`, method: 'POST', body }),
      invalidatesTags: ['Deposit', 'Invoice', 'Payment'],
    }),

    // --- insurance plans ---
    getInsurancePlans: b.query<Paginated<InsurancePlan>, { page?: number; page_size?: number; active?: boolean }>({
      query: (params) => ({ url: '/billing/insurance-plans/', params }),
      providesTags: ['InsurancePlan'],
    }),
    createInsurancePlan: b.mutation<InsurancePlan, Partial<InsurancePlan>>({
      query: (body) => ({ url: '/billing/insurance-plans/', method: 'POST', body }),
      invalidatesTags: ['InsurancePlan'],
    }),
    updateInsurancePlan: b.mutation<InsurancePlan, { id: number; body: Partial<InsurancePlan> }>({
      query: ({ id, body }) => ({ url: `/billing/insurance-plans/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['InsurancePlan'],
    }),

    // --- patient insurance ---
    getPatientInsurances: b.query<Paginated<PatientInsurance>, { page?: number; page_size?: number; patient?: number | string }>({
      query: (params) => ({ url: '/billing/patient-insurance/', params }),
      providesTags: ['PatientInsurance'],
    }),
    createPatientInsurance: b.mutation<PatientInsurance, Partial<PatientInsurance>>({
      query: (body) => ({ url: '/billing/patient-insurance/', method: 'POST', body }),
      invalidatesTags: ['PatientInsurance'],
    }),
    updatePatientInsurance: b.mutation<PatientInsurance, { id: number; body: Partial<PatientInsurance> }>({
      query: ({ id, body }) => ({ url: `/billing/patient-insurance/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['PatientInsurance'],
    }),
    deletePatientInsurance: b.mutation<void, number>({
      query: (id) => ({ url: `/billing/patient-insurance/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PatientInsurance'],
    }),

    // --- claims ---
    getClaims: b.query<Paginated<InsuranceClaim>, ClaimListParams>({
      query: (params) => ({ url: '/billing/claims/', params }),
      providesTags: ['Claim'],
    }),
    createClaim: b.mutation<InsuranceClaim, Partial<InsuranceClaim>>({
      query: (body) => ({ url: '/billing/claims/', method: 'POST', body }),
      invalidatesTags: ['Claim'],
    }),
    updateClaim: b.mutation<InsuranceClaim, { id: number; body: Partial<InsuranceClaim> }>({
      query: ({ id, body }) => ({ url: `/billing/claims/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Claim'],
    }),
    submitClaim: b.mutation<InsuranceClaim, number>({
      query: (id) => ({ url: `/billing/claims/${id}/submit/`, method: 'POST' }),
      invalidatesTags: ['Claim'],
    }),
    approveClaim: b.mutation<InsuranceClaim, { id: number; approved_amount: number }>({
      query: ({ id, approved_amount }) => ({ url: `/billing/claims/${id}/approve/`, method: 'POST', body: { approved_amount } }),
      invalidatesTags: ['Claim'],
    }),
    rejectClaim: b.mutation<InsuranceClaim, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/billing/claims/${id}/reject/`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Claim'],
    }),
    resubmitClaim: b.mutation<InsuranceClaim, number>({
      query: (id) => ({ url: `/billing/claims/${id}/resubmit/`, method: 'POST' }),
      invalidatesTags: ['Claim'],
    }),
    markClaimPaid: b.mutation<InsuranceClaim, number>({
      query: (id) => ({ url: `/billing/claims/${id}/mark-paid/`, method: 'POST' }),
      invalidatesTags: ['Claim', 'Invoice'],
    }),

    // --- stats ---
    getBillingStats: b.query<BillingStats, void>({
      query: () => '/billing/stats/',
      providesTags: ['Invoice', 'Payment', 'Claim'],
    }),

    // --- patient search helper (billing-scoped name to avoid clashes with patients feature) ---
    searchBillingPatients: b.query<Paginated<{ id: number; mrn: string; first_name: string; last_name: string; full_name?: string }>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
  }),
});

export const {
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useIssueInvoiceMutation,
  useVoidInvoiceMutation,
  usePayInvoiceMutation,
  useAddInvoiceItemMutation,
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useRefundPaymentMutation,
  useGetRefundsQuery,
  useCreateRefundMutation,
  useProcessRefundMutation,
  useGetDepositsQuery,
  useCreateDepositMutation,
  useApplyDepositMutation,
  useGetInsurancePlansQuery,
  useCreateInsurancePlanMutation,
  useUpdateInsurancePlanMutation,
  useGetPatientInsurancesQuery,
  useCreatePatientInsuranceMutation,
  useUpdatePatientInsuranceMutation,
  useDeletePatientInsuranceMutation,
  useGetClaimsQuery,
  useCreateClaimMutation,
  useUpdateClaimMutation,
  useSubmitClaimMutation,
  useApproveClaimMutation,
  useRejectClaimMutation,
  useResubmitClaimMutation,
  useMarkClaimPaidMutation,
  useGetBillingStatsQuery,
  useSearchBillingPatientsQuery,
  useLazySearchBillingPatientsQuery,
} = billingApi;

export type { ClaimStatus };
