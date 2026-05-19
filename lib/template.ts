import type { FormData } from "./types";

const BODY_TEMPLATE = `{{greeting}}

{{openingParagraph}}

Mein Deutschniveau habe ich durch das ÖSD-Zertifikat B2 (ausgestellt März 2026) nachgewiesen und baue es aktiv auf C1 aus – eine solide Grundlage für den täglichen Austausch im Team und mit Anwendern. Meine technischen Kenntnisse habe ich durch drei Kurse der Harvard University systematisch aufgebaut: CS50x (Algorithmen, Datenstrukturen, C, Python, SQL), CS50 Python (objektorientierte Programmierung, Fehlerbehandlung) und CS50 Web (Webentwicklung mit HTML, CSS, JavaScript, Python/Django und Datenbanken). In der Praxis arbeite ich regelmäßig mit JavaScript, Python, Node.js, SQLite und Git.{{techAddendum}}

In zwei Schülerpraktika habe ich erste reale IT-Erfahrungen gesammelt: Bei CARGOTEC (Salé, Okt.–Dez. 2025) war ich für technischen Support, Fehleranalyse bei Software und Systemen sowie die Unterstützung von Netzwerkumgebungen zuständig. Bei SMOUY (Fez, Juli–Sep. 2025) übernahm ich Aufgaben in der Verwaltung der IT-Infrastruktur, Datensicherung sowie Netzwerküberwachung zur Erhöhung der Systemsicherheit. Beide Einsätze haben mir gezeigt, wie IT-Lösungen im Unternehmenskontext eingesetzt werden – und mich darin bestärkt, eine Ausbildung in Deutschland anzustreben.

Mein Abitur in den Experimentellen Wissenschaften (Schwerpunkt Physik, Gymnasium Sidi Lahsen El Youssi, Sefrou) hat mir analytisches Denkvermögen und eine strukturierte Arbeitsweise vermittelt. Ich spreche Arabisch (Muttersprache), Deutsch (B2), Englisch (sehr gut) und Französisch – und bringe Eigeninitiative, Teamfähigkeit und echte Begeisterung für IT mit. Weitere Arbeitsproben und eigene Projekte finden Sie auf meinem Portfolio unter fatehsaid.com/de.

Für einen Ausbildungsbeginn stehe ich Ihnen ab sofort zur Verfügung. Über eine Einladung zu einem persönlichen Gespräch freue ich mich sehr.

Mit freundlichen Grüßen

Said Fateh`;

const GASTRONOMY_BODY_TEMPLATE = `{{greeting}}

{{openingParagraph}}

Durch meine praktischen Erfahrungen – unter anderem bei der PRIMOREST GmbH, der Bäckerei EL NAKHIL und zuletzt bei der NIRAMAR GmbH – habe ich fundierte Kenntnisse in den Bereichen Kundenzufriedenheit, Beschwerdemanagement und Qualitätskontrolle erworben. Ich bin sicher im Umgang mit Kassensystemen, der Produktpräsentation sowie den Abläufen im Service. Zudem bin ich bestens mit HACCP-Standards und der Lebensmittelhygiene vertraut, was für reibungslose Abläufe in Ihrem Haus unerlässlich ist. Zuverlässigkeit, Belastbarkeit und eine ausgeprägte Gastorientierung sind für mich selbstverständlich.

Neben meiner Muttersprache Arabisch beherrsche ich Englisch sehr gut in Wort und Schrift. Meine Deutschkenntnisse habe ich durch das ÖSD-Zertifikat B2 (ausgestellt März 2026) nachgewiesen und baue diese aktiv auf C1-Niveau aus. Zudem verfüge ich über Grundkenntnisse in Französisch. Diese Mehrsprachigkeit ermöglicht mir eine professionelle Betreuung internationaler Gäste – eine Kompetenz, die ich besonders im Hotelumfeld gewinnbringend einsetzen möchte.

Nach meinem Abitur im Jahr 2024 strebe ich nun eine fundierte Ausbildung an und stehe Ihnen ab sofort zur Verfügung. Ich bin ein motivierter Teamplayer mit echter Leidenschaft für die Gastronomie und Hotellerie und freue mich darauf, mein Engagement und meine Begeisterung in Ihr Haus einzubringen.

Über eine Einladung zu einem persönlichen Gespräch freue ich mich sehr.

Mit freundlichen Grüßen

Said Fateh`;

/** Derive salutation from contact person field. */
function buildSalutation(salutation: string, contactPerson: string): string {
  if (!contactPerson.trim() || !salutation)
    return "Sehr geehrte Damen und Herren,";
  if (salutation === "Frau")
    return `Sehr geehrte Frau ${contactPerson.trim()},`;
  if (salutation === "Herr")
    return `Sehr geehrter Herr ${contactPerson.trim()},`;
  return "Sehr geehrte Damen und Herren,";
}

/** Build primary subject line. */
function buildSubject(jobTitle: string, branch: string): string {
  if (branch === "gastronomie") {
    return `Bewerbung um einen Ausbildungsplatz als ${jobTitle}`;
  }
  return `Bewerbung um einen Ausbildungsplatz als ${jobTitle}`;
}

