# CerdasIND Frontend

React 19 + TypeScript 6 + Vite 8 SPA — Computer-Based Testing platform for an Indonesian educational service. Two roles: **peserta** (participant, takes exams) and **admin** (manages students, sessions, grading, invoices).

## Project

- **Entry:** `src/main.tsx` → `src/App.tsx` (BrowserRouter + AuthProvider + Navbar + AppRouter)
- **Stack:** React 19, React Router 7, Axios, KaTeX (math rendering), Lucide React (icons)
- **State:** React Context (`src/store/authStore.tsx`) — no Redux/Zustand
- **Styling:** Plain CSS with design tokens (`src/App.css` and `src/index.css`), HoneyBook theme
- **Build:** Vite with React Compiler (babel plugin) + manual chunk splitting for vendor deps
- **Deploy:** Vercel (SPA fallback in `vercel.json`)

## Commands

| Command           | What it does                        |
|-------------------|-------------------------------------|
| `npm run dev`     | Dev server (binds to all hosts)     |
| `npm run build`   | `tsc -b` then `vite build`         |
| `npm run lint`    | ESLint on all `.ts/.tsx` files     |
| `npm run preview` | Preview production build            |

## Architecture

```
src/
├── assets/              # Static images (hero.png, favicon, etc.)
├── components/
│   ├── common/          # Shared UI — Navbar, KaTeXParser
│   └── participant/     # Participant-only — Timer
├── router/              # Route definitions + ProtectedRoute guard
├── services/            # API layer: api.ts (axios instance) + domain services
├── store/               # React Context auth store (AuthProvider, useAuth)
├── utils/               # Utilities (documentPdf for invoice PDF generation)
└── views/
    ├── auth/            # Login, Register
    ├── participant/     # Dashboard, MapelList, BundleList, CBTWorkspace, History, Review
    └── admin/           # AdminDashboard, StudentManagement, SessionAll, SessionManagement,
                         # SubmissionList, GradeDetail, Invoice, Report
```

- **`src/services/api.ts`** — Axios instance with base URL from `VITE_API_URL` env var (default: `http://localhost:8080/api/v1`). Interceptors attach JWT from localStorage and redirect to `/login` on 401.
- **`src/services/auth.service.ts`** — login/register endpoints
- **`src/services/participant.service.ts`** — jenjang/mapel/bundle/soal/submit/history/review for peserta
- **`src/services/admin.service.ts`** — dashboard stats, bundles CRUD, students, sessions, grading, invoices, reports
- **`src/router/index.tsx`** — All routes defined with `React.lazy()` code-splitting per view. Protected routes use `ProtectedRoute` wrapper with optional `requiredRole`.
- **`src/store/authStore.tsx`** — `AuthContext` + `AuthProvider` + `useAuth` hook. User/token stored in `localStorage`.

## Conventions

- **Components:** `React.FC<Props>` with explicit prop interfaces. Default exports. `.tsx` extension.
- **Services:** Named export objects (e.g. `authService`, `participantService`) with `async` methods. Types exported as named interfaces alongside the service.
- **Imports order:** React → third-party (react-router, lucide-react, katex) → local services/types → local components → CSS.
- **API calls:** Always go through the shared `api` axios instance from `services/api.ts`. Token handling is automatic.
- **Role-based access:** `ProtectedRoute` with `requiredRole` prop guards admin routes. Navbar renders different links per role.
- **Styling:** Design tokens in `src/App.css` (`--color-*`, `--font-*`, `--text-*`, `--spacing-*`). Use these CSS variables, not hardcoded values.
- **TypeScript:** Strict-ish — `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` enabled. No type-only imports, prefer `verbatimModuleSyntax`.
- **Environment:** `VITE_API_URL` for the backend base URL. `.env` is gitignored.

## Notes

- The backend is a Go service at `reza.anandamcomputer.com/api/v1` (production) or `localhost:8080/api/v1` (local).
- KaTeX is used for rendering LaTeX math expressions in exam questions. Use the `KaTeXParser` component for consistent rendering.
- Invoice PDF generation is done client-side via `utils/documentPdf.ts`.
- Design tokens follow the "HoneyBook" style guide (see `DESIGN.md` for full reference).
