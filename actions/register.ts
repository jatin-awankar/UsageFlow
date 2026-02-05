// app/actions/register.ts
"use server";

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { createUserSchema } from "@/lib/validators";
import { FormState } from "@/types";

export async function registerUser(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const data = Object.fromEntries(formData.entries());
  const validated = createUserSchema.safeParse(data);

  if (!validated.success) {
    // Standardize validation errors into the FormState structure
    return {
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const email = validated.data.email.toLowerCase().trim();
  const password = validated.data.password;


  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.data.email },
    });
    if (existingUser) {
      return {
        errors: { _form: ["Email already registered"] },
      };
    }
    const hashed = await hashPassword(password);
    await prisma.user.create({ data: { email, password: hashed } });
  } catch {
    return {
      errors: { _form: ["Something went wrong"] },
    };
  }

  redirect("/login");
}
