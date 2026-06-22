import { z } from "zod";

export const FormDataSchema = z.object({
  branch: z.enum(["informatik", "gastronomie"]),
  // Required
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  jobTitle: z.string().min(1, "Stellenbezeichnung ist erforderlich"),

  // Optional company address
  companyStreet: z.string().optional().default(""),
  companyZipCity: z.string().optional().default(""),

  // Optional contact info
  contactPerson: z.string().optional().default(""),
  contactSalutation: z.enum(["", "Herr", "Frau"]).optional().default(""),
  contactDepartmentOrRole: z.string().optional().default(""),

  // Optional motivation fields
  companyFocus: z.string().optional().default(""),
  companyTech: z.string().optional().default(""),

  // Gastronomy specific
  department: z.string().optional().default(""),

  // Optional location
  city: z.string().optional().default(""),

  // Custom AI text fields
  customHook: z.string().optional(),
  coverLetterTemplate: z.string().optional(),
  resumeBase64: z.string().optional(),

  // Inline hook generation fields (sent by dashboard for merged request)
  companyInfo: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),

  // Output mode and placement
  mode: z.enum(["cover-letter", "full-resume"]),
  coverLetterPageNumber: z.number().int().min(1).optional().default(1),
});

export type FormData = z.infer<typeof FormDataSchema>;
