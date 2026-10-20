# Wait For Me

A shared board for a team that uses one building key card.

See who is outside, in the lobby, or on floors 21, 22, and 23. At 8:00 PM Myanmar time, everyone is marked outside.

The phone talks to this site. The site stores people in Neon and photos in Vercel Blob. Each phone refreshes every few seconds. “I am” stays on that phone.

```bash
npm install
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`.

```bash
npx vercel dev
```

The tables are created on the first request. `db/schema.sql` is the same structure.
