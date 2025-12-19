---
description: How to deploy the MNS Core application to Cloudflare Pages.
---

# Deploy using Cloudflare Dashboard (Git Integration)

This is the easiest method.

1.  Push your code to a GitHub/GitLab repository.
2.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
3.  Go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
4.  Select your repository and branch.
5.  **Build Settings**:
    *   **Framework Preset**: Select `Next.js`.
    *   **Build command**: `npx @cloudflare/next-on-pages` (or `npm run pages:build`)
    *   **Build output directory**: `.vercel/output/static`
    *   **Node.js Version**: Set to `20` (or latest LTS compatible with your Next.js version). You can set this in Environment Variables as `NODE_VERSION` = `20`.

# Deploy using Wrangler CLI

If you prefer the command line:

1.  Install Wrangler: `npm install -g wrangler`
2.  Login: `wrangler login`
3.  Build the project:
    ```bash
    npm run pages:build
    ```
4.  Deploy:
    ```bash
    npx wrangler pages deploy .vercel/output/static --project-name mns-core
    ```

# Troubleshooting

-   **Compatibility**: Ensure `nodejs_compat` compatibility flag is enabled in Cloudflare if you use Node.js specific APIs.
-   **Lockfile**: If deployment fails with `ERR_PNPM_OUTDATED_LOCKFILE`, try deleting `pnpm-lock.yaml` or running `pnpm install` locally before pushing.
