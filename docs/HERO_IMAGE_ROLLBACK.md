# Homepage hero image

The refined interior image approved on 8 October 2026 is used only for the homepage hero. Its responsive WebP files are:

- `assets/images/salon-hero-refined-640.webp`
- `assets/images/salon-hero-refined-960.webp`
- `assets/images/salon-hero-refined-1536.webp`

The original hero assets are retained in GitHub and the deployment:

- `assets/images/salon-depth-640.webp`
- `assets/images/salon-depth-800.webp`
- `assets/images/salon-depth-opt.webp`
- `assets/images/salon-depth.jpeg` (original source)

The gallery and other uses of the original interior image remain unchanged. Hero crop, gradients, text, and buttons are unchanged.

## Restore the original hero

In `index.html`, replace only the `<img class="hero-media">` element at the beginning of the hero section with this original markup:

```html
<img class="hero-media" src="assets/images/salon-depth-opt.webp" srcset="assets/images/salon-depth-640.webp 640w, assets/images/salon-depth-800.webp 800w, assets/images/salon-depth-opt.webp 1200w" sizes="100vw" alt="" width="1200" height="800" fetchpriority="high">
```

Run the site checks and build, inspect the homepage on desktop and mobile, and publish that focused change to `main`. No images need to be recreated or uploaded. Do not revert unrelated promotions or team updates.

The previous hero markup is also available in commit `5594dff`.
