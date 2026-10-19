import { z } from 'zod';

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number')
  .or(z.literal(''))
  .or(z.literal(null))
  .optional();

export const optionalString = z.string().trim().optional();

export const fullNameSchema = z
  .string({ required_error: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name must be at most 120 characters');

export function passwordsMatchSchema(field: string = 'password') {
  return z
    .object({
      [field]: passwordSchema,
      confirm_password: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data[field as keyof typeof data] === data.confirm_password, {
      message: 'Passwords do not match',
      path: ['confirm_password'],
    });
}

export const requiredText = (label: string) =>
  z.string({ required_error: `${label} is required` }).min(1, `${label} is required`);

export const positiveNumber = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .positive(`${label} must be greater than zero`);

export const nonNegativeNumber = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`);
