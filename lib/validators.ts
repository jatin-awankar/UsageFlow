import { z } from "zod";

export const createOrganizationSchema = z.object({
    name: z
        .string()
        .min(3, "Organization name must be at least 3 characters")
        .max(100, "Organization name too long")
})