/** Build optional second subject line with city. */
function buildSubject2(
  companyName: string,
  companyZipCity: string | undefined
): string {
  const city = companyZipCity?.trim()
    ? companyZipCity.trim().replace(/^\d{5}\s*/, "") // strip ZIP, keep city
    : "";
  const location = [companyName, city].filter(Boolean).join(", ");
  return location;
}

/** Ensure text ends with sentence punctuation. */
function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Build a strong, specific opening paragraph. */
function buildOpeningParagraph(
  branch: string,
  jobTitle: string,
  companyName?: string,
  companyFocus?: string,
  companyTech?: string,
  department?: string
): string {
  if (branch === "gastronomie") {
    const dept = department?.trim() || "";

    // Build a natural description of the establishment
    let establishmentDesc = "Haus";
    if (dept) {
      establishmentDesc = dept; // e.g. "Hotel", "Restaurant", "Café"
    }

    const intro = `Die Gastfreundschaft lebt von echten Begegnungen und der Freude daran, Menschen eine gute Zeit zu bereiten. Bei der Suche nach einem Ausbildungsbetrieb, der diese Werte tagtäglich lebt, hat mich Ihr ${establishmentDesc} sofort begeistert.`;

    return (
      `${intro} Die Aussicht, Teil Ihres professionellen Teams zu werden und gemeinsam unvergessliche Erlebnisse für Ihre Gäste zu schaffen, motiviert mich außerordentlich. ` +
      `Daher bewerbe ich mich voller Überzeugung um einen Ausbildungsplatz als ${jobTitle} in Ihrem Haus.`
    );
  }

  // Informatik opening logic
  let hook = "";
  if (companyFocus?.trim() && companyTech?.trim()) {
    hook = `${ensureSentence(
      `Ihr Fokus auf ${companyFocus.trim()} kombiniert mit dem Einsatz von ${companyTech.trim()} – das ist genau das Umfeld, in dem ich meine Ausbildung beginnen möchte`
    )}`;
  } else if (companyFocus?.trim()) {
    hook = `${ensureSentence(
      `Besonders Ihr Engagement im Bereich ${companyFocus.trim()} hat mich sofort angesprochen`
    )}`;
  } else if (companyTech?.trim()) {
    hook = `${ensureSentence(
      `Die Arbeit mit ${companyTech.trim()} in einem professionellen Ausbildungsumfeld ist genau das, worauf ich hinarbeite`
    )}`;
  } else {
    hook = "Programmieren ist für mich nicht nur ein Werkzeug – es ist meine Art, Probleme zu lösen.";
  }

  return (
    `${hook} Mit großer Motivation bewerbe ich mich um einen Ausbildungsplatz als ${jobTitle} bei ${companyName || "Ihrem Unternehmen"} ` +
    `und bin überzeugt, dass mein technisches Fundament, meine Eigeninitiative und meine Lernbereitschaft gut zu Ihrem Team passen.`
  );
}

/** Optional addendum sentence if specific tech is mentioned. */
function buildTechAddendum(companyTech: string | undefined): string {
  if (!companyTech?.trim()) return "";
  return ` Der Einstieg in ${companyTech.trim()} reizt mich als konsequenten nächsten Lernschritt.`;
}

export interface FilledTemplate {
  /** Full letter body (salutation → sign-off) for PDF rendering */
  body: string;
  /** Primary subject line */
  subject: string;
  /** Optional second subject line (start date + location) */
  subject2: string;
  /** Salutation line */
  salutation: string;
}

/**
 * Fill the template with data from the form.
 * No AI — pure string replacement with improved structure.
 */
export function fillTemplate(data: FormData): FilledTemplate {
  const salutation = buildSalutation(
    data.contactSalutation ?? "",
    data.contactPerson ?? ""
  );

  if (data.branch === "gastronomie") {
    const openingParagraph = buildOpeningParagraph(
      data.branch,
      data.jobTitle,
      data.companyName,
      undefined,
      undefined,
      data.department
    );

    const body = GASTRONOMY_BODY_TEMPLATE
      .replace("{{greeting}}", salutation)
      .replace("{{openingParagraph}}", openingParagraph)
      .replace(/{{companyName}}/g, data.companyName)
      .replace("{{departmentInfo}}", "");

    const subject = buildSubject(data.jobTitle, data.branch);
    const subject2 = buildSubject2(
      data.companyName,
      data.companyZipCity
    );

    return { body, subject, subject2, salutation };
  }

  // Default: Informatik
  const openingParagraph = buildOpeningParagraph(
    data.branch,
    data.jobTitle,
    data.companyName,
    data.companyFocus,
    data.companyTech
  );

  const techAddendum = buildTechAddendum(data.companyTech);

  const body = BODY_TEMPLATE
    .replace("{{greeting}}", salutation)
    .replace("{{openingParagraph}}", openingParagraph)
    .replace("{{techAddendum}}", techAddendum);

  const subject = buildSubject(data.jobTitle, data.branch);
  const subject2 = buildSubject2(
    data.companyName,
    data.companyZipCity
  );

  return { body, subject, subject2, salutation };
}


/**
 * Build the recipient address block lines for the PDF.
 */
export function buildRecipientLines(data: FormData): string[] {
  const lines: string[] = [];
  lines.push(data.companyName);
  if (data.contactDepartmentOrRole?.trim())
    lines.push(data.contactDepartmentOrRole);
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