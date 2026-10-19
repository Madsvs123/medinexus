import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { authSlice, clearTokens } from '@/features/auth/authSlice';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const TOKEN_STORAGE_KEY = 'medinexus-tokens';

export function readStoredTokens(): { access: string | null; refresh: string | null } {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw) as { access?: string; refresh?: string };
    return { access: parsed.access ?? null, refresh: parsed.refresh ?? null };
  } catch {
    return { access: null, refresh: null };
  }
}

export function storeTokens(access: string, refresh: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ access, refresh }));
  } catch {
    // storage unavailable — session continues without persistence
  }
}

export function clearStoredTokens(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function logoutAndRedirect(): void {
  clearStoredTokens();
  window.location.href = '/login';
}

interface RefreshResponse {
  access: string;
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken ?? readStoredTokens().refresh;
    if (refreshToken) {
      const refreshResult = await rawBaseQuery(
        {
          url: '/auth/refresh/',
          method: 'POST',
          body: { refresh: refreshToken },
        },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        const { access } = refreshResult.data as RefreshResponse;
        storeTokens(access, refreshToken);
        api.dispatch(
          authSlice.actions.setTokens({ accessToken: access, refreshToken }),
        );
        // Retry the original request with the fresh token.
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(clearTokens());
        logoutAndRedirect();
      }
    } else {
      api.dispatch(clearTokens());
      logoutAndRedirect();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'Organization',
    'Branch',
    'Department',
    'Specialty',
    'Notifications',
    'Patients',
    'Patient',
    'PatientAllergy',
    'PatientCondition',
    'PatientContact',
    'PatientConsent',
    'PatientDocument',
    'PatientInsurance',
    'Appointments',
    'Appointment',
    'Availability',
    'Queue',
    'RecurringRule',
    'Room',
    'Clinical',
    'Encounter',
    'Vital',
    'Diagnosis',
    'Note',
    'TreatmentPlan',
    'Prescription',
    'Procedure',
    'Referral',
    'FollowUp',
    'DischargeSummary',
    'EncounterLabOrder',
    'EncounterRadiologyOrder',
    'Inpatient',
    'Admission',
    'Ward',
    'Bed',
    'Transfer',
    'Observation',
    'MedicationAdministration',
    'Round',
    'CarePlan',
    'Discharge',
    'Pharmacy',
    'Medication',
    'MedicationBatch',
    'Batch',
    'DrugInteraction',
    'Interaction',
    'Supplier',
    'Dispensation',
    'StockTransfer',
    'StockReturn',
    'Laboratory',
    'WorkQueue',
    'LabTest',
    'LabOrder',
    'LabSample',
    'LabResult',
    'LabReport',
    'Radiology',
    'RadiologyOrder',
    'RadiologyReport',
    'Billing',
    'Invoice',
    'Payment',
    'Refund',
    'Deposit',
    'InsurancePlan',
    'Service',
    'Claim',
    'Dashboard',
    'Messages',
    'Thread',
    'Tasks',
    'Task',
    'Documents',
    'Document',
    'Forms',
    'FormTemplate',
    'FormSubmission',
    'Reports',
    'Search',
    'Configuration',
    'Settings',
    'ImportJob',
    'Audit',
    'AuditLog',
    'Portal',
    'PortalSummary',
    'PortalAppointment',
    'PortalPrescription',
    'PortalResult',
    'PortalInvoice',
    'PortalDocument',
    'PortalNotification',
    'PortalMessage',
    'PortalThread',
    'GeneratedReport',
  ],
  endpoints: () => ({}),
});
