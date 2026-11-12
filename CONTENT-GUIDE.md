# Content guide

The site is plain HTML/CSS/JS in `site/`. No build step. Preview locally:

```
cd site && python3 -m http.server 8000     # then open http://localhost:8000
```

(The page loads its content with `fetch`, so open it through a server, not by double-clicking `index.html`.)

## Change the brand
Edit `site/data/brand.json`: `name`, `slogan`, `story`, `season`, `location`, `instagram`, `email`.
The hero wordmark, nav, footer word, page title and copyright all read from it.
In `story`, wrap a word in `*asterisks*` to give it the highlighted-block treatment.
The wordmark auto-fits any name; two-word names split over two lines.

## Add a product
Add an object to `site/data/products.json`:

```json
{
  "id": "hoodie-03",
  "name": "Heavy Hoodie",
  "description": "Fabric, fit, care.",
  "category": "Hoodies",
  "colors": [{ "name": "Black", "hex": "#111111" }],
  "sizes": ["S", "M", "L", "XL"],
  "price": null,
  "photos": { "front": { "file": "images/hoodie-03-front.webp", "width": 1200, "height": 1500 } }
}
```

* A new `category` automatically gets its own panel in the horizontal "Shop" section and a filter chip.
* `price: null` shows "Price on request". Put a number or string there later.
* Add a colour by adding another `{name, hex}` — a swatch appears on the card.

## Photos
Each card shows its expected file name and size (front, back, detail, on-model; 1200×1500 WebP).
Drop files into `site/images/`. Real `<img>` rendering of these slots is the next step; until then the
placeholder silhouettes are tinted with the swatch colour.

## Motion
All motion lives in `site/js/app.js`; every effect is labelled by section number in the scroll engine.
`prefers-reduced-motion` turns off pinning, scrubbing, the intro and the cursor.

## Deploy
`vercel.json` points Vercel at `site/`. Import the repo in Vercel, or run `vercel --prod`.
