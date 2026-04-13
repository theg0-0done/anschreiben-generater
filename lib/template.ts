import type { FormData } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// COVER LETTER TEMPLATE
//
// To edit the body text, modify BODY_TEMPLATE below.
// Placeholders: {{jobTitle}}, {{salutation}}, {{subject}}, {{applicationDate}}
// The salutation and subject are computed automatically from the form data,
// but can be overridden via salutationOverride / subjectOverride fields.
// ─────────────────────────────────────────────────────────────────────────────

const BODY_TEMPLATE = `{{salutation}}

mit großem Interesse bewerbe ich mich um einen Ausbildungsplatz als {{jobTitle}} in {{companyName}}. {{customMotivation}}Ich bin überzeugt, dass ich mit meiner fachlichen Vorbereitung und meiner Motivation gut zu Ihrem Team passen würde.


Mein Deutschniveau habe ich durch das ÖSD-Zertifikat B2 nachgewiesen und baue es derzeit aktiv auf C1 aus, was mir eine solide Grundlage für die Kommunikation im Berufsalltag gibt. Parallel dazu habe ich meine technischen Kenntnisse durch anerkannte Online-Kurse der Harvard University erweitert: CS50x (Grundlagen der Informatik), CS50 Python und CS50 Web haben mir ein gutes Verständnis von Programmierkonzepten, Webentwicklung sowie Datenbanken mit SQL und SQLite vermittelt. In der Praxis arbeite ich außerdem regelmäßig mit JavaScript, Python, Node.js und Git.


Ergänzend dazu konnte ich durch zwei Praktika – bei SMOUY und bei CARGOTEC – erste Einblicke in reale Arbeitsumgebungen gewinnen und lernen, wie technische Lösungen im Unternehmenskontext eingesetzt werden. Diese Erfahrungen haben mich darin bestärkt, eine strukturierte Ausbildung in Deutschland anzustreben, um mein Wissen systematisch zu vertiefen.


Mein Abitur habe ich in Marokko im Bereich experimentelle Wissenschaften abgeschlossen. Ich bin bereit, für die Ausbildung nach Deutschland zu ziehen, und freue mich auf die Möglichkeit, in einem professionellen Umfeld zu lernen und zu wachsen.


Über eine Einladung zu einem Vorstellungsgespräch freue ich mich sehr. Weitere Informationen und Arbeitsproben finden Sie auf meinem Portfolio unter fatehsaid.com/de.


Mit freundlichen Grüßen

Said Fateh`;

/** Derive salutation from contact person field. */
function buildSalutation(salutation: string, contactPerson: string): string {
  if (!contactPerson.trim() || !salutation) return "Sehr geehrte Damen und Herren,";
  if (salutation === "Frau") {
    return `Sehr geehrte Frau ${contactPerson.trim()},`;
  }
  if (salutation === "Herr") {
    return `Sehr geehrter Herr ${contactPerson.trim()},`;
  }
  return "Sehr geehrte Damen und Herren,";
}

/** Derive subject line from job title. */
function buildSubject(jobTitle: string): string {
  return `Bewerbung um einen Ausbildungsplatz als ${jobTitle}`;
}

export interface FilledTemplate {
  /** Full letter body (salutation → sign-off) for PDF rendering */
  body: string;
  /** Subject line for the bold heading in the PDF */
  subject: string;
  /** Salutation line (first line of body, also stored separately for layout) */
  salutation: string;
}

/**
 * Fill the fixed template with data from the form.
 * No AI — pure string replacement.
 */
export function fillTemplate(data: FormData): FilledTemplate {
  const salutation = buildSalutation(data.contactSalutation ?? "", data.contactPerson ?? "");
  const subject = buildSubject(data.jobTitle);

  let customMotivation = "";
  if (data.companyFocus) {
    customMotivation += `Besonders Ihr Fokus auf ${data.companyFocus.trim()} hat mein Interesse geweckt. `;
  }
  if (data.companyTech) {
    let techText = data.companyTech.trim();
    if (techText && !/[.!?]$/.test(techText)) {
      techText += ".";
    }
    customMotivation += `Ihre Arbeit mit ${techText} `;
  }

  const body = BODY_TEMPLATE.replace("{{salutation}}", salutation)
    .replace(/\{\{jobTitle\}\}/g, data.jobTitle)
    .replace(/\{\{companyName\}\}/g, data.companyName || "Ihrem Unternehmen")
    .replace("{{customMotivation}}", customMotivation);

  return { body, subject, salutation };
}

/**
 * Build the recipient address block lines for the PDF.
 */
export function buildRecipientLines(data: FormData): string[] {
  const lines: string[] = [];
  lines.push(data.companyName);
  if (data.contactDepartmentOrRole?.trim()) lines.push(data.contactDepartmentOrRole);
  if (data.contactPerson?.trim()) {
    if (data.contactSalutation === "Herr") {
      lines.push(`Herrn ${data.contactPerson}`);
    } else if (data.contactSalutation === "Frau") {
      lines.push(`Frau ${data.contactPerson}`);
    } else {
      lines.push(data.contactPerson);
    }
  }
  if (data.companyStreet?.trim()) lines.push(data.companyStreet);
  if (data.companyZipCity?.trim()) lines.push(data.companyZipCity);
  return lines.filter(Boolean);
}
