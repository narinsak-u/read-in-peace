import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Please enter a password')
    .min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(1, 'Please enter your name'),
});

export type SignInData = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;

export function validateSignIn(data: SignInData): string | null {
  const result = signInSchema.safeParse(data);
  return result.success ? null : result.error.issues[0].message;
}

export function validateSignUp(data: SignUpData): string | null {
  const result = signUpSchema.safeParse(data);
  return result.success ? null : result.error.issues[0].message;
}
