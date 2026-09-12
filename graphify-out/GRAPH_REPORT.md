# Graph Report - Resume Generater  (2026-09-12)

## Corpus Check
- 47 files · ~22,865 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 275 nodes · 399 edges · 27 communities (13 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0be34410`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- generate/route.ts
- compilerOptions
- devDependencies
- storage.ts
- gmail.ts
- [branch]/page.tsx
- apply/page.tsx
- generate-hook/route.ts
- generate-pitch/route.ts
- app/layout.tsx
- RootPage
- next.config.ts
- next-env.d.ts
- tailwind.config.ts
- Anschreiben Generator
- Gmail API Setup Guide
- rules/graphify.md
- workflows/graphify.md
- scheduled-emails.ts
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `getOAuth2Client()` - 11 edges
3. `getTokensFromCookies()` - 10 edges
4. `getContexts()` - 10 edges
5. `getActiveContext()` - 9 edges
6. `Anschreiben Generator` - 9 edges
7. `encryptTokens()` - 8 edges
8. `generateCoverLetterPdf()` - 8 edges
9. `AusbildungContext` - 8 edges
10. `fillTemplate()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `CoverLetterPDFProps` --references--> `AusbildungContext`  [EXTRACTED]
  components/CoverLetterPDF.tsx → lib/storage.ts
- `GET()` --calls--> `getOAuth2Client()`  [EXTRACTED]
  app/api/auth/google/route.ts → lib/gmail.ts
- `POST()` --calls--> `insertCoverLetterPage()`  [EXTRACTED]
  app/api/generate/route.ts → lib/pdf-merger.ts
- `POST()` --calls--> `getTokensFromCookies()`  [EXTRACTED]
  app/api/send-email/schedule/route.ts → lib/gmail.ts
- `ApplyPage()` --calls--> `getActiveContext()`  [EXTRACTED]
  app/v2/(main)/apply/page.tsx → lib/storage.ts

## Import Cycles
- None detected.

## Communities (27 total, 8 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (37): @anthropic-ai/sdk, cheerio, clsx, framer-motion, @google/generative-ai, googleapis, localforage, lucide-react (+29 more)

### Community 1 - "generate/route.ts"
Cohesion: 0.14
Nodes (23): anthropic, generateHookInline(), hookCache, hookCacheKey(), POST(), sanitizeFilename(), truncateWords(), DrawCtx (+15 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, babel-plugin-react-compiler, devDependencies, autoprefixer, babel-plugin-react-compiler, postcss, tailwindcss, @types/node (+17 more)

### Community 4 - "storage.ts"
Cohesion: 0.24
Nodes (17): DashboardLayout(), ProfilePage(), UploadsPage(), OnboardingPage(), AusbildungContext, deleteContext(), getActiveContext(), getActiveContextId() (+9 more)

### Community 5 - "gmail.ts"
Cohesion: 0.22
Nodes (17): GET(), GET(), POST(), GET(), POST(), GET(), isAuthorized(), POST() (+9 more)

### Community 6 - "[branch]/page.tsx"
Cohesion: 0.17
Nodes (6): BranchToggle(), AppState, BranchPage(), DEFAULT_FIELDS_GASTRONOMIE, DEFAULT_FIELDS_INFORMATIK, FormFields

### Community 7 - "apply/page.tsx"
Cohesion: 0.18
Nodes (9): Toast(), ToastProps, ApplyPage(), ScheduledEmailsPage(), ScheduledItem, CoverLetterPDF(), CoverLetterPDFProps, styles (+1 more)

### Community 8 - "generate-hook/route.ts"
Cohesion: 0.47
Nodes (5): anthropic, cacheKey(), hookCache, POST(), truncateWords()

### Community 9 - "generate-pitch/route.ts"
Cohesion: 0.47
Nodes (5): anthropic, cacheKey(), pitchCache, POST(), truncateWords()

### Community 21 - "Anschreiben Generator"
Cohesion: 0.15
Nodes (12): 1. Install dependencies, 2. (Optional) Place your base Bewerbungsunterlagen PDF, 3. Run the development server, Anschreiben Generator, How Full Resume Mode Works, How to Edit the Cover Letter Template, Output Filenames, Project Structure (+4 more)

### Community 22 - "Gmail API Setup Guide"
Cohesion: 0.25
Nodes (7): Gmail API Setup Guide, Step 1: Create a Google Cloud Project, Step 2: Enable the Gmail API, Step 3: Configure the OAuth Consent Screen, Step 4: Create OAuth Credentials, Step 5: Configure Environment Variables, Step 6: Authenticate

### Community 25 - "scheduled-emails.ts"
Cohesion: 0.18
Nodes (15): DELETE(), GET(), PATCH(), POST(), cancelScheduledEmail(), deleteScheduledEmail(), EmailMetadata, extractMetadataFromRow() (+7 more)

## Knowledge Gaps
- **96 isolated node(s):** `anthropic`, `hookCache`, `anthropic`, `pitchCache`, `anthropic` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 129 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `insertCoverLetterPage()` connect `apply/page.tsx` to `generate/route.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `anthropic`, `hookCache`, `anthropic` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `generate/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._