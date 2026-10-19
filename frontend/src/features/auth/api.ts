import { baseApi } from '@/app/api/baseApi';
import type { LoginResponse, User } from '@/types/api';

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResetPasswordPayload {
  email: string;
}

export interface ConfirmResetPayload {
  token: string;
  new_password: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface AcceptInvitationPayload {
  token: string;
  first_name: string;
  last_name: string;
  password: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login/',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    register: build.mutation<User, RegisterPayload>({
      query: (payload) => ({
        url: '/auth/register/',
        method: 'POST',
        body: payload,
      }),
    }),
    verifyEmail: build.mutation<User, VerifyEmailPayload>({
      query: (payload) => ({
        url: '/auth/verify-email/',
        method: 'POST',
        body: payload,
      }),
    }),
    resendVerification: build.mutation<{ detail: string }, { email: string }>({
      query: (payload) => ({
        url: '/auth/resend-verification/',
        method: 'POST',
        body: payload,
      }),
    }),
    passwordReset: build.mutation<{ detail: string }, ResetPasswordPayload>({
      query: (payload) => ({
        url: '/auth/password-reset/',
        method: 'POST',
        body: payload,
      }),
    }),
    confirmReset: build.mutation<{ detail: string }, ConfirmResetPayload>({
      query: (payload) => ({
        url: '/auth/password-reset/confirm/',
        method: 'POST',
        body: payload,
      }),
    }),
    changePassword: build.mutation<{ detail: string }, ChangePasswordPayload>({
      query: (payload) => ({
        url: '/auth/change-password/',
        method: 'POST',
        body: payload,
      }),
    }),
    acceptInvitation: build.mutation<LoginResponse, AcceptInvitationPayload>({
      query: (payload) => ({
        url: '/auth/invitations/accept/',
        method: 'POST',
        body: payload,
      }),
    }),
    getMe: build.query<User, void>({
      query: () => ({ url: '/auth/me/' }),
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  usePasswordResetMutation,
  useConfirmResetMutation,
  useChangePasswordMutation,
  useAcceptInvitationMutation,
  useGetMeQuery,
} = authApi;
