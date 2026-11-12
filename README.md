# homegrown — clothing store build brief

Handoff repo for the store build. This repo holds the build brief only — the
website itself is built from this brief by the other agent. The site must
never use the repo name "homegrown" anywhere on it (see Branding below).

---

# Clothing store — build brief

## Goal

Build the online store for an independent local clothing brand.
Priorities, in order: stylish, then professional. It must be interactive and efficient.
The owner will add his own brand name, product photos and details afterwards,
so every placeholder must make it obvious what goes where.

## Branding (placeholder for now)

- The real brand name, slogan and logo are not confirmed. Do not use the repo
  name "homegrown" anywhere on the site.
- Use the placeholder name "Your Label" and the placeholder slogan
  "Your slogan goes here".
- Keep brand name, slogan, logo file and brand story text in one config file
  (`site/data/brand.json`). Every page, the page titles, the footer and the
  order emails read from it, so changing the brand is a single edit.
- Logo is a simple text wordmark built from the brand name until a logo file
  is supplied.
- The brand story section on the home page uses clearly marked placeholder text.
- Explain how to change all of this in `CONTENT-GUIDE.md`.

## Design

- Use the ui-ux-pro-max skill: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Install it (believed to be `npx uipro-cli init --ai claude`; confirm on install).
- Run its design-system generator first for an independent streetwear brand store.
- Save the output to `design-system/MASTER.md` and derive all styling from it
  (palette, typography, spacing, effects, anti-patterns, pre-delivery checklist).

## Tech approach

- Static site: plain HTML, CSS and JS. No framework, no build step.
- One data file (`site/data/products.json`) drives every listing, so products
  can be edited without touching code.
- Hosted on Vercel.

## Pages and features

- Home: hero, category tiles, featured products grid, short brand story section.
- Shop: instant client-side filter (category, color), sort, live search.
- Product card: color swatch circles; clicking a swatch swaps the photo on the card.
- Product page: gallery with thumbnails and zoom, color swatches, size picker, add to bag.
- Cart: slide-out drawer, quantity edit, saved in localStorage, remembers the exact
  product, color and size chosen.

## Placeholders

- Neutral sample products (for example "Sample Hoodie 01") across sample categories
  such as Hoodies, Sweatshirts, Jeans and Sneakers.
- Each product has labelled photo slots (front, back, detail, on-model) with the
  expected file name and dimensions shown in the placeholder.
- Product fields: id, name, description, category, colors (with swatch hex),
  sizes, price, photos.
- Include a short `CONTENT-GUIDE.md` explaining how to add a product, a color and photos.

## Pricing

- Show "Price on request" on every product.
- Small, discreet but noticeable notice: "Store is in beta. Prices will be displayed soon."
- Keep a `price` field in the data, ready to fill in later.

## Checkout and fulfilment email

- Add to cart from the product card (quick-add) and the product page.
- Checkout is an order-request form, no online payment:
  - Customer fields: name, email, phone, shipping address, optional note.
  - The shopper sees a confirmation page with an order reference.
- On submit, the form posts the order to a Google Apps Script web app that is
  attached to the owner's supplier Google Sheet (kept in his Google Drive).
- Each order line in the owner's email shows: product name, color, size, quantity.
- For each line, the script looks up the manufacturer details in the Sheet,
  matched on product id + color, and adds them to the email: manufacturer name,
  manufacturer's item number, manufacturer's color name, and reorder link.
- The script emails the order to the owner from his own Gmail account.
- The script also sends the shopper a copy of what they ordered, without the
  manufacturer details.
- Manufacturer details are read by the script only. They never appear on the
  site or in the shopper's email.
- If a line has no matching row, the email flags it clearly instead of failing.
- No third-party email service and no API keys. The only setting on the site is
  the script's web app URL.
- Basic spam protection on the form (honeypot field, plus a simple rate limit
  in the script).
- Provide the full script, a template of the Sheet's columns, and step-by-step
  deploy instructions in `CONTENT-GUIDE.md`.

## Efficiency

- One CSS file and one JS file.
- Lazy-loaded images, WebP, explicit width and height, responsive `srcset`.
- Target Lighthouse 95 or higher for performance, accessibility and best practices.

## Quality checks

- Responsive at 375, 768, 1024 and 1440 px.
- Text contrast at least 4.5:1, visible keyboard focus, `prefers-reduced-motion` respected.
- SVG icons, no emoji.
- Playwright tests: swatch swap, add to cart with the correct color and size,
  filters, order form submission (with the script URL mocked). Screenshots at
  all four widths.
- Run the skill's pre-delivery checklist.

## Files

site/index.html, site/shop.html, site/product.html
site/css/styles.css
site/js/app.js, cart.js, filters.js, product.js
site/data/products.json
site/data/brand.json
site/images/ (placeholder slots)
apps-script/order-email.gs (script the owner pastes into his Sheet)
design-system/MASTER.md
CONTENT-GUIDE.md

## Delivery

- Commit and push to the working branch. No pull request unless asked.
- Deploy to Vercel and share the URL.
