# arthur.sh

Arthur Robertson's personal site, built with Next.js, TypeScript, Motion, and SVG.

## Local development

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Content

The homepage content lives in `content/site.ts`. The roulette case study is under `components/roulette`.

## Deployment

The site is exported to `out` and deployed through the existing Cloudflare Pages Git integration. Pull requests receive preview deployments; merges to `main` deploy to production.
