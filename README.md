# AEGIS — Aerial Engagement & Grid Identification System

Drone-based license plate recognition demo built for Delta Defense Systems.

## Features

- **Real-time plate scanning** via camera capture or image upload
- **Client-side OCR** — all processing happens on-device (Tesseract.js)
- **Confidence scoring** — per-word and aggregate confidence metrics
- **Pinch-to-zoom** — inspect detected plates at full resolution
- **Parking validation** — mock VALID/EXPIRED/UNKNOWN status
- **Intel feed** — searchable, filterable history of all detections

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- Tesseract.js v5 (client-side OCR via Web Workers)
- react-zoom-pan-pinch (mobile zoom/pan)
- Framer Motion (animations)
- Zustand (state management)
- Deployed on Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

## Deployment

```bash
vercel deploy --prod
```
