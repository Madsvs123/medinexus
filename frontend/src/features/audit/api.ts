import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type { AuditLog, AuditLogParams } from './types';

export const auditApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAuditLogs: b.query<Paginated<AuditLog>, AuditLogParams>({
      query: (params) => ({ url: '/audit/logs/', params }),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;
