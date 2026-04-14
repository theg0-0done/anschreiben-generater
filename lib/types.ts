import { z } from "zod";

export const FormDataSchema = z.object({
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
  companyEmail: z.string().optional().default(""),
  companyPhone: z.string().optional().default(""),

  // Optional motivation fields
  companyFocus: z.string().optional().default(""),
  companyTech: z.string().optional().default(""),

  // Optional job info
  ausbildungStart: z.string().optional().default(""),

  // Optional location
  city: z.string().optional().default(""),


  // Output mode
  mode: z.enum(["cover-letter", "full-resume"]),
});

export type FormData = z.infer<typeof FormDataSchema>;
