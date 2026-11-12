# Content guide

The site is plain HTML/CSS/JS in `site/`. No build step. Preview locally:

```
cd site && python3 -m http.server 8000     # then open http://localhost:8000
```

(The page loads its content with `fetch`, so open it through a server, not by double-clicking `index.html`.)

## Change the brand
Edit `site/data/brand.json`: `name`, `slogan`, `story`, `season`, `location`, `instagram`, `email`.
The hero wordmark, nav, footer, page title and copyright all read from it.
In `story`, wrap a word in `*asterisks*` to set it in gold italic.

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

* A new `category` automatically gets its own tile in "Categories" and a filter in "The collection".
* `price: null` shows "Price on request". Put a number or string there later.
* Add a colour by adding another `{name, hex}`; a swatch appears on the card.

## Photos
Each tile shows its expected file name and size. Drop files into `site/images/`.
Rendering real photos in these slots is the next step; until then the placeholder garment is tinted with the swatch colour.

## The silk animation
The hero and Atelier backgrounds are drawn live in `site/js/app.js` (search for "Silk shader").
Colours are in `PAL`, loop length in `PERIOD` (seconds). It pauses off-screen, shows a still frame for
reduced-motion users, and falls back to a plain gradient where WebGL is unavailable.

## Deploy
`vercel.json` points Vercel at `site/`.
