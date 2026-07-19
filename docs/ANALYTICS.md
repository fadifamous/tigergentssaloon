# Analytics implementation

No analytics vendor is enabled in the source build.

The website pushes privacy-safe events to `window.dataLayer`. Connecting a vendor later must include a consent and privacy review.

## Events

- `booking_click`
  - `booking_click_location`
  - `booking_click_page`
  - `booking_click_device`
- `maps_click`
- `fresha_profile_click`
- `review_source_click`
- `service_category_select`
- `gallery_open`
- `cookie_choice`

No name, phone number, appointment detail, selected service health information, or payment information is attached.
