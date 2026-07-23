# Analytics implementation

Google Tag Manager container `GTM-K6LPRZ84` is installed in the `<head>` and immediately after `<body>` on every public HTML page.

The website pushes privacy-safe events to `window.dataLayer`. Tags configured inside Google Tag Manager must respect the visitor’s consent choice and the published privacy notice.

## Events

- `booking_click`
  - `booking_click_location`
  - `booking_click_page`
  - `booking_click_device`
  - `booking_provider`
  - `booking_destination_host`
- `maps_click`
- `phone_click`
  - `phone_click_location`
- `whatsapp_click`
  - `whatsapp_click_location`
- `google_reviews_click`
- `service_category_select`
- `gallery_open`
- `cookie_choice`

No name, phone number, appointment detail, selected service health information, or payment information is attached.
