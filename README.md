# EVTOL-Pricing

EVTOL-Pricing is a web application for simulating and comparing eVTOL (electric vertical takeoff and landing) travel routes and pricing. The project consists of a React + Vite frontend and a Node.js backend, integrating Amap (Gaode) APIs for real-world route and distance data.

---

## Features
- Fullscreen interactive Amap (Gaode) map
- Click to select start and end points
- Automatically fetches driving, public transit, and straight-line (as-the-crow-flies) routes
- Results displayed as cards with route details
- English UI
- Backend API for route calculation and data aggregation

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
git clone https://github.com/yourusername/EVTOL-Pricing.git
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