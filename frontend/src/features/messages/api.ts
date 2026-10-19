import { baseApi } from '../../app/api/baseApi';
import type { Paginated } from '../../types/api';
import type { ChatMessage, Thread, UserRef } from './types';

export const messagesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getThreads: b.query<Paginated<Thread>, { page?: number; page_size?: number }>({
      query: (params) => ({ url: '/messages/threads/', params }),
      providesTags: ['Thread'],
    }),
    getThread: b.query<Thread, number>({
      query: (id) => `/messages/threads/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Thread', id }],
    }),
    createThread: b.mutation<Thread, { title?: string; participants: number[] }>({
      query: (body) => ({ url: '/messages/threads/', method: 'POST', body }),
      invalidatesTags: ['Thread'],
    }),
    getMessages: b.query<Paginated<ChatMessage>, { threadId: number; before?: string; page_size?: number }>({
      query: ({ threadId, ...params }) => ({ url: `/messages/threads/${threadId}/messages/`, params }),
      providesTags: ['Messages'],
    }),
    sendMessage: b.mutation<ChatMessage, { threadId: number; body: string; attachment?: File | null }>({
      query: ({ threadId, body, attachment }) => {
        const form = new FormData();
        form.append('body', body);
        if (attachment) form.append('attachment', attachment);
        return { url: `/messages/threads/${threadId}/messages/`, method: 'POST', body: form };
      },
      invalidatesTags: ['Messages', 'Thread'],
    }),
    markThreadRead: b.mutation<void, number>({
      query: (id) => ({ url: `/messages/threads/${id}/read/`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Thread', id }],
    }),
    searchStaffUsers: b.query<Paginated<UserRef>, { role?: string; search?: string; page_size?: number }>({
      query: (params) => ({ url: '/auth/users/', params }),
    }),
  }),
});

export const {
  useGetThreadsQuery,
  useGetThreadQuery,
  useCreateThreadMutation,
  useGetMessagesQuery,
  useLazyGetMessagesQuery,
  useSendMessageMutation,
  useMarkThreadReadMutation,
  useLazySearchStaffUsersQuery,
} = messagesApi;
