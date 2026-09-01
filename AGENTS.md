<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Styling

- Use Tailwind CSS utilities for all styling outside the complex cockpit instrumentation panels.
- Keep plain CSS restricted to `src/app/cockpit-panels.css` and the cockpit components it supports in `src/app/components/aircraft-panels.tsx`.
- Do not add layout, shell, header, system-panel, responsive, or general component styles to plain CSS; colocate them as Tailwind classes in the relevant TSX.
- Reserve `src/app/globals.css` for Tailwind imports and truly global theme tokens or base configuration.
