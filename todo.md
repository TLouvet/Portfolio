# Portfolio — TODO

## SEO

- [ ] **Add `og:image`** — a profile photo or custom preview card set as `og:image` in all 4 files. Without it, LinkedIn/Twitter shares show no image which significantly reduces click-through rate. Ideal size: 1200×630px.
- [ ] **Add a favicon** — `<link rel="icon">` pointing to a `.ico` or `.svg`. Affects click-through rate in search results and tab recognition.
- [ ] **Add `sitemap.xml`** — lists all 4 pages with their `hreflang` alternates. Helps Google discover and index everything faster. Can be a simple static file.
- [ ] **Add `robots.txt`** — explicit crawling instructions. A minimal one (`Allow: /`) is better than nothing.
- [ ] **Self-host fonts or add `font-display: swap`** — the Google Fonts call is render-blocking and slows down First Contentful Paint, which Google uses as a Core Web Vitals signal. Add `&display=swap` to the font URL (quick win) or self-host the Inter font files.
- [ ] **Register on Google Search Console** — submit the sitemap, monitor indexing status and see which queries bring traffic. Free and essential.
- [ ] **Register on Bing Webmaster Tools** — same idea, smaller audience but worth 10 minutes.

## Content & UX

- [ ] **Add a profile photo** — both for the `og:image` and ideally in the hero section. Significantly increases trust and memorability, especially for the Japanese version.
- [ ] **Add a downloadable PDF CV** — a "Télécharger mon CV" button in the hero. Recruiters often want a PDF. Could be one per language.
- [ ] **Mobile navigation** — the nav is currently hidden on small screens with no replacement. A hamburger menu or a simple bottom bar would make the mobile experience complete.
- [ ] **Language auto-detection** — a small JS snippet using `navigator.language` to redirect first-time visitors to the right language version. Should respect a stored preference (localStorage) so it doesn't redirect on every visit.

## Technical

- [ ] **Add a `404.html`** — GitHub Pages serves it automatically when a route doesn't exist. Useful for keeping users on the site if they land on a broken link.
- [ ] **Clean URLs** — `/en` instead of `/en.html`. Requires either a GitHub Pages hack (folder + index.html per locale) or moving to a host that supports redirect rules (Netlify, Cloudflare Pages).
- [ ] **Analytics** — consider Plausible (privacy-friendly, no cookie banner needed) or Umami (self-hostable on the OVH VPS) to track real visitor data.
- [ ] **Dark mode** — the tools design system already has dark mode infrastructure. Could be a nice consistency touch if the tools app gets a dark mode.
- [ ] **Print stylesheet** — `@media print` styles so the page prints cleanly as a CV if someone tries.
