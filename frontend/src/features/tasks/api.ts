import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type { Task, TaskListParams, UserRef } from './types';

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getTasks: b.query<Paginated<Task>, TaskListParams>({
      query: (params) => ({ url: '/tasks/', params }),
      providesTags: ['Task'],
    }),
    getTask: b.query<Task, number>({
      query: (id) => `/tasks/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    createTask: b.mutation<Task, Partial<Task>>({
      query: (body) => ({ url: '/tasks/', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    updateTask: b.mutation<Task, { id: number; body: Partial<Task> }>({
      query: ({ id, body }) => ({ url: `/tasks/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Task'],
    }),
    deleteTask: b.mutation<void, number>({
      query: (id) => ({ url: `/tasks/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Task'],
    }),
    completeTask: b.mutation<Task, number>({
      query: (id) => ({ url: `/tasks/${id}/complete/`, method: 'POST' }),
      invalidatesTags: ['Task'],
    }),
    searchTaskUsers: b.query<Paginated<UserRef>, { search?: string; page_size?: number }>({
      query: (params) => ({ url: '/auth/users/', params }),
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCompleteTaskMutation,
  useLazySearchTaskUsersQuery,
} = tasksApi;
