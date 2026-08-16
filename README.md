# Procura

**Procura** helps Ghanaian businesses find and act on public tenders. It surfaces opportunities from **GHANEPS**, matches them to what your company cares about, and sends alerts so you can review a tender on Procura—then continue on GHANEPS when you are ready to bid.

## What you can do

- Browse and filter open tenders
- Save opportunities and track deadlines
- Set company interests and notification preferences
- Get email and in-app alerts for matching tenders
- Use the assistant for plain-language help on a tender
- Optionally upload documents to check readiness

## Stack

Next.js app with Supabase (auth, database, storage). Background work runs as Supabase Edge Functions (for example: ingesting listings, matching users to tenders, sending alerts, and AI helpers).

## Local setup

```bash
cd procura
cp .env.local.example .env.local
# Add your Supabase and SMTP values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

Proprietary. See [LICENSE](./LICENSE). All rights reserved.
