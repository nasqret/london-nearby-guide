# London Near

London Near is a mobile-first progressive web app for exploring essential
London sights and finding cafes, restaurants, and shops around the browser's
current position. Every place has a one-tap walking directions link that opens
Google Maps.

Live app: <https://nasqret.github.io/london-nearby-guide/>

## Features

- Curated London landmarks, museums, markets, and green spaces
- Browser geolocation with nearest-first distance sorting
- Live nearby cafe, restaurant, and shop lookup
- One-tap walking directions in Google Maps
- Installable PWA with an offline app shell
- Responsive, accessible interface with no framework or build step
- No account, analytics, API key, or stored location history

## Run locally

Geolocation requires HTTPS or a localhost origin.

```bash
npm run verify
npm run serve
```

Then open <http://localhost:4173>.

## How it works

The app does not persist the user's coordinates or keep location history.
Coordinates are sent to a public OpenStreetMap Overpass endpoint when the user
requests live nearby places. The result list is sorted using a client-side
Haversine distance calculation.

Directions use the documented Google Maps URL format, so the app does not need
a Google Maps API key. A directions link includes the current and destination
coordinates only after the user taps it. On supported phones, the URL can open
directly in the Google Maps app.

## Data and limitations

- Nearby place names, coordinates, addresses, and opening-hour tags come from
  [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- The curated sight list was informed by the official
  [Visit London attraction guide](https://www.visitlondon.com/things-to-do/sightseeing/london-attraction/top-ten-attractions),
  updated June 2, 2026.
- OpenStreetMap is community-maintained, so coverage and opening hours may be
  incomplete. Confirm time-sensitive details with the venue.
- Live nearby results require an internet connection. The interface and curated
  sights remain available after the PWA has been cached.

## Project structure

```text
.
├── assets/                 App icons
├── js/
│   ├── app.js              UI, geolocation, and state
│   ├── data.js             Curated London sights
│   ├── nearby.js           Overpass queries and place parsing
│   └── utils.js            Distance and Google Maps helpers
├── tests/run-tests.js      Dependency-free unit tests
├── index.html
├── manifest.webmanifest
├── styles.css
└── sw.js                   Offline app-shell cache
```

## License

[MIT](./LICENSE)
