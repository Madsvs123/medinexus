import { baseApi } from '../../app/api/baseApi';
import type {
  AdminDashboard,
  AnalyticsParams,
  AppointmentsAnalytics,
  DoctorDashboard,
  ReceptionistDashboard,
  RevenueAnalytics,
} from './types';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAdminDashboard: b.query<AdminDashboard, void>({
      query: () => '/reports/dashboards/admin/',
    }),
    getDoctorDashboard: b.query<DoctorDashboard, void>({
      query: () => '/reports/dashboards/doctor/',
    }),
    getReceptionistDashboard: b.query<ReceptionistDashboard, void>({
      query: () => '/reports/dashboards/receptionist/',
    }),
    getDashboardAppointmentsAnalytics: b.query<AppointmentsAnalytics, AnalyticsParams>({
      query: (params) => ({ url: '/reports/analytics/appointments/', params }),
    }),
    getDashboardRevenueAnalytics: b.query<RevenueAnalytics, AnalyticsParams>({
      query: (params) => ({ url: '/reports/analytics/revenue/', params }),
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetDoctorDashboardQuery,
  useGetReceptionistDashboardQuery,
  useGetDashboardAppointmentsAnalyticsQuery,
  useGetDashboardRevenueAnalyticsQuery,
} = dashboardApi;
