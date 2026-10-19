import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type {
  BranchRef,
  Dispensation,
  DispensationItem,
  DrugInteraction,
  Medication,
  MedicationBatch,
  PatientLite,
  PrescriptionLite,
  StockAlerts,
  StockReturn,
  StockTransfer,
  Supplier,
} from './types';

export const pharmacyApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // --- medications ---
    getMedications: b.query<Paginated<Medication>, { page?: number; page_size?: number; search?: string; category?: string; low_stock?: boolean }>({
      query: (params) => ({ url: '/pharmacy/medications/', params }),
      providesTags: ['Medication'],
    }),
    getMedication: b.query<Medication, number>({
      query: (id) => `/pharmacy/medications/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Medication', id }],
    }),
    createMedication: b.mutation<Medication, Partial<Medication>>({
      query: (body) => ({ url: '/pharmacy/medications/', method: 'POST', body }),
      invalidatesTags: ['Medication'],
    }),
    updateMedication: b.mutation<Medication, { id: number; body: Partial<Medication> }>({
      query: ({ id, body }) => ({ url: `/pharmacy/medications/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Medication', id }],
    }),
    deleteMedication: b.mutation<void, number>({
      query: (id) => ({ url: `/pharmacy/medications/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Medication'],
    }),
    stockAdjust: b.mutation<Medication, { id: number; quantity: number; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/pharmacy/medications/${id}/stock-adjust/`, method: 'POST', body }),
      invalidatesTags: ['Medication', 'Batch'],
    }),

    // --- interactions ---
    getInteractions: b.query<Paginated<DrugInteraction>, { page_size?: number }>({
      query: (params) => ({ url: '/pharmacy/interactions/', params }),
      providesTags: ['Interaction'],
    }),
    createInteraction: b.mutation<DrugInteraction, Partial<DrugInteraction>>({
      query: (body) => ({ url: '/pharmacy/interactions/', method: 'POST', body }),
      invalidatesTags: ['Interaction'],
    }),
    updateInteraction: b.mutation<DrugInteraction, { id: number; body: Partial<DrugInteraction> }>({
      query: ({ id, body }) => ({ url: `/pharmacy/interactions/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Interaction'],
    }),
    deleteInteraction: b.mutation<void, number>({
      query: (id) => ({ url: `/pharmacy/interactions/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Interaction'],
    }),

    // --- suppliers ---
    getSuppliers: b.query<Paginated<Supplier>, { page_size?: number; is_active?: boolean }>({
      query: (params) => ({ url: '/pharmacy/suppliers/', params }),
      providesTags: ['Supplier'],
    }),
    createSupplier: b.mutation<Supplier, Partial<Supplier>>({
      query: (body) => ({ url: '/pharmacy/suppliers/', method: 'POST', body }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: b.mutation<Supplier, { id: number; body: Partial<Supplier> }>({
      query: ({ id, body }) => ({ url: `/pharmacy/suppliers/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Supplier'],
    }),

    // --- batches ---
    getBatches: b.query<Paginated<MedicationBatch>, { page?: number; page_size?: number; medication?: number | string; expiring_soon?: boolean; expired?: boolean }>({
      query: (params) => ({ url: '/pharmacy/batches/', params }),
      providesTags: ['Batch'],
    }),
    createBatch: b.mutation<MedicationBatch, Partial<MedicationBatch>>({
      query: (body) => ({ url: '/pharmacy/batches/', method: 'POST', body }),
      invalidatesTags: ['Batch', 'Medication'],
    }),
    updateBatch: b.mutation<MedicationBatch, { id: number; body: Partial<MedicationBatch> }>({
      query: ({ id, body }) => ({ url: `/pharmacy/batches/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Batch'],
    }),

    // --- dispensations ---
    getDispensations: b.query<Paginated<Dispensation>, { page?: number; page_size?: number; prescription?: number | string; patient?: number | string }>({
      query: (params) => ({ url: '/pharmacy/dispensations/', params }),
      providesTags: ['Dispensation', 'Medication', 'Batch'],
    }),
    getDispensation: b.query<Dispensation, number>({
      query: (id) => `/pharmacy/dispensations/${id}/`,
      providesTags: ['Dispensation'],
    }),
    createDispensation: b.mutation<Dispensation, { prescription_id: number; items: DispensationItem[]; notes?: string }>({
      query: (body) => ({ url: '/pharmacy/dispensations/', method: 'POST', body }),
      invalidatesTags: ['Dispensation', 'Medication', 'Batch', 'Prescription'],
    }),

    // --- transfers ---
    getTransfers: b.query<Paginated<StockTransfer>, { page?: number; page_size?: number; status?: string }>({
      query: (params) => ({ url: '/pharmacy/transfers/', params }),
      providesTags: ['Transfer'],
    }),
    createTransfer: b.mutation<StockTransfer, Partial<StockTransfer>>({
      query: (body) => ({ url: '/pharmacy/transfers/', method: 'POST', body }),
      invalidatesTags: ['Transfer'],
    }),
    completeTransfer: b.mutation<StockTransfer, number>({
      query: (id) => ({ url: `/pharmacy/transfers/${id}/complete/`, method: 'POST' }),
      invalidatesTags: ['Transfer', 'Batch', 'Medication'],
    }),
    cancelTransfer: b.mutation<StockTransfer, number>({
      query: (id) => ({ url: `/pharmacy/transfers/${id}/cancel/`, method: 'POST' }),
      invalidatesTags: ['Transfer'],
    }),

    // --- returns ---
    getReturns: b.query<Paginated<StockReturn>, { page?: number; page_size?: number; batch?: number | string }>({
      query: (params) => ({ url: '/pharmacy/returns/', params }),
      providesTags: ['StockReturn'],
    }),
    createReturn: b.mutation<StockReturn, Partial<StockReturn>>({
      query: (body) => ({ url: '/pharmacy/returns/', method: 'POST', body }),
      invalidatesTags: ['StockReturn', 'Batch', 'Medication'],
    }),
    updateReturn: b.mutation<StockReturn, { id: number; body: Partial<StockReturn> }>({
      query: ({ id, body }) => ({ url: `/pharmacy/returns/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['StockReturn'],
    }),

    // --- alerts ---
    getStockAlerts: b.query<StockAlerts, void>({
      query: () => '/pharmacy/alerts/',
      providesTags: ['Medication', 'Batch'],
    }),

    // --- cross-module lookups ---
    searchPharmacyPatients: b.query<Paginated<PatientLite>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/patients/', params }),
    }),
    getPrescriptionsForDispense: b.query<Paginated<PrescriptionLite>, { patient?: number | string; status?: string; page_size?: number }>({
      query: (params) => ({ url: '/prescriptions/', params }),
      providesTags: ['Prescription'],
    }),
    getPharmacyBranches: b.query<Paginated<BranchRef>, { page_size?: number }>({
      query: (params) => ({ url: '/organizations/branches/', params }),
    }),
  }),
});

export const {
  useGetMedicationsQuery,
  useGetMedicationQuery,
  useCreateMedicationMutation,
  useUpdateMedicationMutation,
  useDeleteMedicationMutation,
  useStockAdjustMutation,
  useGetInteractionsQuery,
  useCreateInteractionMutation,
  useUpdateInteractionMutation,
  useDeleteInteractionMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useGetBatchesQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useGetDispensationsQuery,
  useGetDispensationQuery,
  useCreateDispensationMutation,
  useGetTransfersQuery,
  useCreateTransferMutation,
  useCompleteTransferMutation,
  useCancelTransferMutation,
  useGetReturnsQuery,
  useCreateReturnMutation,
  useUpdateReturnMutation,
  useGetStockAlertsQuery,
  useSearchPharmacyPatientsQuery,
  useGetPrescriptionsForDispenseQuery,
  useGetPharmacyBranchesQuery,
} = pharmacyApi;
