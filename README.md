# ENAcademy

ENAcademy is a portfolio-grade, full-stack English learning platform built around practical A1–A2 conversations. It combines a polished public site, durable student progress, account approval, role-specific dashboards, and a complete interactive lesson flow.

## Product features

- Professional responsive landing page with code-native 3D motion
- Public About and Curriculum experiences
- ChatGPT-authenticated student and administrator entry points
- Administrator approval, rejection, and suspension controls
- Sixteen authored lessons across eight A1–A2 modules
- Listening with browser speech synthesis
- Vocabulary study and a persistent saved-word bank
- Practical grammar explanations and scored knowledge checks
- Guided speaking with browser speech recognition and phrase matching
- Durable lesson completion, scores, attempts, and XP in Cloudflare D1
- Open Graph and X social-preview metadata

## Account workflow

1. A learner signs in and a pending student profile is created.
2. An email listed in `ADMIN_EMAILS` signs in and receives the administrator role.
3. The administrator approves the learner from `/admin`.
4. The learner gains access to lessons and persistent progress.

The local Sites environment uses `seedy@sites.test` as a demonstration administrator.

## Development

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Generate migrations after changing `db/schema.ts`:

```bash
npm run db:generate
```

Validate a production build:

```bash
npm run build
```

## Project structure

- `app/` — public pages, authenticated product routes, API handlers, and styles
- `components/` — interactive lesson and administrator controls
- `db/` — D1 schema and server-side persistence functions
- `drizzle/` — generated SQLite migrations
- `lib/curriculum.ts` — the authored A1–A2 curriculum

## Future open-source release

This repository is currently private while the product is being refined. It is intentionally structured for a future public release, including clear setup instructions, portable curriculum data, and platform-managed infrastructure.
