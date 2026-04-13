# Anschreiben Generator

A Next.js 15 web app that generates a tailored German Ausbildung cover letter (Anschreiben) as a PDF. Optionally merges it into an existing Bewerbungsunterlagen PDF by replacing page 2.

**No API key required.** Generation is fully template-based — no AI, no external calls.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS v3
- React Compiler (`experimental.reactCompiler`)
- `pdf-lib` for PDF generation and merging
- `zod` for form validation
- `pnpm` as package manager

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. (Optional) Place your base Bewerbungsunterlagen PDF

If you want to use **Full Resume** mode (replacing page 2), place your base PDF at:

```
assets/Bewerbungsunterlagen.pdf
```

The file must have at least 2 pages. Page 2 (the old Anschreiben) will be replaced with the generated one.

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Fill in the form fields (company name, job title, date — minimum required).
2. Choose output mode:
   - **Nur Anschreiben** — generates a single-page cover letter PDF.
   - **Vollständige Bewerbung (ersetzt Seite 2)** — requires `assets/Bewerbungsunterlagen.pdf`; replaces only page 2 with the new cover letter, all other pages unchanged.
3. Click **PDF erstellen** — the PDF is generated instantly (no API call).
4. Click **Herunterladen** to save the PDF.

## Output Filenames

| Mode | Filename |
|------|----------|
| Cover letter only | `Anschreiben_<Firmenname>_Said_Fateh.pdf` |
| Full resume | `Bewerbungsunterlagen_<Firmenname>_Said_Fateh.pdf` |

## How Full Resume Mode Works

1. `assets/Bewerbungsunterlagen.pdf` is loaded.
2. The newly generated cover letter page replaces **page 2 (index 1)** only.
3. Pages 1, 3, 4, … are kept byte-for-byte as they were.
4. The merged PDF is returned for download.

No rasterization, no re-encoding of other pages.

## How to Edit the Cover Letter Template

The entire letter body is in one file:

```
lib/template.ts
```

Edit the `BODY_TEMPLATE` constant. It supports these placeholders:

| Placeholder | Replaced with |
|-------------|---------------|
| `{{salutation}}` | Auto-generated or overridden salutation |
| `{{jobTitle}}` | Job title from the form |

The subject line follows `"Bewerbung um einen Ausbildungsplatz als <jobTitle>"` by default.
Override either in the form's **Erweiterte Optionen** section.

## Project Structure

```
app/
  layout.tsx              — root layout
  globals.css             — Tailwind directives
  page.tsx                — main form UI (Client Component)
  api/generate/
    route.ts              — POST handler: fills template, generates PDF
lib/
  types.ts                — Zod schema + FormData type
  template.ts             — fixed cover letter template + fill logic
  pdf-generator.ts        — pdf-lib A4 cover letter rendering
  pdf-merger.ts           — page 2 replacement logic
assets/
  Bewerbungsunterlagen.pdf  ← place your base PDF here
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm type-check` | Run TypeScript compiler check |
