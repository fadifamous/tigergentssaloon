# Test report

Date: 19 July 2026

## Automated

- Required-page and required-asset integrity check
- Per-page title and meta-description check
- Skip-link and main-landmark check
- Shared-header/shared-footer mount check
- Shared script inclusion check
- Local asset reference check
- Playwright HTTP, header, footer, filter, dialog, menu, reflow, and screenshot checks across 14 pages
- Lighthouse category audit
- npm production/development dependency audit

Run with:

```powershell
npm run check
npm run test:smoke
```

Latest local results:

- Static integrity check: passed
- Playwright smoke suite: passed
- npm audit: 0 vulnerabilities
- Lighthouse: Performance 90, Accessibility 100, Best Practices 100, SEO 100

## Manual functional coverage

- Fresha booking CTAs open in a new tab with `noopener noreferrer`
- Google Maps actions open the approved location link
- Mobile menu exposes state with `aria-expanded` and closes with Escape
- Service category filters update visible rows
- FAQ uses native disclosure elements
- Gallery uses a native dialog and supports Escape
- Cookie preference persists locally
- Mobile booking bar hides near the footer
- Reduced-motion rules preserve all content

## Production follow-up

Run final cross-browser and assistive-technology testing on the deployed URL. External Fresha and Google Maps behavior must also be rechecked immediately before launch.
