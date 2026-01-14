// @/lib/types.ts
export type FormState = {
    errors?: {
      email?: string[];
      password?: string[];
      _form?: string[]; // Generic form errors like "Email already exists"
    };
    message?: string;
  };
  