# Performance report

Reviewed: 19 July 2026

## Local Lighthouse result

Mobile-throttled homepage audit after optimization:

- Performance: 90
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- First Contentful Paint: 1.1 s
- Largest Contentful Paint: 3.3 s
- Cumulative Layout Shift: 0.087
- Total Blocking Time: 0 ms
- Initial audited transfer: approximately 686 KiB

Scores are local lab measurements and may vary between runs. Production compression, caching, CDN delivery, and real device conditions are not represented. The 75th-percentile field target remains LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1.

## Performance strategy

- Static HTML delivery with no framework runtime
- One shared CSS file and one small shared JavaScript file
- No booking embed, map iframe, autoplay video, or carousel library; Google Tag Manager loads asynchronously
- AVIF used for several major images
- Optimized WebP derivatives and a responsive hero `srcset`
- Below-the-fold images use native lazy loading
- Hero image dimensions are reserved to reduce layout shift
- Self-hosted variable fonts use `display=swap`
- Motion uses transform and opacity only
- Reduced-motion users receive immediate static content

## Expected critical path

1. HTML
2. Shared CSS
3. Hero JPEG
4. Font stylesheets
5. Deferred shared JavaScript

## Launch recommendations

- Serve Brotli or gzip compression
- Add immutable caching for versioned assets
- Add responsive `srcset` variants for below-the-fold gallery and service images
- Subset the self-hosted Manrope and Bodoni Moda files further if multilingual support is not needed
- Run Lighthouse and WebPageTest against the deployed production URL
- Confirm LCP, INP, and CLS with real-user monitoring

No synthetic production score is claimed before deployment because local scores do not represent the final CDN, DNS, cache, or device conditions.
