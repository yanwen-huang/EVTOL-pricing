# EVTOL-Pricing

## App Introduction

**EVTOL-Pricing** is a web application designed to simulate, analyze, and compare the costs of various urban transportation modes—including traditional ground transport (fuel cars, EVs, taxis, robotaxis) and innovative eVTOL (electric vertical takeoff and landing aircraft). Inspired by the rapid evolution of urban mobility, this tool helps users make data-driven decisions by providing intuitive cost comparisons, smart analysis, and real-world route calculations.

## Key Features
- **Comprehensive Cost Comparison:** Calculate and compare travel costs for fuel cars, EVs, robotaxis, taxis, and eVTOLs.
- **Smart Analysis & Visualization:** AI-powered English analysis and bar charts clearly present price differences and offer eVTOL pricing recommendations.
- **Route & Price Calculation:** Integrates with mapping APIs to fetch real-world route data, detour factors, and compute costs for each mode.
- **User-Friendly Interface:** Clean, intuitive UI with one-click export of analysis results.

## Target Users
- **Urban Planners & Policymakers:** For multi-modal transport planning, cost estimation, and policy support.
- **eVTOL & Mobility Innovators:** To assist with market pricing, business model design, and feasibility studies.
- **Researchers & Academics:** For data collection and analysis in transport behavior and cost structure studies.
- **General Travelers:** To help users understand cost differences and make better travel choices.

---

## Tech Stack
- **Frontend:** React, Vite, Amap JS SDK
- **Backend:** Node.js, Express

---

## Directory Structure
```
EVTOL-Pricing/
  backend/    # Node.js backend service
  frontend/   # React frontend application
```

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yanwen-huang/EVTOL-Pricing.git
cd EVTOL-Pricing
```

### 2. Setup the Backend
```bash
cd backend
npm install
```
(Optional) Set your Amap API key in `.env`:
```
AMAP_KEY=your_amap_key
```
If not set, a default key will be used.

Start the backend server:
```bash
node index.js
```
The backend runs at `http://localhost:3001` by default.

### 3. Setup the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Endpoints (Backend)
- `POST /api/route/driving`
  - Body: `{ origin: "lng,lat", destination: "lng,lat" }`
  - Returns: Driving route info
- `POST /api/route/transit`
  - Body: `{ origin: "lng,lat", destination: "lng,lat", city: "cityname", cityd: "cityname" }`
  - Returns: Public transit (including intercity)
- `POST /api/route/straight`
  - Body: `{ origin: "lng,lat", destination: "lng,lat" }`
  - Returns: Straight line distance

---

## Notes
- The frontend expects the backend to be running at `http://localhost:3001` for API requests.
- Make sure your Amap API key is valid for production use.

---

## License
MIT 