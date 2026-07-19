# Tiger Gents Salon website

A production-ready, mobile-first website for Tiger Gents Salon at Lake Central Tower, Business Bay, Dubai.

## What is included

- 14 accessible HTML pages, including a custom 404
- Responsive premium design system
- Supplied salon photography and primary logo
- Transparent primary logo, favicon, app icons, OG image, and email export
- Service prices and durations stored in `assets/js/services-data.js`
- Setmore booking links on all high-intent actions
- Click-to-call and persistent mobile WhatsApp actions for +971 56 228 5900
- Google Maps direction links
- Responsive service filtering
- Keyboard-accessible navigation, gallery dialog, and FAQ
- Reduced-motion support and mobile sticky booking actions
- LocalBusiness and FAQ structured data
- Sitemap, robots file, policy pages, and owner documentation
- Google Tag Manager container `GTM-K6LPRZ84` and privacy-aware event hooks

## Run locally

Requires Node.js 18 or newer.

```powershell
npm start
```

Open `http://127.0.0.1:4173`.

Run the project integrity check:

```powershell
npm run check
```

## Deploy

The project has no build step and can be deployed as a static site.

### GitHub Pages

1. Open the repository settings.
2. Select **Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Save.

### Netlify

Import the repository and leave build command empty. Set publish directory to `.`.

### Vercel

Import the repository, select **Other** as the framework, leave build command empty, and use `.` as the output directory.

Before connecting a custom domain, replace the temporary canonical domain `https://tigergentssaloon.com/` in HTML, `robots.txt`, and `sitemap.xml` if the final domain differs.

## Owner guide

### Update services, prices, or durations

Edit `assets/js/services-data.js`. Each record has:

- `name`
- `category`
- `description`
- `duration`
- `price`

The Services page is generated from this file. Featured homepage services are intentionally hand-curated in `index.html`, so update those cards separately when a featured service changes.

Keep service changes aligned with the salon’s current Setmore catalogue.

### Update hours

Search the project for `10:00 AM` and update:

- utility bar and footer in `assets/js/site.js`
- homepage location section
- Contact page
- FAQ
- homepage structured data

Review special or holiday hours before publishing.

### Update review ratings or links

Update `rating` at the top of `assets/js/site.js`, then update:

- homepage trust rail
- homepage review section
- homepage structured data
- any review quotation whose source has changed

The marketing site highlights Tiger Gents Salon’s five-star ratings on Fresha and Google.

Only publish client feedback that the salon has permission to use.

### Add a team member

Add the member to `team.html` and the homepage team section. Use salon-approved role, biography, speciality, language, experience, portrait, and rating information.

### Replace images

Place the new image in `assets/images/`, update its `src`, dimensions, and meaningful alt text in the page. Prefer AVIF or WebP for new photography and retain the original licensed source separately.

### Update SEO

Each page contains its own title, description, canonical URL, and robots directive. The homepage also includes local-business structured data and Open Graph metadata. Update `sitemap.xml` whenever a public page is added or removed.

### Check booking links

Search for `tigergentssaloon.setmore.com` to find every direct booking URL. Run a manual click test on desktop and mobile after any URL change.

### Publish changes

1. Run `npm run check`.
2. Run the site locally and review desktop and mobile widths.
3. Commit only the intended files.
4. Push to `main` or open a review branch, depending on the hosting workflow.

## Current salon details

The website currently presents:

- Five-star reviews on Fresha and Google
- Hours: Monday–Sunday, 10:00 AM–12:00 AM
- Team: ABED, Shahem, Joe, Tiya
- Phone and WhatsApp: +971 56 228 5900
- Online booking: `https://tigergentssaloon.setmore.com`

Keep these details aligned with the salon’s services and booking setup.

## Project structure

```text
assets/
  brand/       Primary logo, alternate logo, icons, and social exports
  css/         Design system and responsive layout
  images/      Supplied salon photography
  js/          Shared behavior and structured service data
docs/          Requirements and handover reports
scripts/       Project integrity check
*.html         Public pages
```

## Important launch notes

- Add email, social links, team biographies, team portraits, product-brand details, parking information, or legal business information when the salon chooses to publish them.
- Google Tag Manager is installed. Configure any tags in container `GTM-K6LPRZ84` to respect the site’s consent choice.
- The visible primary logo is `assets/brand/logo_transparent.png` (1535×1024 RGBA). `assets/brand/logoblackbackground.png` is retained as an alternate.
- Manrope and Bodoni Moda are self-hosted from open-source variable-font files; retain the font licence files in `assets/fonts/`.
