# Reading this project

Start with `src/App.tsx` to see how the public page is assembled. Styling remains in the existing CSS files; this audit does not redesign the site.

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | Starts React and hydrates the generated HTML. |
| `src/App.tsx` | Page sections, published articles, and navigation between pages. |
| `src/page-copy.ts` | Loads heading and paragraph text; keeps valid cached text during an outage. |
| `src/public-api.ts` | Public connection settings, cancellable JSON requests, optional browser storage. |
| `src/site-content.tsx` | Loads editable labels, stories, education, and experience. |
| `src/visitor-wall.tsx` | Displays approved notes and submits new notes for moderation. |
| `src/site-header.tsx` | Menu, theme switch, and profile-photo viewer. |
| `src/site-design.tsx` | Applies the administrator's existing design preferences. |

A `useState` value controls what React displays. A `useEffect` starts work after rendering. Its cleanup cancels unfinished requests when a component disappears. The public key is publishable; database row-level security still controls what visitors can read or write.

The cache is optional. Validate it before rendering, refresh it in the background, and keep good cached content if the network fails. `requestJSON` stops a stalled request after 15 seconds, including a stalled response body. It does not automatically retry writes because the server may already have saved them.

Run `npm ci`, `npm test`, and `npm run build`. GitHub Actions runs the tests and build before deploying `dist/` to GitHub Pages. Edit source files, not generated files in `dist/`.

## November 2026 maintenance

- Fixed blank page copy when a corrupt or incomplete cache existed during a network failure.
- Added timeouts for page copy, articles, editable content, and visitor submissions.
- Validated cached content and visitor input before rendering or sending it.
- Moved repeated request/cache handling and page-copy loading into named modules.
- Updated Vite to 8.3.7 to resolve the development-server advisories reported by `npm audit`.
- Preserved layout, CSS, fonts, animations, content, and the profile-photo viewer.

The automated tests cover data validation, cache failures, HTTP errors, timeouts, and request cancellation. The production build also checks TypeScript. Tests do not guarantee the absence of every possible bug.
