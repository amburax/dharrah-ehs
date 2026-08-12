# dharrah-ehs

Website for Dharrah EHS Veterans Pvt Ltd.

## Phase 1 deployment notes

- Canonical and sitemap URLs are set to `https://www.dharrahehs.com/`.
- Frontend runtime config lives in [index.html](D:/DHARRAH/index.html) under `window.DHARRAH_CONFIG`.
- Contact form submissions are now routed through the same Pages project at `window.DHARRAH_CONFIG.contactEndpoint`, which defaults to `/api/contact`.
- Google Analytics only loads when `window.DHARRAH_CONFIG.analyticsMeasurementId` is set to a real GA4 Measurement ID.

## Pages Function secrets

The Cloudflare Pages Function in [functions/api/contact.js](D:/DHARRAH/functions/api/contact.js) expects these environment variables in the Pages project:

- `RESEND_API_KEY`
- `FROM_EMAIL` optional
- `CONTACT_RECIPIENT` optional
- `ALLOWED_ORIGINS` optional comma-separated list

## Legacy worker note

- [worker-v2.js](D:/DHARRAH/worker-v2.js) remains in the repo as the earlier standalone worker implementation, but the live site should now use the same-domain Pages Function route instead of the external `workers.dev` endpoint.

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

## Phase 6 notes

- [scripts/dharrah-runtime.js](D:/DHARRAH/scripts/dharrah-runtime.js) now injects the Smart Biogas / Waste-to-Energy offering in two places: a compact teaser on the home view (`#dh-home-biogas-teaser`, placed after the "How We Help" section) and the full detail section on the services view (`#dh-biogas-section`, appended to `.srv-inner`).
- The home teaser CTA switches to the services route through the navbar link and then scrolls to `#dh-biogas-section`; the services CTA routes to the contact section. Both emit `cta_click` through `window.trackDharrahEvent(...)` with `biogas_view_details` and `biogas_site_assessment` names.
- Biogas WhatsApp links carry a biogas-specific prefilled message and are marked `data-dh-keep-href="true"` so `normalizePublicContactDetails` leaves their query text alone.
- [llms.txt](D:/DHARRAH/llms.txt) now lists the biogas service group, specifications, and track record for answer engines.

## Phase 7 notes

- The biogas offering is now discoverable from the services page itself: [scripts/dharrah-runtime.js](D:/DHARRAH/scripts/dharrah-runtime.js) appends an `08 / Biogas & Energy` pill to `.qnav-inner` and updates the services header badge from 21 to 22 services.
- The "Service Required" dropdowns now include a `Smart Biogas & Waste-to-Energy` option, inserted before `Multiple / Not Sure`, so biogas leads keep their intent instead of falling into the generic bucket.
- A dedicated biogas intake overlay (`#dh-biogas-overlay`, `#dh-biogas-form`) collects the three sizing inputs that make a real quote possible (daily organic waste, current fuel spend, available footprint) plus site and contact details. It reuses the existing honeypot, minimum-completion-time, and cooldown guards, and posts to the shared contact endpoint. Events: `biogas_intake_open`, `biogas_intake_submit_attempt`, `biogas_intake_submit`, `biogas_intake_success`, `biogas_intake_validation_error`, `biogas_intake_blocked`, `biogas_intake_error`.
- The services section now opens with an inline SVG process diagram (feedstock, sealed digestion, three outputs) that scrolls horizontally on narrow screens.
- Structured data in [index.html](D:/DHARRAH/index.html) now carries the biogas offering across `knowsAbout`, `hasOfferCatalog`, the services `ItemList`, and both the home and services `FAQPage` blocks. Services route metadata now reads 22 services.
- Known pre-existing issue, unrelated to these changes: deep-linking to `https://www.dharrahehs.com/#services` renders the home view, because the React route state ignores the URL hash on initial load. Navigation via the navbar works correctly.

## Phase 8 notes

- The biogas blocks now use green headings (`#1a7a4c`) for section titles, subheads, card headings, table headers, and diagram stage labels, while body copy stays slate (`#556887`) for contrast. The green is scoped to the biogas blocks only, so the site-wide navy and red identity is unchanged.
- An ROI calculator (`[data-dh-biogas-calc]`) sits above the specification table. Daily waste (slider plus number input, kept in sync) and the client's own LPG rate drive four live outputs: purified gas, bio-fertilizer, monthly fuel cost offset, and tons diverted per year. Ratios are scaled from the published 500 kg/day reference unit and the block is explicitly labelled indicative, not a quotation.
- "Send These Numbers for a Site Assessment" opens the intake overlay with the waste quantity and a full estimate summary prefilled into the notes field, and emits `biogas_calculator_send`.
