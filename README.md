# Anschreibify

A Next.js 15 web app that generates tailored German Ausbildung cover letters (Anschreiben), using AI to personalize each letter to the target company and the applicant's own CV, and optionally sends or schedules the finished application by email via Gmail.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS v3
- React Compiler (`experimental.reactCompiler`)
- `pdf-lib` for PDF generation and merging
- `@anthropic-ai/sdk` (Claude) for AI-written cover letter content
- `googleapis` for Gmail OAuth + sending
- `@supabase/supabase-js` for scheduled-email storage
- `@vercel/blob` for résumé/CV file storage
- `zod` for form validation
- `pnpm` as package manager

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env.local` file with:

```env
# Anthropic (AI-generated cover letter content)
CLAUD_API_KEY=your_anthropic_api_key

# Vercel Blob (résumé/CV storage)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Supabase (scheduled email storage)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Gmail OAuth (sending/scheduling application emails) — see GMAIL_SETUP.md
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
GMAIL_COOKIE_SECRET=your_random_32+_char_secret

# Optional: secret used to authorize the scheduled-email cron endpoint
CRON_SECRET=your_random_secret
```

See `GMAIL_SETUP.md` for the full Gmail OAuth setup walkthrough.

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Onboarding** (`/v2/onboarding`) — upload your CV and full application PDF, and enter your personal info and target job title. The AI generates a personalized cover letter template and a fallback opening paragraph from your CV.
2. **Apply** (`/v2/apply`) — enter the target company's details and paste the job ad text. The AI writes a company-specific opening paragraph, which is merged into your template and rendered as a PDF.
3. Choose output mode:
   - **Nur Anschreiben** — cover letter only.
   - **Bewerbungsunterlagen** — merges the generated letter into your uploaded full application PDF, replacing one page.
4. Preview, download, or (if Gmail is connected) send/schedule the application by email directly from the app.
5. **Geplante Mails** (`/v2/scheduled`) — manage, reschedule, or cancel scheduled emails.

## Project Structure

```
app/
  layout.tsx                     — root layout
  page.tsx                       — redirects to /v2/onboarding or /v2/apply
  privacy/, terms/               — legal pages
  api/
    generate/                    — POST: fills template + generates cover letter PDF (with inline AI hook)
    generate-hook/                — POST: AI-generated opening paragraph (standalone)
    generate-pitch/               — POST: AI-generated cover letter template from an uploaded CV
    upload-resume/                — POST: stores a résumé/CV PDF in Vercel Blob
    auth/                        — Gmail OAuth (google, callback, status, logout)
    send-email/                  — send an application email now
    send-email/schedule/         — CRUD for scheduled emails + due-email cron processor
  v2/
    onboarding/                  — first-time setup (CV, resume, personal info)
    (main)/apply/                — main dashboard: generate, preview, send/schedule
    (main)/profile/              — edit personal info + email template
    (main)/uploads/              — manage CV/resume files and the cover letter template
    (main)/scheduled/            — manage scheduled emails
lib/
  types.ts                      — Zod schema + FormData type
  template.ts                   — cover letter template + fill logic
  pdf-generator.ts              — pdf-lib A4 cover letter rendering
  pdf-merger.ts                 — page replacement logic for full applications
  storage.ts                    — client-side persistence (localforage/localStorage)
  gmail.ts                      — Gmail OAuth client, token encryption, MIME email building
  scheduled-emails.ts           — Supabase-backed scheduled email storage + sending
  supabase.ts                   — Supabase service-role client
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm type-check` | Run TypeScript compiler check |
