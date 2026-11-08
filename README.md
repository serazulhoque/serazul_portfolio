# Serazul Hoque — GitHub Pages website

This is the complete portable source for your current portfolio, prepared for GitHub Pages. It preserves the latest headline, the smaller “with a purpose” line, Cardo typography, responsive navigation, project interactions, dark/light preference, and the theme-button scroll fade.

## Publish with GitHub Actions (recommended)

1. Extract this ZIP on your computer.
2. Create a GitHub repository, for example `serazulhoque`. For GitHub Free, use a public repository; Pages support for private repositories depends on your plan.
3. Add the CONTENTS of this folder at the repository root. `package.json`, `index.html`, `src/`, and `.github/` must be directly inside the repository. Include the `.github` folder even if your file manager hides it. GitHub Desktop or Git is the easiest way to include it reliably.
4. Use `main` as your repository's default branch.
5. In GitHub open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
6. Open **Actions → Deploy portfolio to GitHub Pages → Run workflow** for the first deployment if the initial upload already happened before Pages was enabled. Future pushes to `main` rebuild and deploy automatically.
7. GitHub displays the deployed address in the successful workflow and in Settings → Pages. A project repository normally appears at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`. A repository named `YOUR-USERNAME.github.io` normally appears at the account root URL.

Relative asset URLs support both account-root and project-subfolder hosting. You do not need to insert your GitHub username or repository name into the code. No GitHub password, token or API secret belongs in the source.

## Local development

Install Node.js 22.13 or newer (Node 22 is used by the workflow), then open a terminal in this folder:

```sh
npm ci
npm run dev
```

To produce the deployment files:

```sh
npm run build
npm run preview
```

The build type-checks the source, bundles it with Vite, and generates static HTML before hydration. The browser selects the responsive layout through CSS on the first render. The finished website is in `dist/`.

## Alternative: publish only the already-built files

If you prefer GitHub's **Deploy from a branch** option, upload the CONTENTS of `dist/` to the root of a separate repository/branch and select that branch and `/ (root)` in Settings → Pages. Keep the included `.nojekyll` file. This does not automatically rebuild your React source; after edits, run the build and replace the deployed files. Use a separate repository/branch so this alternative does not also trigger the included Actions workflow.

## Where to edit

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Page copy, main headline, project section, artwork, interactions |
| `src/site-header.tsx` | Header, mobile menu, theme preference and scroll fade |
| `src/globals.css` | Main visual layout and responsive rules |
| `src/reference-motion.css` | Typography and transitions |
| `src/theme.css` | Dark/light palettes and theme toggle |
| `src/main.tsx` | Browser entry and bundled fonts |
| `src/entry-server.tsx` | Static HTML rendering used during builds |
| `index.html` | Browser/social title, description, favicon and initial theme |
| `public/favicon.svg` | Site icon |
| `.github/workflows/deploy.yml` | Automatic build and Pages deployment |
| `scripts/prerender.mjs` | Inserts the generated initial HTML into the build |

The prebuilt `dist/` directory is included for convenience. Edit `src/`, not the generated JavaScript. All font files needed by the built site are bundled under `dist/assets/`; font license notices are in `public/licenses/` and `dist/licenses/`.

## Included admin prototype

`admin-prototype/admin.html` is the separate rich-text admin demonstration. Open it locally with `?access=hoque15062002` appended to its filename. It is intentionally outside `public/` and `dist/`, so the website workflow does not deploy the demo login or expose an admin link.

Its login is a demo, its data is temporary, and it does not publish changes to the public website. GitHub Pages serves static files and cannot run a private authentication/database backend. Before using a real admin system, connect a protected backend such as Supabase Auth/database/storage and enforce server-side authorization. The HTML contains detailed integration notes. The clean secret URL also needs host routing or an adapted static route; it is not provisioned by this export.

## Hosting and domain notes

Uploading this package to GitHub does not change your existing ChatGPT-hosted website. Your GitHub Pages website receives its own URL. If you own a custom domain, configure it through GitHub Pages separately. The existing `chatgpt.site` address belongs to that hosting service and is not an exportable custom domain.

## Verification and provenance

Public page components and styles were copied from the website source at commit `ee7b8cba2a436cdc5aa4137bf774da740052fec4`. The portable build replaces platform-specific server scaffolding with a static React/Vite entry and corrects share-link copying for GitHub repository subpaths. No live backend, identity headers, environment variables, repository credentials, or development state are included. The public website's UI and local interactions are preserved.

## Official instructions

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://vite.dev/guide/static-deploy.html

Keep the existing font license notices when redistributing their font files. React, Vite, Tailwind and other dependencies have their own package licenses. No third-party imagery or original reference-site branding is included.
