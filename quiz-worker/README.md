# GuestGuard quiz API

The Worker serves question text without the answer key and grades submissions against D1.

This project is pinned to the GuestGuard Cloudflare account in `wrangler.jsonc`.
The training-video R2 buckets live in a separate account and are not bound to
this Worker.

1. Run `npm install` in this directory.
2. Run `npx wrangler login`. The existing `inspector-quiz-db` database is already configured in `wrangler.jsonc`.
3. If the database is ever replaced, update its name and ID in `wrangler.jsonc`.
4. Run `npm run db:local`, then `npm run dev` for local testing.
5. Run `npm run db:remote`, then `npm run deploy` for production.
6. The deployed Worker URL is configured in the site's `quiz-config.js`.

For local testing, serve the site on `http://localhost:8000`; the quiz page automatically calls `http://localhost:8787`.
