import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Button, Spin, message, Tabs, AutoComplete, Input, Radio, Modal, Form } from 'antd';
import 'antd/dist/reset.css';
import './App.css';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactECharts from 'echarts-for-react';
import { Modal as AntdModal } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList, Cell } from 'recharts';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function App() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [points, setPoints] = useState([]); // [{lng, lat}]
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [autoOptions, setAutoOptions] = useState([]);
  const [selectType, setSelectType] = useState('start'); // start or end
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [amapKey, setAmapKey] = useState('b253fb34885439b30641245a2632413b');
  const [deepseekKey, setDeepseekKey] = useState('sk-a9dc4b7c737943579406c1788ea253e1');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [poiMarkers, setPoiMarkers] = useState([]);
  const [showAssumptions, setShowAssumptions] = useState({ fuel: false, ev: false, taxi: false, evtol: false, robotaxi: false });
  const toggleAssumption = (key) => setShowAssumptions(s => ({ ...s, [key]: !s[key] }));
  const [monthIncome, setMonthIncome] = useState(50000);
  const hourValue = monthIncome / (22 * 8);
  // DeepSeek对话Modal相关状态
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState('');
  const [qaHistory, setQaHistory] = useState([]); // {role, content}

  // 1. 新增Gemini分析相关状态
  const [geminiAnalysis, setGeminiAnalysis] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState('');

  // 在App.jsx顶部添加参数的useState
  const [fuelPurchaseCost, setFuelPurchaseCost] = useState(200000);
  const [fuelYears, setFuelYears] = useState(8);
  const [fuelAnnualMileage, setFuelAnnualMileage] = useState(12000);
  const [fuelParkingMonthly, setFuelParkingMonthly] = useState(800);
  const [fuelPrice, setFuelPrice] = useState(7.6);
  const [fuelConsumption, setFuelConsumption] = useState(8.0);

  const [evPurchaseCost, setEvPurchaseCost] = useState(160000);
  const [evYears, setEvYears] = useState(8);
  const [evAnnualMileage, setEvAnnualMileage] = useState(12000);
  const [evParkingMonthly, setEvParkingMonthly] = useState(800);
  const [evElectricityPrice, setEvElectricityPrice] = useState(0.5);
  const [evConsumption, setEvConsumption] = useState(15);

  // Robotaxi parameters state (moved to top level)
  const [robotaxiParams, setRobotaxiParams] = useState({
    energyPer100km: 15, // kWh/100km
    electricityPrice: 0.8, // RMB/kWh
    chargingServiceFeePerKwh: 0.2, // RMB/kWh
    parkingFeePer100km: 2, // RMB/100km
    tollPerKm: 0.5, // RMB/km
    vehiclePrice: 300000, // RMB
    depreciationYears: 5, // years
    annualMileage: 80000, // km/year
    computeCostPerKm: 0.3, // RMB/km
    maintenancePerKm: 0.15, // RMB/km
    insurancePerYear: 8000, // RMB/year
    taxPerYear: 2000, // RMB/year
    tirePerYear: 3000, // RMB/year
    remoteMonitorPerKm: 0.05, // RMB/km
    operatorServiceRate: 0.15, // 15%
    adRevenuePerKm: 0.1, // RMB/km
  });
  // taxi计价参数(可编辑)
  const [baseFare, setBaseFare] = React.useState(12);
  const [baseDist, setBaseDist] = React.useState(3);
  const [midDist, setMidDist] = React.useState(15);
  const [midRate, setMidRate] = React.useState(2.6);
  const [highRate, setHighRate] = React.useState(2.8);
  const [returnDist, setReturnDist] = React.useState(20);
  const [timeRate, setTimeRate] = React.useState(0.5);
  const [returnRatio, setReturnRatio] = React.useState(0.5);

  // 参数useState
  const [evtolParams, setEvtolParams] = React.useState({
    aircraftPrice: 20000000, // RMB
    aircraftLifespanYears: 10,
    annualFlightHours: 2500,
    seats: 4,
    computeCostPerHour: 500, // RMB/h
    airwayCostPerKm: 5, // RMB/km
    vertiportCostPerFlight: 200, // RMB/flight
    parkingCostPerHour: 100, // RMB/h
    maintenancePerHour: 1200, // RMB/h
    energyPerHour: 300, // RMB/h
  });

  // 初始化2D地图
  useEffect(() => {
    if (window.AMap && amapKey) {
      if (map) {
        map.destroy();
        setMap(null);
      }
      // 获取用户地理位置
      const defaultCenter = [116.397428, 39.90923]; // 北京
      const createMap = (center) => {
        const m = new window.AMap.Map('map', {
          resizeEnable: true,
          zoom: 11,
          center,
          mapStyle: 'amap://styles/dark'
        });
        setMap(m);
      };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            createMap([pos.coords.longitude, pos.coords.latitude]);
          },
          () => {
            createMap(defaultCenter);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        createMap(defaultCenter);
      }
    }
    // eslint-disable-next-line
  }, [amapKey]);

  // 地图点击事件
  useEffect(() => {
    if (!map) return;
    const handleClick = (e) => {
      if (points.length >= 2) return;
      const lnglat = e.lnglat;
      setPoints((prev) => [...prev, { lng: lnglat.lng, lat: lnglat.lat }]);
    };
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
    // eslint-disable-next-line
  }, [map, points]);

  // 添加/更新marker，仅2D
  useEffect(() => {
    if (!map) return;
    // 清除旧marker
    markers.forEach((m) => map.remove(m));
    const newMarkers = points.map((p, idx) => {
      if (idx === 1) {
        // 终点marker：渐变红色圆形，无label
      return new window.AMap.Marker({
        position: [p.lng, p.lat],
        map,
          content: '<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#ff4d4f 0%,#ff7875 100%);box-shadow:0 0 6px #ff4d4f; border:2px solid #fff;"></div>',
          offset: new window.AMap.Pixel(-8, -8),
        });
      } else {
        // 起点marker：渐变荧光蓝色圆形，无label
        return new window.AMap.Marker({
          position: [p.lng, p.lat],
          map,
          content: '<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#00e0ff 0%,#00bfff 100%);box-shadow:0 0 6px #00e0ff; border:2px solid #fff;"></div>',
          offset: new window.AMap.Pixel(-8, -8),
      });
      }
    });
    setMarkers(newMarkers);
    // eslint-disable-next-line
  }, [points, map]);

  // 路径规划
  useEffect(() => {
    const fetchRoutes = async () => {
      if (points.length !== 2) return;
      setLoading(true);
      setResults(null);
      try {
        const origin = `${points[0].lng},${points[0].lat}`;
        const destination = `${points[1].lng},${points[1].lat}`;
        // 获取城市名
        const getCity = async (lng, lat) => {
          const res = await axios.get(`https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}`);
          return res.data.regeocode.addressComponent.city || res.data.regeocode.addressComponent.province;
        };
        const city = await getCity(points[0].lng, points[0].lat);
        const cityd = await getCity(points[1].lng, points[1].lat);
        // 并发请求
        const [driving, transit, straight] = await Promise.all([
          axios.post('http://localhost:3001/api/route/driving', { origin, destination }),
          axios.post('http://localhost:3001/api/route/transit', { origin, destination, city, cityd }),
          axios.post('http://localhost:3001/api/route/straight', { origin, destination }),
        ]);
        setResults({ driving: driving.data, transit: transit.data, straight: straight.data });
        // 绘制驾车/公交路线
        if (driving.data.route && driving.data.route.paths && driving.data.route.paths[0]) {
          const steps = driving.data.route.paths[0].steps;
          const path = steps.flatMap(step => step.polyline.split(';').map(str => str.split(',').map(Number)));
          const polyline = new window.AMap.Polyline({
            path,
            strokeColor: '#ffe600',
            strokeWeight: 8,
            showDir: true,
            opacity: 1,
          });
          map.add(polyline);
          setMarkers((ms) => [...ms, polyline]);
        }
        // 绘制eVTOL虚线飞行路径
        if (points.length === 2) {
          // 先移除旧的飞行路径线（如有）
          if (window.evtolLine && map) {
            map.remove(window.evtolLine);
            window.evtolLine = null;
          }
          const evtolLine = new window.AMap.Polyline({
            path: [
              [points[0].lng, points[0].lat],
              [points[1].lng, points[1].lat],
            ],
            strokeColor: '#00e0ff',
            strokeWeight: 5,
            strokeStyle: 'dashed',
            strokeDasharray: [4, 4],
            lineJoin: 'round',
            zIndex: 120,
          });
          map.add(evtolLine);
          window.evtolLine = evtolLine;
        }
      } catch (err) {
        message.error('Failed to fetch route info.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
    // eslint-disable-next-line
  }, [points]);

  // 重置
  const handleReset = () => {
    setPoints([]);
    setResults(null);
    markers.forEach((m) => map && map.remove(m));
    setMarkers([]);
    setAiAnalysis('');
    if (window.evtolLine && map) {
      map.remove(window.evtolLine);
      window.evtolLine = null;
    }
  };

  // 只保留ESC键reset
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleReset();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [handleReset]);

  // 地址联想
  const handleSearch = async (value) => {
    setInputValue(value);
    if (!value) {
      setAutoOptions([]);
      return;
    }
    try {
      const res = await axios.get(`https://restapi.amap.com/v3/assistant/inputtips?key=${amapKey}&keywords=${encodeURIComponent(value)}&type=&city=&datatype=all`);
      if (res.data && res.data.tips) {
        setAutoOptions(res.data.tips.filter(tip => tip.location).map(tip => ({
          value: tip.name + (tip.district ? ` (${tip.district})` : ''),
          label: tip.name + (tip.district ? ` (${tip.district})` : ''),
          location: tip.location,
        })));
      }
    } catch (err) {
      setAutoOptions([]);
    }
  };

  // 选中联想地址
  const handleSelect = (value, option) => {
    if (!option.location) return;
    const [lng, lat] = option.location.split(',').map(Number);
    setInputValue('');
    setAutoOptions([]);
    setPoints(prev => {
      let newPoints;
      if (selectType === 'start') {
        if (prev.length === 0) newPoints = [{ lng, lat }];
        else if (prev.length === 1) newPoints = [{ lng, lat }, prev[0]];
        else newPoints = [{ lng, lat }, prev[1]];
      } else {
        if (prev.length === 0) newPoints = [{ lng, lat }];
        else if (prev.length === 1) newPoints = [prev[0], { lng, lat }];
        else newPoints = [prev[0], { lng, lat }];
      }
      setAiAnalysis('');
      return newPoints;
    });
  };

  // 构建AI分析prompt
  const buildAIPrompt = useCallback(() => {
    if (!results) return '';
    // 取各方式actual cost和time value
    // Fuel Car
    let fuelCarActual = 'N/A', fuelCarTime = 'N/A';
    let evActual = 'N/A', evTime = 'N/A';
    let robotaxiActual = 'N/A', robotaxiTime = 'N/A';
    let taxiActual = 'N/A', taxiTime = 'N/A';
    let evtolActual = 'N/A', evtolTime = 'N/A';
    // Fuel Car
    if (results.driving?.route?.paths?.[0]) {
      const driving = results.driving.route.paths[0];
      const distanceKm = driving.distance / 1000;
      const durationHour = driving.duration / 3600;
      const fuelCost = (fuelConsumption / 100) * fuelPrice * distanceKm;
      const tollCost = Number(driving.tolls || 0);
      const depreciation = fuelPurchaseCost / (fuelYears * fuelAnnualMileage) * distanceKm;
      const parkingCost = (fuelParkingMonthly * 12 / fuelAnnualMileage) * distanceKm;
      const timeValue = durationHour * hourValue;
      const totalCost = fuelCost + tollCost + depreciation + parkingCost;
      fuelCarActual = totalCost.toFixed(2);
      fuelCarTime = timeValue.toFixed(2);
    }
    // EV
    if (results.driving?.route?.paths?.[0]) {
      const driving = results.driving.route.paths[0];
      const distanceKm = driving.distance / 1000;
      const durationHour = driving.duration / 3600;
      const energyCost = (evConsumption / 100) * evElectricityPrice * distanceKm;
      const tollCost = Number(driving.tolls || 0);
      const depreciation = evPurchaseCost / (evYears * evAnnualMileage) * distanceKm;
      const parkingCost = (evParkingMonthly * 12 / evAnnualMileage) * distanceKm;
      const timeValue = durationHour * hourValue;
      const totalCost = energyCost + tollCost + depreciation + parkingCost;
      evActual = totalCost.toFixed(2);
      evTime = timeValue.toFixed(2);
    }
    // Robotaxi
    if (results.driving?.route?.paths?.[0]) {
      const driving = results.driving.route.paths[0];
      const params = robotaxiParams;
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const durationMin = Math.round(driving.duration / 60);
      const energyCost = distanceKm * params.energyPer100km * params.electricityPrice / 100;
      const chargingServiceCost = distanceKm * params.energyPer100km * params.chargingServiceFeePerKwh / 100;
      const parkingCost = distanceKm * params.parkingFeePer100km / 100;
      const tollCost = distanceKm * params.tollPerKm + tolls;
      const depreciation = params.vehiclePrice / params.depreciationYears / params.annualMileage * distanceKm;
      const computeCost = distanceKm * params.computeCostPerKm;
      const maintenanceCost = distanceKm * params.maintenancePerKm;
      const insuranceCost = params.insurancePerYear / params.annualMileage * distanceKm;
      const taxCost = params.taxPerYear / params.annualMileage * distanceKm;
      const tireCost = params.tirePerYear / params.annualMileage * distanceKm;
      const remoteMonitorCost = distanceKm * params.remoteMonitorPerKm;
      const timeValue = durationMin / 60 * hourValue;
      const totalOperatingCost = energyCost + chargingServiceCost + parkingCost + tollCost + depreciation + computeCost + maintenanceCost + insuranceCost + taxCost + tireCost + remoteMonitorCost + timeValue;
      const operatorServiceFee = totalOperatingCost * params.operatorServiceRate;
      const adRevenue = params.adRevenuePerKm * distanceKm;
      const passengerFare = totalOperatingCost + operatorServiceFee - adRevenue;
      robotaxiActual = passengerFare.toFixed(2);
      robotaxiTime = timeValue.toFixed(2);
    }
    // Taxi
    if (results.driving?.route?.paths?.[0]) {
      const driving = results.driving.route.paths[0];
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const durationMin = driving.duration / 60;
      let meterFare = baseFare;
      if (distanceKm > baseDist) {
        const mid = Math.min(distanceKm, midDist) - baseDist;
        if (mid > 0) meterFare += mid * midRate;
        if (distanceKm > midDist) {
          const high = distanceKm - midDist;
          if (high > 0) meterFare += high * highRate;
        }
      }
      const timeFee = durationMin * timeRate;
      meterFare += timeFee;
      const timeValueTaxi = durationMin / 60 * hourValue;
      meterFare += timeValueTaxi;
      meterFare += tolls;
      let returnFare = 0, returnToll = 0;
      if (distanceKm > returnDist) {
        returnToll = tolls;
        returnFare = meterFare * returnRatio;
      }
      const totalFare = meterFare + (distanceKm > returnDist ? (returnToll + returnFare) : 0);
      taxiActual = totalFare.toFixed(2);
      taxiTime = timeValueTaxi.toFixed(2);
    }
    // eVTOL
    if (results.straight?.results?.[0]) {
      const straight = results.straight.results[0];
      const distance = straight.distance;
      const cruiseSpeed = 200 * 1000 / 3600;
      const cruiseAltitude = 800;
      const takeoffLandSpeed = 7.5;
      const takeoffTime = cruiseAltitude / takeoffLandSpeed;
      const landingTime = cruiseAltitude / takeoffLandSpeed;
      const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
      const cruiseTime = cruiseDistance / cruiseSpeed;
      const totalTime = takeoffTime + cruiseTime + landingTime;
      const flightHours = totalTime / 3600;
      const p = evtolParams;
      const depreciation = p.aircraftPrice / (p.aircraftLifespanYears * p.annualFlightHours) * flightHours;
      const computeCost = p.computeCostPerHour * flightHours;
      const airwayCost = p.airwayCostPerKm * (distance / 1000);
      const vertiportCost = p.vertiportCostPerFlight;
      const parkingCost = p.parkingCostPerHour * flightHours;
      const maintenanceCost = p.maintenancePerHour * flightHours;
      const energyCost = p.energyPerHour * flightHours;
      const totalCost = depreciation + computeCost + airwayCost + vertiportCost + parkingCost + maintenanceCost + energyCost;
      const timeValue = flightHours * hourValue;
      evtolActual = totalCost.toFixed(2);
      evtolTime = timeValue.toFixed(2);
    }
    // 新版prompt
    return `You are a transportation economics expert. Please analyze the following cost data for this route (all in RMB):\n\n` +
      `| Mode        | Actual Cost / Passenger Fare | Time Value |\n` +
      `|-------------|-----------------------------|------------|\n` +
      `| Fuel Car    | ${fuelCarActual}            | ${fuelCarTime} |\n` +
      `| EV          | ${evActual}                 | ${evTime}      |\n` +
      `| Robotaxi    | ${robotaxiActual}           | ${robotaxiTime}|\n` +
      `| Taxi        | ${taxiActual}               | ${taxiTime}    |\n` +
      `| eVTOL       | ${evtolActual}              | ${evtolTime}   |\n` +
      `\n` +
      `1. Please compare the above modes based on the principle of generalized cost, marginal cost, and other relevant economic theories.\n` +
      `2. For each mode, discuss the advantages and disadvantages, considering both actual cost and time value.\n` +
      `3. For eVTOL, provide a reasonable pricing analysis based on the above data and economic theory.\n` +
      `4. Please cite relevant literature or sources (with links if possible) to support your analysis.\n` +
      `5. Answer in English and use markdown format.`;
  }, [results, fuelConsumption, fuelPrice, fuelPurchaseCost, fuelYears, fuelAnnualMileage, fuelParkingMonthly, evConsumption, evElectricityPrice, evPurchaseCost, evYears, evAnnualMileage, evParkingMonthly, robotaxiParams, baseFare, baseDist, midDist, midRate, highRate, returnDist, timeRate, returnRatio, evtolParams, hourValue]);

  // 只保留DeepSeek
  const fetchAIAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    setAiAnalysis('');
    try {
      const prompt = buildAIPrompt();
      if (!prompt) {
        setAiError('No valid route data.');
        setAiLoading(false);
        return;
      }
      const res = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${deepseekKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setAiAnalysis(res.data.choices[0].message.content);
    } catch (err) {
      setAiError('AI analysis failed.');
    } finally {
      setAiLoading(false);
    }
  }, [buildAIPrompt, deepseekKey]);

  // 发送对话
  const handleSendQa = async () => {
    if (!qaInput.trim()) return;
    setQaLoading(true);
    setQaError('');
    // 动态获取分析上下文prompt
    const contextPrompt = buildAIPrompt();
    let messages = qaHistory.length === 0
      ? [
          { role: 'system', content: contextPrompt || 'You are an expert on this route and its analysis.' },
          { role: 'user', content: qaInput }
        ]
      : [
          { role: 'system', content: contextPrompt || 'You are an expert on this route and its analysis.' },
          ...qaHistory,
          { role: 'user', content: qaInput }
        ];
    setQaHistory(h => h.length === 0 ? [{ role: 'user', content: qaInput }] : [...h, { role: 'user', content: qaInput }]);
    setQaInput('');
    try {
      const res = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${deepseekKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const aiMsg = res.data.choices[0].message.content;
      setQaHistory(h => [...h, { role: 'assistant', content: aiMsg }]);
    } catch (err) {
      setQaError('Failed to get response.');
    } finally {
      setQaLoading(false);
    }
  };

  // 关闭Modal时清空对话
  const handleCloseQaModal = () => {
    setQaModalOpen(false);
    setTimeout(() => {
      setQaInput('');
      setQaHistory([]);
      setQaError('');
    }, 300);
  };

  // 卡片内容渲染
  const renderCards = () => {
    if (!results) return null;
    // 驾车
    const driving = results.driving.route && results.driving.route.paths && results.driving.route.paths[0];
    // 公交
    const transit = results.transit.route && results.transit.route.transits && results.transit.route.transits[0];
    // 直线
    const straight = results.straight.results && results.straight.results[0];

    // 提取所有交通方式
    const getTransitModes = (transit) => {
      if (!transit || !transit.segments) return [];
      return transit.segments.map((seg, idx) => {
        if (seg.vehicle) {
          // 交通工具类型映射
          const typeMap = {
            SUBWAY: 'Subway',
            BUS: 'Bus',
            RAIL: 'Rail',
            PLANE: 'Plane',
            COACH: 'Coach',
            FERRY: 'Ferry',
            TAXI: 'Taxi',
            // 其他类型可补充
          };
          return typeMap[seg.vehicle.type] || seg.vehicle.type;
        }
        return seg.instruction || 'Walk';
      });
    };
    const transitModes = getTransitModes(transit);

    // Fuel Car参数
    const FUEL_PURCHASE_COST = 200000;
    const FUEL_YEARS = 8;
    const FUEL_ANNUAL_MILEAGE = 12000;
    const FUEL_PARKING_MONTHLY = 800;

    // EV参数
    const EV_PURCHASE_COST = 160000;
    const EV_YEARS = 8;
    const EV_ANNUAL_MILEAGE = 12000;
    const EV_PARKING_MONTHLY = 800;

    // --- Extract cost values for bar chart ---
    // Fuel Car
    let fuelCarCost = null;
    if (driving) {
      const distanceKm = driving.distance / 1000;
      const durationHour = driving.duration / 3600;
      const fuelCost = (fuelConsumption / 100) * fuelPrice * distanceKm;
      const tollCost = Number(driving.tolls || 0);
      const depreciation = fuelPurchaseCost / (fuelYears * fuelAnnualMileage) * distanceKm;
      const parkingCost = (fuelParkingMonthly * 12 / fuelAnnualMileage) * distanceKm;
      const timeValue = durationHour * hourValue;
      fuelCarCost = fuelCost + tollCost + depreciation + parkingCost;
    }
    // EV
    let evCost = null;
    if (driving) {
      const distanceKm = driving.distance / 1000;
      const durationHour = driving.duration / 3600;
      const energyCost = (evConsumption / 100) * evElectricityPrice * distanceKm;
      const tollCost = Number(driving.tolls || 0);
      const depreciation = evPurchaseCost / (evYears * evAnnualMileage) * distanceKm;
      const parkingCost = (evParkingMonthly * 12 / evAnnualMileage) * distanceKm;
      const timeValue = durationHour * hourValue;
      evCost = energyCost + tollCost + depreciation + parkingCost;
    }
    // Robotaxi
    let robotaxiFare = null;
    if (driving) {
      const params = robotaxiParams;
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const durationMin = Math.round(driving.duration / 60);
      // --- Cost calculations (copy from robotaxi tab) ---
      const energyCost = distanceKm * params.energyPer100km * params.electricityPrice / 100;
      const chargingServiceCost = distanceKm * params.energyPer100km * params.chargingServiceFeePerKwh / 100;
      const parkingCost = distanceKm * params.parkingFeePer100km / 100;
      const tollCost = distanceKm * params.tollPerKm + tolls;
      const depreciation = params.vehiclePrice / params.depreciationYears / params.annualMileage * distanceKm;
      const computeCost = distanceKm * params.computeCostPerKm;
      const maintenanceCost = distanceKm * params.maintenancePerKm;
      const insuranceCost = params.insurancePerYear / params.annualMileage * distanceKm;
      const taxCost = params.taxPerYear / params.annualMileage * distanceKm;
      const tireCost = params.tirePerYear / params.annualMileage * distanceKm;
      const remoteMonitorCost = distanceKm * params.remoteMonitorPerKm;
      const timeValue = durationMin / 60 * hourValue;
      const totalOperatingCost = energyCost + chargingServiceCost + parkingCost + tollCost + depreciation + computeCost + maintenanceCost + insuranceCost + taxCost + tireCost + remoteMonitorCost + timeValue;
      const operatorServiceFee = totalOperatingCost * params.operatorServiceRate;
      const adRevenue = params.adRevenuePerKm * distanceKm;
      robotaxiFare = totalOperatingCost + operatorServiceFee - adRevenue;
    }
    // Taxi
    let taxiFare = null;
    if (driving) {
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const durationMin = driving.duration / 60;
      let meterFare = baseFare;
      if (distanceKm > baseDist) {
        const mid = Math.min(distanceKm, midDist) - baseDist;
        if (mid > 0) {
          meterFare += mid * midRate;
        }
        if (distanceKm > midDist) {
          const high = distanceKm - midDist;
          if (high > 0) {
            meterFare += high * highRate;
          }
        }
      }
      // 等时费
      const timeFee = durationMin * timeRate;
      meterFare += timeFee;
      // 时间价值
      const timeValueTaxi = durationMin / 60 * hourValue;
      meterFare += timeValueTaxi;
      // 去程高速费
      meterFare += tolls;
      // 返程部分
      let returnFare = 0, returnToll = 0;
      if (distanceKm > returnDist) {
        returnToll = tolls; // 假设回程高速费=去程高速费
        returnFare = meterFare * returnRatio;
      }
      // 总价
      taxiFare = meterFare + (distanceKm > returnDist ? (returnToll + returnFare) : 0);
    }
    // eVTOL
    let evtolTotalCost = null;
    if (straight) {
      const distance = straight.distance;
      const distanceKm = distance / 1000;
      const cruiseSpeed = 200 * 1000 / 3600;
      const cruiseAltitude = 800;
      const takeoffLandSpeed = 7.5;
      const takeoffTime = cruiseAltitude / takeoffLandSpeed;
      const landingTime = cruiseAltitude / takeoffLandSpeed;
      const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
      const cruiseTime = cruiseDistance / cruiseSpeed;
      const totalTime = takeoffTime + cruiseTime + landingTime;
      const flightHours = totalTime / 3600;
      const depreciation = evtolParams.aircraftPrice / (evtolParams.aircraftLifespanYears * evtolParams.annualFlightHours) * flightHours;
      const computeCost = evtolParams.computeCostPerHour * flightHours;
      const airwayCost = evtolParams.airwayCostPerKm * distanceKm;
      const vertiportCost = evtolParams.vertiportCostPerFlight;
      const parkingCost = evtolParams.parkingCostPerHour * flightHours;
      const maintenanceCost = evtolParams.maintenancePerHour * flightHours;
      const energyCost = evtolParams.energyPerHour * flightHours;
      evtolTotalCost = depreciation + computeCost + airwayCost + vertiportCost + parkingCost + maintenanceCost + energyCost;
    }
    const barData = [
      { name: 'Fuel Car', label: 'Fuel Car (Est. Cost)', value: fuelCarCost ? Number(fuelCarCost.toFixed(2)) : 0, color: '#1976d2' },
      { name: 'EV', label: 'EV (Est. Cost)', value: evCost ? Number(evCost.toFixed(2)) : 0, color: '#43a047' },
      { name: 'Robotaxi', label: 'Robotaxi (Fare)', value: robotaxiFare ? Number(robotaxiFare.toFixed(2)) : 0, color: '#ff9800' },
      { name: 'Taxi', label: 'Taxi (Fare)', value: taxiFare ? Number(taxiFare.toFixed(2)) : 0, color: '#8e24aa' },
      { name: 'eVTOL', label: 'eVTOL (Total Cost)', value: evtolTotalCost ? Number(evtolTotalCost.toFixed(2)) : 0, color: '#e53935' },
    ];

    return (
      <div className="cards-panel">
        <Card title="Analysis" className="result-card" bodyStyle={{height: '28vh', overflowY: 'auto', padding: '0 24px'}}>
          <Tabs defaultActiveKey="barchart">
            <Tabs.TabPane tab="Price Analysis" key="barchart">
              {(() => {
                // 计算各交通方式的实际成本和时间成本
                const chartData = [
                  {
                    name: 'Fuel Car',
                    actual: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const distanceKm = driving.distance / 1000;
                      const durationHour = driving.duration / 3600;
                      const fuelCost = (fuelConsumption / 100) * fuelPrice * distanceKm;
                      const tollCost = Number(driving.tolls || 0);
                      const depreciation = fuelPurchaseCost / (fuelYears * fuelAnnualMileage) * distanceKm;
                      const parkingCost = (fuelParkingMonthly * 12 / fuelAnnualMileage) * distanceKm;
                      const timeValue = durationHour * hourValue;
                      const totalCost = fuelCost + tollCost + depreciation + parkingCost;
                      return totalCost;
                    })(),
                    time: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const distanceKm = driving.distance / 1000;
                      const durationHour = driving.duration / 3600;
                      const fuelCost = (fuelConsumption / 100) * fuelPrice * distanceKm;
                      const tollCost = Number(driving.tolls || 0);
                      const depreciation = fuelPurchaseCost / (fuelYears * fuelAnnualMileage) * distanceKm;
                      const parkingCost = (fuelParkingMonthly * 12 / fuelAnnualMileage) * distanceKm;
                      const timeValue = durationHour * hourValue;
                      return timeValue;
                    })(),
                  },
                  {
                    name: 'EV',
                    actual: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const distanceKm = driving.distance / 1000;
                      const durationHour = driving.duration / 3600;
                      const energyCost = (evConsumption / 100) * evElectricityPrice * distanceKm;
                      const tollCost = Number(driving.tolls || 0);
                      const depreciation = evPurchaseCost / (evYears * evAnnualMileage) * distanceKm;
                      const parkingCost = (evParkingMonthly * 12 / evAnnualMileage) * distanceKm;
                      const timeValue = durationHour * hourValue;
                      const totalCost = energyCost + tollCost + depreciation + parkingCost;
                      return totalCost;
                    })(),
                    time: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const distanceKm = driving.distance / 1000;
                      const durationHour = driving.duration / 3600;
                      const energyCost = (evConsumption / 100) * evElectricityPrice * distanceKm;
                      const tollCost = Number(driving.tolls || 0);
                      const depreciation = evPurchaseCost / (evYears * evAnnualMileage) * distanceKm;
                      const parkingCost = (evParkingMonthly * 12 / evAnnualMileage) * distanceKm;
                      const timeValue = durationHour * hourValue;
                      return timeValue;
                    })(),
                  },
                  {
                    name: 'Robotaxi',
                    actual: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const params = robotaxiParams;
                      const tolls = Number(driving.tolls || 0);
                      const distanceKm = driving.distance / 1000;
                      const durationMin = Math.round(driving.duration / 60);
                      // --- Cost calculations (copy from robotaxi tab) ---
                      const energyCost = distanceKm * params.energyPer100km * params.electricityPrice / 100;
                      const chargingServiceCost = distanceKm * params.energyPer100km * params.chargingServiceFeePerKwh / 100;
                      const parkingCost = distanceKm * params.parkingFeePer100km / 100;
                      const tollCost = distanceKm * params.tollPerKm + tolls;
                      const depreciation = params.vehiclePrice / params.depreciationYears / params.annualMileage * distanceKm;
                      const computeCost = distanceKm * params.computeCostPerKm;
                      const maintenanceCost = distanceKm * params.maintenancePerKm;
                      const insuranceCost = params.insurancePerYear / params.annualMileage * distanceKm;
                      const taxCost = params.taxPerYear / params.annualMileage * distanceKm;
                      const tireCost = params.tirePerYear / params.annualMileage * distanceKm;
                      const remoteMonitorCost = distanceKm * params.remoteMonitorPerKm;
                      const timeValue = durationMin / 60 * hourValue;
                      const totalOperatingCost = energyCost + chargingServiceCost + parkingCost + tollCost + depreciation + computeCost + maintenanceCost + insuranceCost + taxCost + tireCost + remoteMonitorCost + timeValue;
                      const operatorServiceFee = totalOperatingCost * params.operatorServiceRate;
                      const adRevenue = params.adRevenuePerKm * distanceKm;
                      const passengerFare = totalOperatingCost + operatorServiceFee - adRevenue;
                      return passengerFare;
                    })(),
                    time: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const durationMin = Math.round(driving.duration / 60);
                      const timeValue = durationMin / 60 * hourValue;
                      return timeValue;
                    })(),
                  },
                  {
                    name: 'Taxi',
                    actual: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const tolls = Number(driving.tolls || 0);
                      const distanceKm = driving.distance / 1000;
                      const durationMin = driving.duration / 60;
                      let meterFare = baseFare;
                      if (distanceKm > baseDist) {
                        const mid = Math.min(distanceKm, midDist) - baseDist;
                        if (mid > 0) {
                          meterFare += mid * midRate;
                        }
                        if (distanceKm > midDist) {
                          const high = distanceKm - midDist;
                          if (high > 0) {
                            meterFare += high * highRate;
                          }
                        }
                      }
                      // 等时费
                      const timeFee = durationMin * timeRate;
                      meterFare += timeFee;
                      // 时间价值
                      const timeValueTaxi = durationMin / 60 * hourValue;
                      meterFare += timeValueTaxi;
                      // 去程高速费
                      meterFare += tolls;
                      // 返程部分
                      let returnFare = 0, returnToll = 0;
                      if (distanceKm > returnDist) {
                        returnToll = tolls; // 假设回程高速费=去程高速费
                        returnFare = meterFare * returnRatio;
                      }
                      // 总价
                      const totalFare = meterFare + (distanceKm > returnDist ? (returnToll + returnFare) : 0);
                      return totalFare;
                    })(),
                    time: (() => {
                      const driving = results?.driving?.route?.paths?.[0];
                      if (!driving) return 0;
                      const durationMin = driving.duration / 60;
                      const timeValueTaxi = durationMin / 60 * hourValue;
                      return timeValueTaxi;
                    })(),
                  },
                  {
                    name: 'eVTOL',
                    actual: (() => {
                      const straight = results?.straight?.results?.[0];
                      if (!straight) return 0;
                      const distance = straight.distance;
                      const cruiseSpeed = 200 * 1000 / 3600;
                      const takeoffLandSpeed = 7.5;
                      const cruiseAltitude = 800;
                      const takeoffTime = cruiseAltitude / takeoffLandSpeed;
                      const landingTime = cruiseAltitude / takeoffLandSpeed;
                      const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
                      const cruiseTime = cruiseDistance / cruiseSpeed;
                      const totalTime = takeoffTime + cruiseTime + landingTime;
                      const flightHours = totalTime / 3600;
                      const p = evtolParams;
                      const depreciation = p.aircraftPrice / (p.aircraftLifespanYears * p.annualFlightHours) * flightHours;
                      const computeCost = p.computeCostPerHour * flightHours;
                      const airwayCost = p.airwayCostPerKm * (distance / 1000);
                      const vertiportCost = p.vertiportCostPerFlight;
                      const parkingCost = p.parkingCostPerHour * flightHours;
                      const maintenanceCost = p.maintenancePerHour * flightHours;
                      const energyCost = p.energyPerHour * flightHours;
                      return depreciation + computeCost + airwayCost + vertiportCost + parkingCost + maintenanceCost + energyCost;
                    })(),
                    time: (() => {
                      const straight = results?.straight?.results?.[0];
                      if (!straight) return 0;
                      const distance = straight.distance;
                      const cruiseSpeed = 200 * 1000 / 3600;
                      const takeoffLandSpeed = 7.5;
                      const cruiseAltitude = 800;
                      const takeoffTime = cruiseAltitude / takeoffLandSpeed;
                      const landingTime = cruiseAltitude / takeoffLandSpeed;
                      const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
                      const cruiseTime = cruiseDistance / cruiseSpeed;
                      const totalTime = takeoffTime + cruiseTime + landingTime;
                      const flightHours = totalTime / 3600;
                      return flightHours * hourValue;
                    })(),
                  },
                ];
                return (
                  <div style={{ width: '100%', height: 300 }}>
                    <ReactECharts
                      style={{ height: '23vh' }}
                      option={{
                        grid: { left: 40, right: 20, top: 50, bottom: 30 },
                        tooltip: {
                          trigger: 'axis',
                          axisPointer: { type: 'shadow' },
                          formatter: params => {
                            const p = params[0];
                            const t = params[1];
                            return `${p.name}<br/>Actual Cost: ${p.value.toFixed(2)} RMB<br/>Time Cost: ${t.value.toFixed(2)} RMB<br/>Total: ${(p.value + t.value).toFixed(2)} RMB`;
                          }
                        },
                        legend: {
                          data: [
                            {
                              name: 'Actual Cost',
                              icon: 'rect',
                              itemStyle: {
                                color: '#fff',
                                borderColor: '#000',
                                borderWidth: 1
                              }
                            },
                            {
                              name: 'Time Cost',
                              icon: 'rect',
                              itemStyle: {
                                color: {
                                  type: 'pattern',
                                  image: createStripePattern('#000', '#fff'),
                                  repeat: 'repeat'
                                },
                                borderColor: '#000',
                                borderWidth: 0
                              }
                            }
                          ],
                          itemWidth: 28,
                          itemHeight: 12,
                          textStyle: { fontWeight: 500, fontSize: 12 },
                          top: 0,
                          left: 'center',
                          orient: 'horizontal',
                        },
                        xAxis: {
                          type: 'category',
                          data: chartData.map(d => d.name),
                          axisLabel: { fontWeight: 600, fontSize: 12 },
                        },
                        yAxis: {
                          type: 'value',
                          name: 'RMB',
                          nameTextStyle: { fontWeight: 500, fontSize: 12, align: 'left' },
                          axisLabel: { fontWeight: 500, fontSize: 12 },
                        },
                        series: [
                          {
                            name: 'Actual Cost',
                            type: 'bar',
                            stack: 'total',
                            data: chartData.map(d => Number(d.actual.toFixed(2))),
                            itemStyle: {
                              color: function(params) {
                                const palette = ['#1890ff','#00c2b3','#00b96b','#ffb300','#ff4d4f'];
                                return palette[params.dataIndex % palette.length];
                              },
                              borderRadius: [6,6,0,0],
                            },
                            barWidth: 38,
                            label: {
                              show: false
                            }
                          },
                          {
                            name: 'Time Cost',
                            type: 'bar',
                            stack: 'total',
                            data: chartData.map(d => Number(d.time.toFixed(2))),
                            itemStyle: {
                              color: function(params) {
                                const palette = ['#1890ff','#00c2b3','#00b96b','#ffb300','#ff4d4f'];
                                const color = palette[params.dataIndex % palette.length];
                                return {
                                  type: 'pattern',
                                  image: createStripePattern(color),
                                  repeat: 'repeat'
                                };
                              },
                              borderRadius: [6,6,0,0],
                            },
                            barWidth: 38,
                            label: {
                              show: false
                            }
                          }
                        ]
                      }}
                    />
                  </div>
                );
              })()}
            </Tabs.TabPane>
            <Tabs.TabPane tab="AI Analysis" key="deepseek">
              {aiLoading ? (
                <div className="ai-spin-center"><Spin /></div>
              ) : aiError ? (
                <div style={{ color: 'red' }}>{aiError}</div>
              ) : (
                <>
                  <div style={{ maxHeight: 320, overflow: 'auto' }} className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</ReactMarkdown>
                  </div>
                  {aiAnalysis && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button
                        style={{ flex: 1 }}
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(aiAnalysis);
                          } else {
                            const textarea = document.createElement('textarea');
                            textarea.value = aiAnalysis;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                          }
                        }}
                      >
                        Copy Content
                      </Button>
                      <Button
                        type="primary"
                        style={{ flex: 1 }}
                        onClick={() => setQaModalOpen(true)}
                        disabled={aiLoading}
                      >
                        Still have questions?
                      </Button>
                    </div>
                  )}
                  {!aiAnalysis && !aiLoading && !aiError && (
                    <Button
                      type="primary"
                      style={{ marginTop: 12, width: '100%' }}
                      onClick={fetchAIAnalysis}
                      disabled={!results || aiLoading}
                    >
                      Run Analysis
                    </Button>
                  )}
                </>
              )}
            </Tabs.TabPane>
          </Tabs>
        </Card>
        <Card title="eVTOL Cost" className="result-card" bodyStyle={{height: '27vh', overflowY: 'auto', padding: '0 24px'}}>
          {straight ? (
            (() => {
              const handleParam = (key, val) => setEvtolParams(p => ({ ...p, [key]: val }));
              // 距离与时间
              const distance = straight.distance; // meters
              const distanceKm = distance / 1000;
              const cruiseSpeed = 200 * 1000 / 3600; // m/s
              const cruiseAltitude = 800; // m
              const takeoffLandSpeed = 7.5; // m/s
              const takeoffTime = cruiseAltitude / takeoffLandSpeed;
              const landingTime = cruiseAltitude / takeoffLandSpeed;
              const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
              const cruiseTime = cruiseDistance / cruiseSpeed;
              const totalTime = takeoffTime + cruiseTime + landingTime; // seconds
              const flightHours = totalTime / 3600;
              const flightMinutes = Math.round(totalTime / 60);
              // 分项成本
              const annualFlights = evtolParams.annualFlightHours / flightHours;
              const depreciation = evtolParams.aircraftPrice / (evtolParams.aircraftLifespanYears * evtolParams.annualFlightHours) * flightHours;
              const computeCost = evtolParams.computeCostPerHour * flightHours;
              const airwayCost = evtolParams.airwayCostPerKm * distanceKm;
              const vertiportCost = evtolParams.vertiportCostPerFlight;
              const parkingCost = evtolParams.parkingCostPerHour * flightHours;
              const maintenanceCost = evtolParams.maintenancePerHour * flightHours;
              const energyCost = evtolParams.energyPerHour * flightHours;
              // 总成本
              const totalCost = depreciation + computeCost + airwayCost + vertiportCost + parkingCost + maintenanceCost + energyCost;
              // UI
              return (
                <div style={{fontSize:14}}>
                  <div style={{marginBottom:8, fontSize:14, color:'#333', borderBottom:'1px solid #eee', padding:'6px 0'}}>
                    <span style={{fontWeight:600}}>Distance:</span> <span style={{fontWeight:400}}>{distanceKm.toFixed(2)} km</span> &nbsp; | &nbsp;
                    <span style={{fontWeight:600}}>Flight Duration:</span> <span style={{fontWeight:400}}>{flightMinutes} min</span>
                  </div>
                  <div style={{marginBottom:8}}>
                    <b>Cost Breakdown</b>
                    <div style={{margin:'8px 0 0 0', padding:'8px', background:'#fafbfc', borderRadius:6, border:'1px solid #f0f0f0'}}>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Aircraft depreciation</span><span style={{fontWeight:500}}>{depreciation.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Compute/IT cost</span><span style={{fontWeight:500}}>{computeCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Airway cost</span><span style={{fontWeight:500}}>{airwayCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Vertiport cost</span><span style={{fontWeight:500}}>{vertiportCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Parking cost</span><span style={{fontWeight:500}}>{parkingCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Maintenance</span><span style={{fontWeight:500}}>{maintenanceCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>Energy</span><span style={{fontWeight:500}}>{energyCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', marginTop:8, paddingTop:8}}><span style={{fontWeight:700, fontSize:16}}>Total Operation Cost</span><span style={{fontWeight:700, color:'#1976d2', fontSize:16}}>{totalCost.toFixed(2)} RMB</span></div>
                      <div style={{display:'flex', justifyContent:'space-between', marginTop:0.5}}>
                        <span style={{fontWeight:600, fontSize:14}}> + Time Value</span>
                        <span style={{fontWeight:600, fontSize:14}}>{(flightHours * hourValue).toFixed(2)} RMB</span>
                      </div>
                    </div>
                  </div>
                  <div style={{fontSize:13, color:'#888', marginTop:8}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('evtol')}>
                      {showAssumptions.evtol ? '▼' : '▶'} Custimize Assumptions
                    </span>
                    {showAssumptions.evtol && (
                      <div style={{color:'#888', marginTop: 2}}>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Aircraft price:</span>
                          <input type="number" min="0" step="10000" value={evtolParams.aircraftPrice} onChange={e=>handleParam('aircraftPrice', Number(e.target.value)||0)} style={{width:100, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Aircraft lifespan:</span>
                          <input type="number" min="1" step="1" value={evtolParams.aircraftLifespanYears} onChange={e=>handleParam('aircraftLifespanYears', Number(e.target.value)||1)} style={{width:60, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> years
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Annual flight hours:</span>
                          <input type="number" min="1" step="1" value={evtolParams.annualFlightHours} onChange={e=>handleParam('annualFlightHours', Number(e.target.value)||1)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> h/year
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Seats:</span>
                          <input type="number" min="1" step="1" value={evtolParams.seats} onChange={e=>handleParam('seats', Number(e.target.value)||1)} style={{width:60, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} />
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Compute cost per hour:</span>
                          <input type="number" min="0" step="1" value={evtolParams.computeCostPerHour} onChange={e=>handleParam('computeCostPerHour', Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/h
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Airway cost per km:</span>
                          <input type="number" min="0" step="0.1" value={evtolParams.airwayCostPerKm} onChange={e=>handleParam('airwayCostPerKm', Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/km
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Vertiport cost per flight:</span>
                          <input type="number" min="0" step="1" value={evtolParams.vertiportCostPerFlight} onChange={e=>handleParam('vertiportCostPerFlight', Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Parking cost per hour:</span>
                          <input type="number" min="0" step="1" value={evtolParams.parkingCostPerHour} onChange={e=>handleParam('parkingCostPerHour', Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/h
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Maintenance per hour:</span>
                          <input type="number" min="0" step="1" value={evtolParams.maintenancePerHour} onChange={e=>handleParam('maintenancePerHour', Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/h
                        </div>
                        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                          <span style={{minWidth:180, display:'inline-block'}}>Energy per hour:</span>
                          <input type="number" min="0" step="1" value={evtolParams.energyPerHour} onChange={e=>handleParam('energyPerHour', Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/h
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : 'No data'}
        </Card>
        <Card title="Ground Transport" className="result-card" bodyStyle={{height: '29vh', overflowY: 'auto', padding: '0 24px'}}>
          {/* 统一展示距离、时长、非直线系数 */}
          {driving && straight && (
            <div style={{marginBottom: 0, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14, color: '#333'}}>
              <span>
                <span style={{fontWeight:600}}>Distance:</span> <span style={{fontWeight:400}}>{(driving.distance/1000).toFixed(2)} km</span> &nbsp; | &nbsp;
                <span style={{fontWeight:600}}>Duration:</span> <span style={{fontWeight:400}}>{Math.round(driving.duration/60)} min</span>
              </span><br/>
              <span><span style={{fontWeight:600}}>Detour Factor:</span> <span style={{fontWeight:400}}>{(driving.distance / (straight.distance || 1)).toFixed(2)}</span></span>
            </div>
          )}
          <Tabs
            defaultActiveKey="fuel"
            items={[{
              key: 'fuel',
              label: 'Fuel Car',
              children: driving ? (() => {
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const durationMin = Math.round(driving.duration / 60);
                const durationHour = driving.duration / 3600;
                // --- Cost calculations ---
                const fuelCost = (fuelConsumption / 100) * fuelPrice * distanceKm;
                const tollCost = tolls;
                const depreciation = fuelPurchaseCost / (fuelYears * fuelAnnualMileage) * distanceKm;
                const parkingCost = (fuelParkingMonthly * 12 / fuelAnnualMileage) * distanceKm;
                const timeValue = durationHour * hourValue;
                const totalCost = fuelCost + tollCost + depreciation + parkingCost;
                // --- UI ---
                return (
                  <div style={{fontSize:14}}>
                    <div style={{marginBottom:8}}>
                      <b>Cost Breakdown</b>
                      <div style={{margin:'8px 0 0 0', padding:'8px', background:'#fafbfc', borderRadius:6, border:'1px solid #f0f0f0'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Fuel cost</span><span style={{fontWeight:500}}>{fuelCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Tolls</span><span style={{fontWeight:500}}>{tollCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Depreciation</span><span style={{fontWeight:500}}>{depreciation.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Parking</span><span style={{fontWeight:500}}>{parkingCost.toFixed(2)} RMB</span></div>

                        <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', marginTop:8, paddingTop:8}}><span style={{fontWeight:700,fontSize:16}}>Estimated cost</span><span style={{fontWeight:700,fontSize:16, color:'#1976d2'}}>{totalCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <span style={{fontWeight:600, fontSize:14}}> + Time Value</span>
                          <span style={{fontWeight:600, fontSize:14}}>{timeValue.toFixed(2)} RMB</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:13, color:'#888', marginTop:8}}>
                      <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('fuel')}>
                        {showAssumptions.fuel ? '▼' : '▶'} Custimize Assumptions
                      </span>
                      {showAssumptions.fuel && (
                        <div style={{color:'#888', marginTop: 2}}>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Fuel price:</span>
                            <input type="number" min="0" step="0.01" value={fuelPrice} onChange={e=>setFuelPrice(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/L
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Fuel consumption:</span>
                            <input type="number" min="0" step="0.1" value={fuelConsumption} onChange={e=>setFuelConsumption(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> L/100km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Purchase cost:</span>
                            <input type="number" min="0" step="1000" value={fuelPurchaseCost} onChange={e=>setFuelPurchaseCost(Number(e.target.value)||0)} style={{width:100, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Years of use:</span>
                            <input type="number" min="1" step="1" value={fuelYears} onChange={e=>setFuelYears(Number(e.target.value)||1)} style={{width:60, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> years
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Annual mileage:</span>
                            <input type="number" min="1" step="100" value={fuelAnnualMileage} onChange={e=>setFuelAnnualMileage(Number(e.target.value)||1)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Parking:</span>
                            <input type="number" min="0" step="10" value={fuelParkingMonthly} onChange={e=>setFuelParkingMonthly(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/month
                          </div>
                          <div style={{marginTop:4}}>Hourly time value: {hourValue.toFixed(2)} RMB/h</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : 'No data',
            }, {
              key: 'ev',
              label: 'EV',
              children: driving ? (() => {
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const durationMin = Math.round(driving.duration / 60);
                const durationHour = driving.duration / 3600;
                const energyCost = (evConsumption / 100) * evElectricityPrice * distanceKm;
                const depreciation = evPurchaseCost / (evYears * evAnnualMileage) * distanceKm;
                const parkingCost = (evParkingMonthly * 12 / evAnnualMileage) * distanceKm;
                const timeValue = durationHour * hourValue;
                const totalCost = energyCost + tolls + depreciation + parkingCost;
                return (
                  <div style={{fontSize:14}}>
                    <div style={{marginBottom:8}}>
                      <b>Cost Breakdown</b>
                      <div style={{margin:'8px 0 0 0', padding:'8px', background:'#fafbfc', borderRadius:6, border:'1px solid #f0f0f0'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Electricity cost</span><span style={{fontWeight:500}}>{energyCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Tolls</span><span style={{fontWeight:500}}>{tolls.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Depreciation</span><span style={{fontWeight:500}}>{depreciation.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Parking</span><span style={{fontWeight:500}}>{parkingCost.toFixed(2)} RMB</span></div>

                        <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', marginTop:8, paddingTop:8}}><span style={{fontWeight:700,fontSize:16}}>Estimated cost</span><span style={{fontWeight:700, fontSize:16,color:'#1976d2'}}>{totalCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <span style={{fontWeight:600, fontSize:14}}> + Time Value</span>
                          <span style={{fontWeight:600, fontSize:14}}>{timeValue.toFixed(2)} RMB</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:13, color:'#888', marginTop:8}}>
                      <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('ev')}>
                        {showAssumptions.ev ? '▼' : '▶'} Custimize Assumptions
                      </span>
                      {showAssumptions.ev && (
                        <div style={{color:'#888', marginTop: 2}}>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Electricity price:</span>
                            <input type="number" min="0" step="0.01" value={evElectricityPrice} onChange={e=>setEvElectricityPrice(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/kWh
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Electricity consumption:</span>
                            <input type="number" min="0" step="0.1" value={evConsumption} onChange={e=>setEvConsumption(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> kWh/100km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Purchase cost:</span>
                            <input type="number" min="0" step="1000" value={evPurchaseCost} onChange={e=>setEvPurchaseCost(Number(e.target.value)||0)} style={{width:100, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Years of use:</span>
                            <input type="number" min="1" step="1" value={evYears} onChange={e=>setEvYears(Number(e.target.value)||1)} style={{width:60, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> years
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Annual mileage:</span>
                            <input type="number" min="1" step="100" value={evAnnualMileage} onChange={e=>setEvAnnualMileage(Number(e.target.value)||1)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:140, display:'inline-block'}}>Parking:</span>
                            <input type="number" min="0" step="10" value={evParkingMonthly} onChange={e=>setEvParkingMonthly(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/month
                          </div>
                          <div style={{marginTop:4}}>Hourly time value: {hourValue.toFixed(2)} RMB/h</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : 'No data',
            }, {
              key: 'robotaxi',
              label: 'Robotaxi',
              children: driving ? (() => {
                // --- Use top-level robotaxiParams state ---
                const params = robotaxiParams;
                const handleParam = (key, val) => setRobotaxiParams(p => ({ ...p, [key]: val }));
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const durationMin = Math.round(driving.duration / 60);
                // --- Cost calculations ---
                const energyCost = distanceKm * params.energyPer100km * params.electricityPrice / 100;
                const chargingServiceCost = distanceKm * params.energyPer100km * params.chargingServiceFeePerKwh / 100;
                const parkingCost = distanceKm * params.parkingFeePer100km / 100;
                const tollCost = distanceKm * params.tollPerKm + tolls;
                const depreciation = params.vehiclePrice / params.depreciationYears / params.annualMileage * distanceKm;
                const computeCost = distanceKm * params.computeCostPerKm;
                const maintenanceCost = distanceKm * params.maintenancePerKm;
                const insuranceCost = params.insurancePerYear / params.annualMileage * distanceKm;
                const taxCost = params.taxPerYear / params.annualMileage * distanceKm;
                const tireCost = params.tirePerYear / params.annualMileage * distanceKm;
                const remoteMonitorCost = distanceKm * params.remoteMonitorPerKm;
                const totalOperatingCost = energyCost + chargingServiceCost + parkingCost + tollCost + depreciation + computeCost + maintenanceCost + insuranceCost + taxCost + tireCost + remoteMonitorCost;
                const operatorServiceFee = totalOperatingCost * params.operatorServiceRate;
                const adRevenue = params.adRevenuePerKm * distanceKm;
                const passengerFare = totalOperatingCost + operatorServiceFee - adRevenue;
                
                const timeValue = durationMin / 60 * hourValue;
                // --- UI ---
                return (
                  <div style={{fontSize:14}}>
                    <div style={{marginBottom:8}}>
                      <b>Cost Breakdown</b>
                      <div style={{margin:'8px 0 0 0', padding:'8px', background:'#fafbfc', borderRadius:6, border:'1px solid #f0f0f0'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Energy cost</span><span style={{fontWeight:500}}>{energyCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Charging service</span><span style={{fontWeight:500}}>{chargingServiceCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Parking</span><span style={{fontWeight:500}}>{parkingCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Tolls</span><span style={{fontWeight:500}}>{tollCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Depreciation</span><span style={{fontWeight:500}}>{depreciation.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Compute cost</span><span style={{fontWeight:500}}>{computeCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Maintenance</span><span style={{fontWeight:500}}>{maintenanceCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Insurance</span><span style={{fontWeight:500}}>{insuranceCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Tax</span><span style={{fontWeight:500}}>{taxCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Tire & wear</span><span style={{fontWeight:500}}>{tireCost.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Remote monitoring</span><span style={{fontWeight:500}}>{remoteMonitorCost.toFixed(2)} RMB</span></div>

                        <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', marginTop:8, paddingTop:8}}><span style={{fontWeight:600}}>Total operating cost</span><span style={{fontWeight:600, color:'#1976d2'}}>{totalOperatingCost.toFixed(2)} RMB</span></div>
                      </div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <b>Fare Calculation</b>
                      <div style={{margin:'8px 0 0 0', padding:'8px', background:'#f6f8fa', borderRadius:6, border:'1px solid #f0f0f0'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Operator service fee</span><span style={{fontWeight:500}}>{operatorServiceFee.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Ad revenue</span><span style={{fontWeight:500}}>-{adRevenue.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', marginTop:8, paddingTop:8}}><span style={{fontWeight:700, fontSize:16}}>Passenger Fare</span><span style={{fontWeight:700, color:'#d32f2f', fontSize:16}}>{passengerFare.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <span style={{fontWeight:600, fontSize:14}}> + Time Value</span>
                          <span style={{fontWeight:600, fontSize:14}}>{timeValue.toFixed(2)} RMB</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:13, color:'#888', marginTop:8}}>
                      <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('robotaxi')}>
                        {showAssumptions.robotaxi ? '▼' : '▶'} Custimize Assumptions
                      </span>
                      {showAssumptions.robotaxi && (
                        <div style={{color:'#888', marginTop: 2}}>
                          {Object.entries({
                            'Energy consumption (kWh/100km)': ['energyPer100km', 'kWh/100km'],
                            'Electricity price': ['electricityPrice', 'RMB/kWh'],
                            'Charging service fee': ['chargingServiceFeePerKwh', 'RMB/kWh'],
                            'Parking fee': ['parkingFeePer100km', 'RMB/100km'],
                            'Toll': ['tollPerKm', 'RMB/km'],
                            'Vehicle price': ['vehiclePrice', 'RMB'],
                            'Depreciation years': ['depreciationYears', 'years'],
                            'Annual mileage': ['annualMileage', 'km/year'],
                            'Compute cost': ['computeCostPerKm', 'RMB/km'],
                            'Maintenance': ['maintenancePerKm', 'RMB/km'],
                            'Insurance': ['insurancePerYear', 'RMB/year'],
                            'Tax': ['taxPerYear', 'RMB/year'],
                            'Tire & wear': ['tirePerYear', 'RMB/year'],
                            'Remote monitoring': ['remoteMonitorPerKm', 'RMB/km'],
                            'Operator service rate': ['operatorServiceRate', ''],
                            'Ad revenue': ['adRevenuePerKm', 'RMB/km'],
                          }).map(([label, [key, unit]]) => (
                            <div key={key} style={{display:'flex', alignItems:'center', marginBottom:2}}>
                              <span style={{minWidth:180, display:'inline-block'}}>{label}:</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={params[key]}
                                onChange={e => handleParam(key, Number(e.target.value)||0)}
                                style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} />
                              <span>{unit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : 'No data',
            }, {
              key: 'taxi',
              label: 'Taxi',
              children: driving ? (() => {
                // 广州出租车计价参数
                const BASE_FARE = 12; // 起步价
                const BASE_DIST = 3; // 起步里程
                const MID_DIST = 15; // 续程分界
                const MID_RATE = 2.6; // 3-15km
                const HIGH_RATE = 2.8; // >15km
                const RETURN_DIST = 20; // 返程费起点
                const TIME_RATE = 0.5; // 等时费/分钟
                
                
                // 计价
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const durationMin = driving.duration / 60;
                // 打表价
                let meterFare = baseFare;
                // 英文明细
                let fareDetail = [`Base fare (${baseDist} km): ${baseFare.toFixed(2)} RMB`];
                if (distanceKm > baseDist) {
                  const mid = Math.min(distanceKm, midDist) - baseDist;
                  if (mid > 0) {
                    meterFare += mid * midRate;
                    fareDetail.push(`3-15 km (${mid.toFixed(2)} km): ${(mid * midRate).toFixed(2)} RMB`);
                  }
                  if (distanceKm > midDist) {
                    const high = distanceKm - midDist;
                    if (high > 0) {
                      meterFare += high * highRate;
                      fareDetail.push(`Above 15 km (${high.toFixed(2)} km): ${(high * highRate).toFixed(2)} RMB`);
                }
                  }
                }
                // 等时费
                const timeFee = durationMin * timeRate;
                meterFare += timeFee;
                fareDetail.push(`Waiting time: ${timeFee.toFixed(2)} RMB`);
                // 时间价值
                const timeValueTaxi = durationMin / 60 * hourValue;
                // meterFare += timeValueTaxi;
                // fareDetail.push(`Time value: ${timeValueTaxi.toFixed(2)} RMB`);
                // 去程高速费
                meterFare += tolls;
                fareDetail.push(`Toll (outbound): ${tolls.toFixed(2)} RMB`);
                // 返程部分
                let returnFare = 0, returnToll = 0;
                if (distanceKm > returnDist) {
                  returnToll = tolls; // 假设回程高速费=去程高速费
                  returnFare = meterFare * returnRatio;
                }
                // 总价
                const totalFare = meterFare + (distanceKm > returnDist ? (returnToll + returnFare) : 0);
                // UI
                return (
                  <div style={{fontSize:14}}>
                    <div style={{marginBottom:8}}>
                      <b>Fare Breakdown</b>
                      <div style={{margin:'8px 0 0 0', padding:'8px', background:'#fafbfc', borderRadius:6, border:'1px solid #f0f0f0'}}>
                        {fareDetail.map((item, idx) => (
                          <div key={idx} style={{display:'flex', justifyContent:'space-between'}}><span>{item.split(':')[0]}</span><span style={{fontWeight:500}}>{item.split(':')[1]}</span></div>
                        ))}
                        {distanceKm > returnDist && (
                          <>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Return toll</span><span style={{fontWeight:500}}>{returnToll.toFixed(2)} RMB</span></div>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Return service fee</span><span style={{fontWeight:500}}>{returnFare.toFixed(2)} RMB</span></div>
                          </>
                        )}
                        <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', marginTop:8, paddingTop:8}}><span style={{fontWeight:700, fontSize:16}}>Passenger Fare</span><span style={{fontWeight:700, color:'#d32f2f', fontSize:16}}>{totalFare.toFixed(2)} RMB</span></div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <span style={{fontWeight:600, fontSize:14}}> + Time Value</span>
                          <span style={{fontWeight:600, fontSize:14}}>{timeValueTaxi.toFixed(2)} RMB</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:13, color:'#888', marginTop:8}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('taxi')}>
                      {showAssumptions.taxi ? '▼' : '▶'} Custimize Assumptions
                    </span>
                    {showAssumptions.taxi && (
                        <div style={{color:'#888', marginTop: 2}}>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>Base fare:</span>
                            <input type="number" min="0" step="0.1" value={baseFare} onChange={e=>setBaseFare(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>Base distance:</span>
                            <input type="number" min="0" step="0.1" value={baseDist} onChange={e=>setBaseDist(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>3-15 km rate:</span>
                            <input type="number" min="0" step="0.01" value={midRate} onChange={e=>setMidRate(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>3-15 km threshold:</span>
                            <input type="number" min="0" step="0.1" value={midDist} onChange={e=>setMidDist(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>Above 15 km rate:</span>
                            <input type="number" min="0" step="0.01" value={highRate} onChange={e=>setHighRate(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>Waiting time rate:</span>
                            <input type="number" min="0" step="0.01" value={timeRate} onChange={e=>setTimeRate(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> RMB/min
                          </div>
                          <div style={{marginTop:4, marginBottom:2, color:'#666'}}>Return service fare = Outbound Meter Fare × Return Ratio</div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>Return threshold:</span>
                            <input type="number" min="0" step="0.1" value={returnDist} onChange={e=>setReturnDist(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} /> km
                          </div>
                          <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
                            <span style={{minWidth:180, display:'inline-block'}}>Return service fee ratio:</span>
                            <input type="number" min="0" step="0.01" value={returnRatio} onChange={e=>setReturnRatio(Number(e.target.value)||0)} style={{width:80, color:'#000', background:'#f5f5f5', border:'none', outline:'none', textAlign:'right', marginRight:4}} />
                          </div>
                          
                          <div style={{marginTop:4}}>Toll: actual<br/>Return toll: if &gt;return threshold, return toll = outbound toll</div>
                      </div>
                    )}
                  </div>
                  </div>
                );
              })() : 'No data',
            }]}
          />
        </Card>
      </div>
    );
  };

  // 1. 新增参数设置相关状态
  // 2. 参数变更处理
  // 3. 参数保存

  // 新建ProjectInfo模块，包含eVTOL Route Planner标题、developed by和白色背景
  const ProjectInfo = () => (
    <div style={{ position: 'absolute', top: 0, left: 20, zIndex: 11, textAlign: 'left', background: 'rgba(255,255,255,0.85)', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '10px 18px 8px 18px', minWidth: 200 }}>
      <div style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 24 }}>eVTOL Price Planner</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
        Developed by <a href="https://yanwen-huang.github.io/home/" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>Yanwen HUANG</a>
      </div>
    </div>
  );

  return (
    <div className="App">
      <div id="map" style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}></div>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 12, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
        <ProjectInfo />
        <div style={{ minWidth: 320, marginLeft: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Radio.Group value={selectType} onChange={e => setSelectType(e.target.value)}>
                  <Radio.Button value="start">Set as Start</Radio.Button>
                  <Radio.Button value="end">Set as End</Radio.Button>
                </Radio.Group>
                <AutoComplete
                  style={{ width: 260, marginLeft: 8 }}
                  options={autoOptions}
                  value={inputValue}
                  onSelect={handleSelect}
                  onSearch={handleSearch}
                  onChange={setInputValue}
                  placeholder="Enter address to search..."
                  allowClear
                  filterOption={false}
                >
                  <Input />
                </AutoComplete>
              </div>
            </div>
          </div>
          {/* 乘客月收入输入框 */}
          <div style={{
            marginTop: 10,
            background: 'rgba(255,255,255,0.95)',
            padding: 10,
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 340
          }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#333', marginRight: 8, whiteSpace: 'nowrap' }}>
              Total Monthly Income of All Passengers
            </span>
            <Input
              type="number"
              min={0}
              value={monthIncome}
              onChange={e => setMonthIncome(Number(e.target.value) || 0)}
              style={{ width: 120, fontWeight: 500, fontSize: 15 }}
              placeholder="50000"
              step={1000}
            />
            <span style={{ color: '#222', fontSize: 15, marginLeft: 2, fontWeight: 600 }}>RMB</span>
          </div>
        </div>
        {/* ESC重置提示，放在eVTOL Price Planner模块下方 */}
        {points.length > 0 && (
          <div className="esc-reset-blink" style={{ position: 'absolute', top: 90, left: 20, zIndex: 13, background: 'rgba(255,255,255,0.95)', padding: '4px 16px', borderRadius: 6, fontSize: 15, color: '#333', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            Press ESC to reset
          </div>
        )}
      </div>
      {loading && <Spin size="large" className="loading-spin" />}
      {renderCards()}
      <Modal
        open={keyModalOpen}
        title="Enter API Keys"
        closable={false}
        maskClosable={false}
        footer={null}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={({ amap, deepseek }) => {
            setAmapKey(amap);
            setDeepseekKey(deepseek.startsWith('sk-') ? deepseek : 'sk-' + deepseek);
            setKeyModalOpen(false);
          }}
        >
          <Form.Item label="Amap API Key" name="amap" rules={[{ required: true, message: 'Please input your Amap API Key!' }]}> 
            <Input.Password autoFocus placeholder="Enter your Amap API Key" />
          </Form.Item>
          <Form.Item label="DeepSeek API Key" name="deepseek" rules={[{ required: true, message: 'Please input your DeepSeek API Key!' }]}> 
            <Input.Password placeholder="Enter your DeepSeek API Key" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>Start</Button>
          </Form.Item>
        </Form>
      </Modal>
      {/* 图例 */}
      <div style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        zIndex: 20,
        background: 'rgba(30,32,40,0.92)',
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        padding: '16px 22px 14px 18px',
        color: '#fff',
        fontSize: 15,
        minWidth: 180,
        fontWeight: 500
      }}>
        <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
          <span style={{display:'inline-block',width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#00e0ff 0%,#00bfff 100%)',boxShadow:'0 0 8px #00e0ff',border:'2px solid #fff',marginRight:10}}></span>
          Start
        </div>
        <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
          <span style={{display:'inline-block',width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#ff4d4f 0%,#ff7875 100%)',boxShadow:'0 0 8px #ff4d4f',border:'2px solid #fff',marginRight:10}}></span>
          End
        </div>
        <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
          <span style={{display:'inline-block',width:38,height:0,borderTop:'8px solid #ffe600',borderRadius:4,marginRight:10}}></span>
          Ground Transport
        </div>
        <div style={{display:'flex',alignItems:'center'}}>
          <svg width="38" height="8" style={{marginRight:10}}><line x1="0" y1="4" x2="38" y2="4" stroke="#00e0ff" strokeWidth="5" strokeDasharray="10,6" strokeLinecap="round"/></svg>
          eVTOL Route
        </div>
      </div>
      {/* DeepSeek QA Modal */}
      <AntdModal
        open={qaModalOpen}
        title="Ask DeepSeek"
        onCancel={handleCloseQaModal}
        footer={null}
        centered
        width={520}
      >
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12, background: '#f7f8fa', borderRadius: 6, padding: 12, minHeight: 80 }}>
          {qaHistory.length === 0 && <div style={{ color: '#888', fontSize: 14 }}>Ask any question about the analysis or route...</div>}
          {qaHistory.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: 10, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <div style={{ display: 'inline-block', background: msg.role === 'user' ? '#e6f7ff' : '#fff', color: '#222', borderRadius: 6, padding: '6px 12px', fontSize: 14, maxWidth: 360, wordBreak: 'break-word' }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {qaError && <div style={{ color: 'red', fontSize: 13 }}>{qaError}</div>}
        </div>
        <Input.TextArea
          value={qaInput}
          onChange={e => setQaInput(e.target.value)}
          onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSendQa(); } }}
          placeholder="Type your question..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={qaLoading}
          style={{ marginBottom: 8 }}
        />
        <Button
          type="primary"
          onClick={handleSendQa}
          loading={qaLoading}
          disabled={!qaInput.trim()}
          style={{ width: '100%' }}
        >
          Send
        </Button>
      </AntdModal>
    </div>
  );
}

export default App;

// 在组件外部添加createStripePattern函数
function createStripePattern(stripeColor = '#000', bgColor = '#fff') {
  const size = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();
  return canvas;
}
