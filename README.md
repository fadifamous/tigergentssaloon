# Tiger Gents Salon website

A production-ready, mobile-first website for Tiger Gents Salon at Lake Central Tower, Business Bay, Dubai.

## What is included

- 14 accessible HTML pages, including a custom 404
- Responsive premium design system
- Supplied salon photography and primary logo
- Transparent primary logo, favicon, app icons, OG image, and email export
- Service prices and durations stored in `assets/js/services-data.js`
- Setmore booking links on all high-intent actions
- Click-to-call, desktop-header WhatsApp, and persistent mobile WhatsApp actions for +971 56 228 5900
- Google Maps direction links
- Responsive service filtering
- Keyboard-accessible navigation, gallery dialog, and FAQ
- Reduced-motion support and mobile sticky booking actions
- LocalBusiness and FAQ structured data
- Sitemap, robots file, policy pages, and owner documentation
- Google Tag Manager container `GTM-K6LPRZ84` and privacy-aware event hooks
- Simple password-protected Cloudflare Worker admin at `/admin`
- GitHub-backed team and website-picture editing from one source of truth
- Automatic Cloudflare deployment after each admin-created GitHub commit

## Run locally

Requires Node.js 18 or newer.

```powershell
npm start
```

Open `http://127.0.0.1:4173`.

Run the project integrity check:

```powershell
npm test
```

## Deploy

The public pages are static assets served by a Cloudflare Worker. The Worker also provides the small authenticated admin API. Admin changes are committed directly to this GitHub repository; no D1 database or R2 bucket is used.

Use these Cloudflare Builds values:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Output is configured in `wrangler.jsonc`; do not add `--assets ./dist`

The one-time password and GitHub-token secret setup is documented in [docs/ADMIN_DASHBOARD_SETUP.md](docs/ADMIN_DASHBOARD_SETUP.md).

Before connecting a custom domain, replace the temporary canonical domain `https://tigergentssaloon.com/` in HTML, `robots.txt`, and `sitemap.xml` if the final domain differs.

## Owner guide

### Update services, prices, or durations

Edit `assets/js/services-data.js`. Each record has:

- `name`
- `category`
- `description`
- `duration`
- `price`

The Services page uses this file. Update any manually featured homepage card if a featured service changes.

Keep service changes aligned with the salon’s current Setmore catalogue.

### Update hours

Search the project for the existing hours before editing the relevant public content and structured data.

Review special or holiday hours before publishing.

### Update review ratings or links

Update the public review section and structured data in the repository, then verify the source link.

The marketing site highlights Tiger Gents Salon’s 5.0 rating from 100+ Google reviews, with feedback attributed and linked directly to Google.

Only publish client feedback that the salon has permission to use.

### Add a team member

Use **Admin > Team members**. Add the approved name, role, biography, portrait and booking link, then save. The admin creates a GitHub commit and Cloudflare deploys it automatically.

### Replace images

Use **Admin > Website pictures** to upload JPEG, PNG, WebP or AVIF files up to 5 MB. Meaningful alternative text is required. New files are committed under `assets/uploads/`.

### Update SEO

Each page contains its own title, description, canonical URL, and robots directive. The homepage also includes local-business structured data and Open Graph metadata. Update `sitemap.xml` whenever a public page is added or removed.

### Check booking links

Search for `tigergentssaloon.setmore.com` to find every direct booking URL. Run a manual click test on desktop and mobile after any URL change.

### Publish changes

1. Run `npm run check`.
2. Run `npm run check:admin` and the browser tests with `npm test`.
3. Run the site locally and review desktop and mobile widths.
4. Commit only the intended files.
5. Push to `main` or open a review branch, depending on the hosting workflow.

## Current salon details

The website currently presents:

- 5.0 rating from 100+ Google reviews
- Hours: Monday–Sunday, 10:00 AM–12:00 AM
- Team: ABED, Shahem, Joe, Tiya
- Phone and WhatsApp: +971 56 228 5900
- Online booking: `https://tigergentssaloon.setmore.com`

Keep these details aligned with the salon’s services and booking setup.

## Project structure

```text
assets/
  admin/       Administration dashboard styling and behavior
  brand/       Primary logo, alternate logo, icons, and social exports
  css/         Design system and responsive layout
  images/      Supplied salon photography
  js/          Shared behavior and structured service data
docs/          Requirements and handover reports
admin.html     Administration dashboard shell
assets/data/   GitHub-backed team and gallery content
src/           Cloudflare Worker, login and GitHub update API
scripts/       Build, integrity and browser checks
*.html         Public pages
```

## Important launch notes

- Add email, social links, team biographies, team portraits, product-brand details, parking information, or legal business information when the salon chooses to publish them.
- Google Tag Manager is installed. Configure any tags in container `GTM-K6LPRZ84` to respect the site’s consent choice.
- The visible primary logo is `assets/brand/logo_transparent.png` (1535×1024 RGBA). `assets/brand/logoblackbackground.png` is retained as an alternate.
- Manrope and Bodoni Moda are self-hosted from open-source variable-font files; retain the font licence files in `assets/fonts/`.
