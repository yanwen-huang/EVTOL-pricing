const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = 3001;
const AMAP_KEY = process.env.AMAP_KEY || 'b253fb34885439b30641245a2632413b';

app.use(cors());
app.use(express.json());

// 驾车路径规划
app.post('/api/route/driving', async (req, res) => {
  const { origin, destination } = req.body;
  try {
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${origin}&destination=${destination}&extensions=all&strategy=12&key=${AMAP_KEY}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Driving route error', detail: error.message });
  }
});

// 公共交通（含跨城）
app.post('/api/route/transit', async (req, res) => {
  const { origin, destination, city, cityd } = req.body;
  try {
    const url = `https://restapi.amap.com/v3/direction/transit/integrated?origin=${origin}&destination=${destination}&city=${city}&cityd=${cityd}&key=${AMAP_KEY}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Transit route error', detail: error.message });
  }
});

// 直线距离
app.post('/api/route/straight', async (req, res) => {
  const { origin, destination } = req.body;
  try {
    const url = `https://restapi.amap.com/v3/distance?origins=${origin}&destination=${destination}&type=0&key=${AMAP_KEY}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Straight line distance error', detail: error.message });
  }
});

app.listen(PORT, '0.0.0.0',() => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 