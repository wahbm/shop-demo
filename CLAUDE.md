# Project guidance

Read `docs/PROJECT_CONTEXT.md` first, then `docs/ARCHITECTURE.md` before changing runtime, data, or deployment behavior.

- This is a teaching demo, not a production commerce system.
- Keep `pnpm test` green before committing; it resets only local D1 state.
- Treat Cloudflare D1 migrations as append-only once applied remotely.
- Never place Cloudflare tokens, GitHub Secrets, or other credentials in tracked files.
- Do not change the Worker name, D1 binding name (`DB`), database ID, or GitHub deployment workflow without an explicit deployment/migration reason.
