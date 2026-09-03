# CForge

A student-focused online C and Node.js IDE powered by [Judge0 CE](https://ce.judge0.com), Next.js, CodeMirror 6, Prisma, and PostgreSQL.

To install dependencies:

```bash
bun install
```

To run the IDE in development mode:

```bash
bun run dev
```

Then open `http://localhost:3000`. The landing page links to a guest editor and account sign-in. Choose C or Node.js, then use `Ctrl+Enter` (or the Run button) to execute the current program. The server proxies submissions to Judge0 so the browser does not need to call the API directly.

## Environment setup

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JUDGE0_BASE_URL` (optional if using Judge0 CE default)

Then initialize Prisma:

```bash
bunx prisma migrate dev --name init
```

Routes:

- `/` is the marketing landing page and authentication entry point.
- `/dashboard` is the authenticated project library (create, open, and delete).
- `/editor/new` is a guest-capable editor for trying C or Node.js and running stdin.
- `/editor/[id]` edits an owned saved project and autosaves changes.

Google login is available once Google OAuth credentials are configured. Project CRUD is always ownership-checked on the server; running code does not require an account.

The production build can be created and served with:

```bash
bun run build
bun run start
```
# cforge
