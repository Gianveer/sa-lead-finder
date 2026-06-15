# SA Lead Finder

Find small businesses in South Africa that have a phone number but **no website** —
the perfect list to call or WhatsApp and offer to build them one.

**100% free. No API key, no credit card, no server.** It's a single web page that
runs entirely in your browser and pulls business data straight from OpenStreetMap:

- **Nominatim** turns a place name like "Durban" into a map area.
- **Overpass** returns businesses in that area.

It keeps only the ones with a phone but **no website**, lets you tick each lead once
you've contacted it (saved in your browser), and export the list to CSV.

---

## Use it on your phone

Once this repo is published with **GitHub Pages**, open this address on any device:

```
https://YOUR-USERNAME.github.io/sa-lead-finder/
```

(Replace `YOUR-USERNAME` with your GitHub username.) That's the whole app — no
install needed. Add it to your phone's home screen for one-tap access.

## Run it locally

It's just static files, so you can also open `index.html` directly in a browser,
or serve the folder with any static server.

---

## How to use

- **Business type** — e.g. `plumbers`, `hair salons`, `mechanics`, `restaurants`.
  Pick from the dropdown suggestions for the best matches.
- **City / area** — e.g. `Durban`, `Sandton`, `Cape Town`. Required.
- Tap **Find leads** → businesses with no website.
- Use **WhatsApp** / **Call** to reach out.
- Tick a lead once you've messaged it — remembered on that device.
- **Export CSV** downloads everything you found.

## Supported business types

Plain-English terms map to the right data automatically: plumbers, electricians,
hair salons, barbers, beauty salons, spas, restaurants, cafes, takeaways, builders,
mechanics / car repair / panel beaters, painters, carpenters, landscapers, dentists,
doctors, lawyers, accountants, bakeries, butchers, florists, photographers, caterers,
guest houses, gyms, pharmacies, car washes, clothing / furniture / hardware shops,
opticians, vets, locksmiths, and more. Other terms try to match the business name.

## How it decides "no website"

OpenStreetMap entries can list a website and a phone. This tool keeps only entries
that have a **phone but no website** — a strong signal they have no web presence,
exactly who you want to pitch.

## Coverage

Community-mapped data: very good in cities and larger towns, thinner in small/rural
areas. If a search is light, try a major city or a more common business type.

## Responsible use (POPIA)

You're contacting businesses for B2B marketing. South Africa's POPIA has rules for
direct marketing — always identify yourself, offer an easy opt-out, and stop if
asked. Keep your outreach genuinely useful and you'll stay on the right side of it.
