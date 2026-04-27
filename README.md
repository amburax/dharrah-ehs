# dharrah-ehs

Website for Dharrah EHS Veterans Pvt Ltd.

## Phase 1 deployment notes

- Canonical and sitemap URLs are set to `https://www.dharrahehs.com/`.
- Frontend runtime config lives in [index.html](D:/DHARRAH/index.html) under `window.DHARRAH_CONFIG`.
- Contact form submissions are routed through `window.DHARRAH_CONFIG.contactEndpoint`.
- Google Analytics only loads when `window.DHARRAH_CONFIG.analyticsMeasurementId` is set to a real GA4 Measurement ID.

## Worker secrets

The Cloudflare Worker in [worker-v2.js](D:/DHARRAH/worker-v2.js) now expects secrets and config through environment variables:

- `RESEND_API_KEY`
- `FROM_EMAIL` optional
- `CONTACT_RECIPIENT` optional
- `ALLOWED_ORIGINS` optional comma-separated list

## Phase 2 notes

- The main SEO tags in [index.html](D:/DHARRAH/index.html) are now consolidated to one description tag, one canonical link, and one Open Graph/Twitter block.
- Home and services views share one route-aware metadata script that updates title, description, Open Graph, Twitter, and JSON-LD schema.
- Conversion tracking now emits `cta_click`, `form_submit`, `whatsapp_click`, `phone_click`, and `email_click` through `window.trackDharrahEvent(...)`.

## Phase 3 notes

- The contact/runtime customizations now live in [scripts/dharrah-runtime.js](D:/DHARRAH/scripts/dharrah-runtime.js) instead of multiple inline retry scripts in [index.html](D:/DHARRAH/index.html).
- Contact automation no longer depends on placeholder text selectors. The runtime assigns stable `data-dh-*` hooks to the active form and fields, then uses those hooks for the phone picker, validation, submission, and reset flows.
- The services-page and SEO enhancement layers now use mutation observers plus scheduled refreshes instead of repeated timeout loops and interval polling.

## Phase 4 notes

- The shared runtime now injects trust-oriented conversion blocks into the live UI: a hero proof band, a stronger inquiry proof panel, a "what happens next" section, and services CTA proof chips.
- Contact forms now include a hidden honeypot field, a minimum completion-time guard, and a short browser cooldown after successful submission to reduce low-quality spam.
- Conversion tracking now emits richer form lifecycle events through `window.trackDharrahEvent(...)`, including `form_submit_attempt`, `form_submit_validation_error`, `form_submit_blocked`, `form_submit_success`, and `form_submit_error`.
- Inquiry forms now expose an inline status area for response promises, sending state, success confirmation, and recovery messaging in addition to the popup feedback.

## Phase 5 notes

- GEO support now includes on-page AI-readable summary sections and FAQ content injected by [scripts/dharrah-runtime.js](D:/DHARRAH/scripts/dharrah-runtime.js) for both the home and services views.
- Route-aware structured data in [index.html](D:/DHARRAH/index.html) now includes FAQPage and richer service-list schema so answer engines can connect user questions to Dharrah's visible service claims.
- A root [llms.txt](D:/DHARRAH/llms.txt) now provides a compact machine-readable summary of the business, service groups, industries served, and primary contact path.
