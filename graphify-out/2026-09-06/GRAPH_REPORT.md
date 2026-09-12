# Graph Report - Resume Generater  (2026-09-06)

## Corpus Check
- 40 files · ~16,544 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 243 nodes · 334 edges · 25 communities (12 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `getContexts()` - 10 edges
3. `getActiveContext()` - 9 edges
4. `Anschreiben Generator` - 9 edges
5. `generateCoverLetterPdf()` - 8 edges
6. `AusbildungContext` - 8 edges
7. `fillTemplate()` - 8 edges
8. `OnboardingPage()` - 7 edges
9. `getOAuth2Client()` - 7 edges
10. `saveActiveContext()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `CoverLetterPDFProps` --references--> `AusbildungContext`  [EXTRACTED]
  components/CoverLetterPDF.tsx → lib/storage.ts
- `GET()` --calls--> `getOAuth2Client()`  [EXTRACTED]
  app/api/auth/google/route.ts → lib/gmail.ts
- `GET()` --calls--> `getTokensFromCookies()`  [EXTRACTED]
  app/api/auth/status/route.ts → lib/gmail.ts
- `POST()` --calls--> `insertCoverLetterPage()`  [EXTRACTED]
  app/api/generate/route.ts → lib/pdf-merger.ts
- `ApplyPage()` --calls--> `getActiveContext()`  [EXTRACTED]
  app/v2/(main)/apply/page.tsx → lib/storage.ts

## Import Cycles
- None detected.

## Communities (25 total, 7 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.06
Nodes (35): @anthropic-ai/sdk, cheerio, clsx, framer-motion, @google/generative-ai, googleapis, localforage, lucide-react (+27 more)

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
Cohesion: 0.25
Nodes (13): GET(), GET(), POST(), GET(), POST(), buildRawEmail(), buildTokenCookie(), clearTokenCookie() (+5 more)

### Community 6 - "[branch]/page.tsx"
Cohesion: 0.17
Nodes (6): BranchToggle(), AppState, BranchPage(), DEFAULT_FIELDS_GASTRONOMIE, DEFAULT_FIELDS_INFORMATIK, FormFields

### Community 7 - "apply/page.tsx"
Cohesion: 0.25
Nodes (7): Toast(), ToastProps, ApplyPage(), CoverLetterPDF(), CoverLetterPDFProps, styles, insertCoverLetterPage()

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

## Knowledge Gaps
- **90 isolated node(s):** `anthropic`, `hookCache`, `anthropic`, `pitchCache`, `anthropic` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `insertCoverLetterPage()` connect `apply/page.tsx` to `generate/route.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `anthropic`, `hookCache`, `anthropic` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `generate/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._