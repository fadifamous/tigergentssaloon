# Accessibility report

Reviewed: 19 July 2026

Target: WCAG 2.2 Level AA

## Implemented

- Semantic page landmarks and one page-level heading
- Skip link on every page
- Keyboard-operable navigation, service filters, FAQ disclosure elements, buttons, and gallery
- Escape-to-close mobile navigation and gallery dialog
- Focus return after mobile navigation closes
- Visible high-contrast focus indicators
- Minimum 44–50 px interactive target sizing for key controls
- Meaningful alternative text for content photography
- Decorative hero image intentionally uses empty alt text
- No essential hover-only content
- Dark-theme contrast designed with ivory and stone text on obsidian/charcoal surfaces
- Reflow rules for 320 px screens and 200% zoom
- `prefers-reduced-motion` support
- Native dialog for lightbox focus handling
- Mobile sticky actions include safe-area insets and hide near the footer
- Form controls are not used because the site does not collect user data

## Known constraints

- The supplied primary logo is detailed raster artwork; fine decorative features are not readable at favicon size. The image alt text provides the salon name.
- External Setmore, WhatsApp, Google Reviews, and Google Maps experiences are outside this codebase.
- A full assistive-technology test with representative users remains recommended before a public launch.

## Manual launch checklist

- Keyboard through all pages in current Chrome, Safari, Firefox, and Edge
- VoiceOver smoke test on iOS and macOS
- TalkBack smoke test on Android
- Windows Narrator smoke test
- 200% and 400% zoom
- High-contrast and forced-colors mode
- Reduced-motion mode
- Text-only review with CSS disabled
