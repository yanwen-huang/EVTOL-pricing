# EVTOL-Pricing Backend

## Usage

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Set your Amap API key in `.env`:
   ```env
   AMAP_KEY=your_amap_key
   ```
   If not set, the default key will be used.
3. Start the server:
   ```bash
   node index.js
   ```

## API Endpoints

- `POST /api/route/driving`
  - Body: `{ origin: "lng,lat", destination: "lng,lat" }`
  - Returns: Driving route info

- `POST /api/route/transit`
  - Body: `{ origin: "lng,lat", destination: "lng,lat", city: "cityname", cityd: "cityname" }`
  - Returns: Public transit (including intercity)

- `POST /api/route/straight`
  - Body: `{ origin: "lng,lat", destination: "lng,lat" }`
  - Returns: Straight line distance 