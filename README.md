## Pixel for Wplace

Convert images into Wplace-compatible pixel art in the browser. Drag & drop an image, choose pixel size, map to the Wplace palette, preview color usage and grid metrics, open a Picture‑in‑Picture reference, and download the result as PNG.

### Getting Started
1. Install dependencies:
```bash
npm install
```
2. Run the dev server:
```bash
npm run dev
```
3. Open `http://localhost:3000` and drop an image to begin.

### Usage
1. Drag & drop an image (or use the file picker)
2. Adjust the Pixel Size slider and click "Generate Pixel Art"
3. Review metrics and color usage; optionally open PiP
4. Download the PNG when satisfied

### Development
- Edit UI/logic in `src/app/page.tsx`
- Global styles/theme in `src/app/globals.css`
- Wplace palette in `wplace-colors.json`

### Features
- Adjustable pixel size (2–50 px) to balance detail vs. effort
- Quantization to the Wplace color palette
- Metrics: grid size, pixels to paint, compression ratio
- Color usage panel sorted by frequency
- Hover inspector with color name and RGB
- Picture‑in‑Picture floating reference window
- Export pixelated result as PNG

### Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- HTML Canvas for image processing

