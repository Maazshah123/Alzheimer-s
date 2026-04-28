import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

const baseSignup = {
  full_name: z.string().trim().min(2, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
  confirm: z.string(),
  agree: z.boolean().refine((v) => v === true, { message: "You must accept the terms" }),
};

export const doctorSignupSchema = z
  .object({
    ...baseSignup,
    specialization: z.string().trim().min(2, "Required").max(120),
    experience_years: z
      .number({ invalid_type_error: "Required" } as any)
      .int()
      .min(0)
      .max(80),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const patientSignupSchema = z
  .object({
    ...baseSignup,
    phone: z.string().trim().min(6).max(30).optional().or(z.literal("")),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const adminSignupSchema = z
  .object({
    ...baseSignup,
    invite_code: z.string().min(4, "Invite code required"),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export type DoctorSignupValues = z.infer<typeof doctorSignupSchema>;
export type PatientSignupValues = z.infer<typeof patientSignupSchema>;
export type AdminSignupValues = z.infer<typeof adminSignupSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
