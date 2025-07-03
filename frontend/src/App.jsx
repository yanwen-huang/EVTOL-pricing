import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Button, Spin, message, Tabs, AutoComplete, Input, Radio, Modal, Form } from 'antd';
import 'antd/dist/reset.css';
import './App.css';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactECharts from 'echarts-for-react';
import { Modal as AntdModal } from 'antd';

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
  const hourValue = monthIncome / (4.345 * 40);
  // DeepSeek对话Modal相关状态
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState('');
  const [qaHistory, setQaHistory] = useState([]); // {role, content}
  const co2PopoverRef = useRef(null);

  // CO2参数说明
  const co2Params = {
    'Fuel Car': {
      params: [
        'Fuel consumption (L/100km): 8.0',
        'CO₂ emission factor: 2.32 kg/L',
      ],
      formula: 'CO₂ emissions = Distance (km) × (Fuel consumption / 100) × CO₂ emission factor',
      example: 'E.g. 100 km: 100 × (8/100) × 2.32 = 18.56 kg CO₂',
    },
    'EV': {
      params: [
        'Electricity consumption (kWh/100km): 15',
        'CO₂ emission factor: 0.55 kg/kWh (China average grid)',
      ],
      formula: 'CO₂ emissions = Distance (km) × (Electricity consumption / 100) × CO₂ emission factor',
      example: 'E.g. 100 km: 100 × (15/100) × 0.55 = 8.25 kg CO₂',
    },
    'Robotaxi': {
      params: [
        'Assumed to be EV, same as EV',
      ],
      formula: 'Same as EV',
      example: '',
    },
    'Taxi': {
      params: [
        'Assumed to be fuel car, same as Fuel Car',
      ],
      formula: 'Same as Fuel Car',
      example: '',
    },
    'eVTOL': {
      params: [
        'Energy consumption (kWh/100km): 60 (assumed)',
        'CO₂ emission factor: 0.55 kg/kWh (China average grid)',
      ],
      formula: 'CO₂ emissions = Distance (km) × (Energy consumption / 100) × CO₂ emission factor',
      example: 'E.g. 100 km: 100 × (60/100) × 0.55 = 33 kg CO₂',
    },
  };
  const [co2BarSelected, setCo2BarSelected] = useState(null);

  // 监听点击空白关闭co2说明
  useEffect(() => {
    if (!co2BarSelected) return;
    const handleClick = (e) => {
      if (co2PopoverRef.current && !co2PopoverRef.current.contains(e.target)) {
        setCo2BarSelected(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [co2BarSelected]);

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
    // 驾车
    const driving = results.driving.route && results.driving.route.paths && results.driving.route.paths[0];
    const drivingDistance = driving ? (driving.distance / 1000).toFixed(2) : 'N/A';
    const drivingDuration = driving ? Math.round(driving.duration / 60) : 'N/A';
    // 各方式成本
    let drivingCost = 'N/A', drivingDurationMin = null;
    if (driving) {
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const L_100km = 8.0; // L/100km
      const P_fuel = 7.6;  // RMB/L
      const C_maint_km = 0.07; // RMB/km
      const C_annual_fixed = 6600; // RMB/year
      const D_annual = 12000; // km/year
      const variablePerKm = (L_100km / 100) * P_fuel + C_maint_km;
      const fixedPerKm = C_annual_fixed / D_annual;
      const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
      const durationHour = driving.duration / 3600;
      const timeCost = durationHour * hourValue;
      const totalCost = economicCost + timeCost;
      drivingCost = totalCost.toFixed(2);
      drivingDurationMin = Math.round(driving.duration / 60);
    }
    let evCost = 'N/A', evDurationMin = null;
    if (driving) {
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const evEnergyPer100km = 15;
      const evElectricityPrice = 0.8;
      const C_annual_fixed_ev = 4000; // RMB/year
      const D_annual_ev = 12000; // km/year
      const variablePerKm = (evEnergyPer100km / 100) * evElectricityPrice;
      const fixedPerKm = C_annual_fixed_ev / D_annual_ev;
      const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
      const durationHour = driving.duration / 3600;
      const timeCost = durationHour * hourValue;
      const totalCost = economicCost + timeCost;
      evCost = totalCost.toFixed(2);
      evDurationMin = Math.round(driving.duration / 60);
    }
    let taxiCost = 'N/A';
    if (driving) {
      const distanceKm = driving.distance / 1000;
      const durationMin = driving.duration / 60;
      let distanceCost = 0;
      let emptyReturnCost = 0;
      if (distanceKm <= 3) {
        distanceCost = 10;
      } else if (distanceKm <= 50) {
        distanceCost = 10 + (distanceKm - 3) * 2.5;
      } else {
        distanceCost = 10 + (50 - 3) * 2.5 + (distanceKm - 50) * 2.5;
        emptyReturnCost = (distanceKm - 50) * 2.5;
      }
      const timeCost = durationMin * 0.5;
      const economicCost = distanceCost + timeCost + emptyReturnCost;
      const durationHour = driving.duration / 3600;
      const timeValueCost = durationHour * hourValue;
      const totalCost = economicCost + timeValueCost;
      taxiCost = totalCost.toFixed(2);
    }
    // Robotaxi
    let robotaxiCost = 'N/A';
    if (driving) {
      const tolls = Number(driving.tolls || 0);
      const distanceKm = driving.distance / 1000;
      const evEnergyPer100km = 15;
      const evElectricityPrice = 0.8;
      const C_annual_fixed_ev = 4000; // RMB/year
      const D_annual_ev = 12000; // km/year
      const variablePerKm = (evEnergyPer100km / 100) * evElectricityPrice;
      const fixedPerKm = C_annual_fixed_ev / D_annual_ev;
      const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
      const durationHour = driving.duration / 3600;
      const timeCost = durationHour * hourValue;
      const baseCost = economicCost + timeCost;
      const aiServiceCost = distanceKm * 0.3;
      const platformFee = distanceKm * 0.3;
      const totalCost = baseCost + aiServiceCost + platformFee;
      robotaxiCost = totalCost.toFixed(2);
    }
    // eVTOL
    let evtolCost = 'N/A', evtolTime = 'N/A', evtolDistance = 'N/A', evtolTimeMin = null;
    if (results.straight && results.straight.results && results.straight.results[0]) {
      const straight = results.straight.results[0];
      const distance = straight.distance; // meters
      const cruiseSpeed = 200 * 1000 / 3600; // m/s
      const takeoffLandSpeed = 7.5; // m/s
      const cruiseAltitude = 800; // m
      const takeoffTime = cruiseAltitude / takeoffLandSpeed;
      const landingTime = cruiseAltitude / takeoffLandSpeed;
      const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
      const cruiseTime = cruiseDistance / cruiseSpeed;
      const totalTime = takeoffTime + cruiseTime + landingTime; // seconds
      const distanceKm = distance / 1000;
      const tripHours = totalTime / 3600; // hours
      // All cost parameters in RMB
      const C_energy = 192; // Energy cost per hour, RMB/h (40 AUD * 4.8)
      const C_maint = 1008; // Maintenance cost per hour, RMB/h (210 AUD * 4.8)
      const C_variable = C_energy + C_maint; // Variable cost per hour, RMB/h
      const C_annual_fixed = 2880000; // Annual total fixed cost, RMB/year (600000 AUD * 4.8)
      const annual_flight_hours = 3000; // hours/year
      const N_trips_per_year = tripHours > 0 ? Math.floor(annual_flight_hours / tripHours) : 0;
      const variableCost = C_variable * tripHours;
      const fixedCost = N_trips_per_year > 0 ? C_annual_fixed / N_trips_per_year : 0;
      const timeCost = tripHours * hourValue;
      const totalCost = variableCost + fixedCost + timeCost;
      evtolCost = totalCost.toFixed(2);
      evtolDistance = distanceKm.toFixed(2);
      evtolTime = Math.round(totalTime / 60); // minutes
      evtolTimeMin = totalTime / 60;
      evtolTime = Math.round(evtolTimeMin); // minutes
    }
    // eVTOL溢价价格计算
    let evtolPremium = null, evtolFinalPrice = null, evtolPremiumExplain = '';
    const valuePerMin = 1; // 1元/分钟
    if (drivingCost !== 'N/A' && evtolCost !== 'N/A' && drivingDurationMin !== null && evtolTimeMin !== null) {
      const moneySaved = Number(drivingCost) - Number(evtolCost);
      const timeSaved = Number(drivingDurationMin) - Number(evtolTimeMin);
      evtolPremium = Math.max(0, moneySaved) + Math.max(0, timeSaved) * valuePerMin;
      evtolFinalPrice = (Number(evtolCost) + evtolPremium).toFixed(2);
      evtolPremiumExplain = `\n- eVTOL premium = (Money saved vs. fuel car: ${moneySaved.toFixed(2)} RMB) + (Time saved: ${timeSaved.toFixed(2)} min × ${valuePerMin} RMB/min) = ${evtolPremium.toFixed(2)} RMB.\n- eVTOL recommended price = Cost (${evtolCost} RMB) + premium = ${evtolFinalPrice} RMB.`;
    }
    return `Please analyze and compare the following five travel options for the given route:\n\n- Fuel Car: Distance ${drivingDistance} km, Duration ${drivingDuration} min, Cost ${drivingCost} RMB.\n- Electric Car: Cost ${evCost} RMB.\n- Robotaxi: Cost ${robotaxiCost} RMB.\n- Taxi: Cost ${taxiCost} RMB.\n- eVTOL: Distance ${evtolDistance} km, Flight time ${evtolTime} min, Cost ${evtolCost} RMB.${evtolPremiumExplain}\n\n1. For each mode, compare their advantages and disadvantages in terms of cost, time, convenience, environmental impact, and technological maturity.\n2. Focus on analyzing the business feasibility and premium pricing logic of eVTOL: Is the eVTOL price reasonable and attractive compared to other modes? What are the main value points and limitations for eVTOL in this scenario? In what situations would users be willing to pay a premium for eVTOL?\n3. Based on the above, give an AI-recommended price for eVTOL on this route, and explain your reasoning step by step.\n\nPlease show your analysis process clearly before giving the summary and recommendation.\n\nNote: eVTOL's passenger capacity is usually comparable to a regular taxi, and some models can even carry more (e.g., 4-6 people). Please do not underestimate the passenger capacity of eVTOL when analyzing.\n\nNote: The 'Total Monthly Income of All Passengers' field represents the combined monthly income of all customers/passengers for this trip. This value can help you infer the customer segment, their spending power, and their price sensitivity or willingness to pay for different transportation modes (especially eVTOL). Please take this into account in your analysis and pricing recommendations.`;
  }, [results]);

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

    return (
      <div className="cards-panel">
        <Card title="Driving Route" className="result-card">
          <Tabs
            defaultActiveKey="fuel"
            items={[{
              key: 'fuel',
              label: 'Fuel Car',
              children: driving ? (() => {
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const L_100km = 8.0; // L/100km
                const P_fuel = 7.6;  // RMB/L
                const C_maint_km = 0.07; // RMB/km
                const C_annual_fixed = 6600; // RMB/year
                const D_annual = 12000; // km/year
                const variablePerKm = (L_100km / 100) * P_fuel + C_maint_km;
                const fixedPerKm = C_annual_fixed / D_annual;
                const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
                const durationHour = driving.duration / 3600;
                const timeCost = durationHour * hourValue;
                const totalCost = economicCost + timeCost;
                return <>
                  <div><b>Distance:</b> {distanceKm.toFixed(2)} km</div>
                  <div><b>Duration:</b> {Math.round(driving.duration / 60)} min</div>
                  <div><b>Estimated Cost:</b> {totalCost.toFixed(2)} RMB</div>
                  <div style={{fontSize: '12px', color: '#888'}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('fuel')}>
                      {showAssumptions.fuel ? '▼' : '▶'} Assumptions
                    </span>
                    {showAssumptions.fuel && (
                      <div style={{color:'#aaa', marginTop: 2}}>
                        Fuel consumption: {L_100km} L/100km<br/>
                        Fuel price: {P_fuel} RMB/L<br/>
                        Maintenance: {C_maint_km} RMB/km<br/>
                        Annual fixed cost: {C_annual_fixed} RMB/year<br/>
                        Annual mileage: {D_annual} km/year<br/>
                        Distance: {distanceKm.toFixed(2)} km<br/>
                        Highway tolls: {tolls.toFixed(2)} RMB<br/>
                        Monthly income: {monthIncome} RMB<br/>
                        Hourly value: {hourValue.toFixed(2)} RMB/h<br/>
                        Time cost: {timeCost.toFixed(2)} RMB<br/>
                        Economic cost: {economicCost.toFixed(2)} RMB<br/>
                      </div>
                    )}
                  </div>
                </>;
              })() : 'No data',
            }, {
              key: 'ev',
              label: 'EV',
              children: driving ? (() => {
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const evEnergyPer100km = 15;
                const evElectricityPrice = 0.8;
                const C_annual_fixed_ev = 4000; // RMB/year
                const D_annual_ev = 12000; // km/year
                const variablePerKm = (evEnergyPer100km / 100) * evElectricityPrice;
                const fixedPerKm = C_annual_fixed_ev / D_annual_ev;
                const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
                const durationHour = driving.duration / 3600;
                const timeCost = durationHour * hourValue;
                const totalCost = economicCost + timeCost;
                const evCost = totalCost.toFixed(2);
                return <>
                  <div><b>Distance:</b> {distanceKm.toFixed(2)} km</div>
                  <div><b>Duration:</b> {Math.round(driving.duration / 60)} min</div>
                  <div><b>Estimated Cost:</b> {evCost} RMB</div>
                  <div style={{fontSize: '12px', color: '#888'}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('ev')}>
                      {showAssumptions.ev ? '▼' : '▶'} Assumptions
                    </span>
                    {showAssumptions.ev && (
                      <div style={{color:'#aaa', marginTop: 2}}>
                        Electricity consumption: {evEnergyPer100km} kWh/100km<br/>
                        Electricity price: {evElectricityPrice} RMB/kWh<br/>
                        Annual fixed cost: {C_annual_fixed_ev} RMB/year<br/>
                        Annual mileage: {D_annual_ev} km/year<br/>
                        Distance: {distanceKm.toFixed(2)} km<br/>
                        Highway tolls: {tolls.toFixed(2)} RMB<br/>
                        Monthly income: {monthIncome} RMB<br/>
                        Hourly value: {hourValue.toFixed(2)} RMB/h<br/>
                        Time cost: {timeCost.toFixed(2)} RMB<br/>
                        Economic cost: {economicCost.toFixed(2)} RMB<br/>
                      </div>
                    )}
                  </div>
                </>;
              })() : 'No data',
            }, {
              key: 'robotaxi',
              label: 'Robotaxi',
              children: driving ? (() => {
                const tolls = Number(driving.tolls || 0);
                const distanceKm = driving.distance / 1000;
                const evEnergyPer100km = 15;
                const evElectricityPrice = 0.8;
                const C_annual_fixed_ev = 4000; // RMB/year
                const D_annual_ev = 12000; // km/year
                const variablePerKm = (evEnergyPer100km / 100) * evElectricityPrice;
                const fixedPerKm = C_annual_fixed_ev / D_annual_ev;
                const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
                const durationHour = driving.duration / 3600;
                const timeCost = durationHour * hourValue;
                const baseCost = economicCost + timeCost;
                const aiServiceCost = distanceKm * 0.3; // AI/后台服务费
                const platformFee = distanceKm * 0.3; // 平台服务费/利润
                const totalCost = baseCost + aiServiceCost + platformFee;
                return <>
                  <div><b>Distance:</b> {distanceKm.toFixed(2)} km</div>
                  <div><b>Duration:</b> {Math.round(driving.duration / 60)} min</div>
                  <div><b>Estimated Cost:</b> {totalCost.toFixed(2)} RMB</div>
                  <div style={{fontSize: '12px', color: '#888'}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('robotaxi')}>
                      {showAssumptions.robotaxi ? '▼' : '▶'} Assumptions
                    </span>
                    {showAssumptions.robotaxi && (
                      <div style={{color:'#aaa', marginTop: 2}}>
                        Electricity consumption: {evEnergyPer100km} kWh/100km<br/>
                        Electricity price: {evElectricityPrice} RMB/kWh<br/>
                        Annual fixed cost: {C_annual_fixed_ev} RMB/year<br/>
                        Annual mileage: {D_annual_ev} km/year<br/>
                        Distance: {distanceKm.toFixed(2)} km<br/>
                        Highway tolls: {tolls.toFixed(2)} RMB<br/>
                        Monthly income: {monthIncome} RMB<br/>
                        Hourly value: {hourValue.toFixed(2)} RMB/h<br/>
                        Time cost: {timeCost.toFixed(2)} RMB<br/>
                        Economic cost (EV base): {economicCost.toFixed(2)} RMB<br/>
                        <b>AI/Service cost: {aiServiceCost.toFixed(2)} RMB (0.3 RMB/km)</b><br/>
                        <b>Platform service fee: {platformFee.toFixed(2)} RMB (0.3 RMB/km)</b><br/>
                        <b>Total cost: {totalCost.toFixed(2)} RMB</b>
                      </div>
                    )}
                  </div>
                </>;
              })() : 'No data',
            }, {
              key: 'taxi',
              label: 'Taxi',
              children: driving ? (() => {
                // 中国平均打车价格估算：10元/3km，2.5元/km，0.5元/分钟，超50km空返
                const distanceKm = driving.distance / 1000;
                const durationMin = driving.duration / 60;
                let distanceCost = 0;
                let emptyReturnCost = 0;
                if (distanceKm <= 3) {
                  distanceCost = 10;
                } else if (distanceKm <= 50) {
                  distanceCost = 10 + (distanceKm - 3) * 2.5;
                } else {
                  distanceCost = 10 + (50 - 3) * 2.5 + (distanceKm - 50) * 2.5;
                  emptyReturnCost = (distanceKm - 50) * 2.5;
                }
                const timeCost = durationMin * 0.5;
                const economicCost = distanceCost + timeCost + emptyReturnCost;
                const durationHour = driving.duration / 3600;
                const timeValueCost = durationHour * hourValue;
                const totalCost = economicCost + timeValueCost;
                return <>
                  <div><b>Distance:</b> {distanceKm.toFixed(2)} km</div>
                  <div><b>Duration:</b> {Math.round(durationMin)} min</div>
                  <div><b>Estimated Cost:</b> {totalCost.toFixed(2)} RMB</div>
                  <div style={{fontSize: '12px', color: '#888'}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('taxi')}>
                      {showAssumptions.taxi ? '▼' : '▶'} Assumptions
                    </span>
                    {showAssumptions.taxi && (
                      <div style={{color:'#aaa', marginTop: 2}}>
                        Base fare: 10 RMB/3km<br/>
                        Additional distance: 2.5 RMB/km (&gt;3km)<br/>
                        Time charge: 0.5 RMB/min<br/>
                        Empty return fee: 2.5 RMB/km (&gt;50km)<br/>
                        Distance: {distanceKm.toFixed(2)} km<br/>
                        Monthly income: {monthIncome} RMB<br/>
                        Hourly value: {hourValue.toFixed(2)} RMB/h<br/>
                        Time value cost: {timeValueCost.toFixed(2)} RMB<br/>
                        Economic cost: {economicCost.toFixed(2)} RMB<br/>
                      </div>
                    )}
                  </div>
                </>;
              })() : 'No data',
            }]}
          />
        </Card>
        <Card title="eVTOL Route" className="result-card">
          {straight ? (
            (() => {
              const distance = straight.distance; // meters
              const cruiseSpeed = 200 * 1000 / 3600; // m/s
              const takeoffLandSpeed = 7.5; // m/s
              const cruiseAltitude = 800; // m
              const takeoffTime = cruiseAltitude / takeoffLandSpeed;
              const landingTime = cruiseAltitude / takeoffLandSpeed;
              const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
              const cruiseTime = cruiseDistance / cruiseSpeed;
              const totalTime = takeoffTime + cruiseTime + landingTime; // seconds
              const distanceKm = distance / 1000;
              const tripHours = totalTime / 3600; // hours
              // All cost parameters in RMB
              const C_energy = 192; // Energy cost per hour, RMB/h (40 AUD * 4.8)
              const C_maint = 1008; // Maintenance cost per hour, RMB/h (210 AUD * 4.8)
              const C_variable = C_energy + C_maint; // Variable cost per hour, RMB/h
              const C_annual_fixed = 2880000; // Annual total fixed cost, RMB/year (600000 AUD * 4.8)
              const annual_flight_hours = 3000; // hours/year
              const N_trips_per_year = tripHours > 0 ? Math.floor(annual_flight_hours / tripHours) : 0;
              const variableCost = C_variable * tripHours;
              const fixedCost = N_trips_per_year > 0 ? C_annual_fixed / N_trips_per_year : 0;
              const timeCost = tripHours * hourValue;
              const totalCost = variableCost + fixedCost + timeCost;
              const evtolCost = totalCost.toFixed(2);
              const evtolDistance = distanceKm.toFixed(2);
              const evtolTime = Math.round(totalTime / 60); // minutes
              return (
                <>
                  <div><b>Distance:</b> {evtolDistance} km</div>
                  <div><b>Flight Time:</b> {evtolTime} min</div>
                  <div><b>Estimated Cost:</b> {evtolCost} RMB</div>
                  <div style={{fontSize: '12px', color: '#888', marginTop: 8}}>
                    <span style={{cursor: 'pointer'}} onClick={() => toggleAssumption('evtol')}>
                      {showAssumptions.evtol ? '▼' : '▶'} Assumptions
                    </span>
                    {showAssumptions.evtol && (
                      <span style={{color:'#aaa', display: 'block', marginTop: 2}}>
                        Energy cost per hour: {C_energy} RMB/h<br/>
                        Maintenance cost per hour: {C_maint} RMB/h<br/>
                        Annual total fixed cost: {C_annual_fixed.toLocaleString()} RMB/year<br/>
                        Annual flight hours: {annual_flight_hours} hours/year<br/>
                        Number of flights per year: {N_trips_per_year} times/year<br/>
                        Monthly income: {monthIncome} RMB<br/>
                        Hourly value: {hourValue.toFixed(2)} RMB/h<br/>
                        Time cost: {timeCost.toFixed(2)} RMB<br/>
                        Economic cost: {(variableCost + fixedCost).toFixed(2)} RMB<br/>
                      </span>
                    )}
                  </div>
                </>
              );
            })()
          ) : 'No data'}
        </Card>
        <Card title="Analysis" className="result-card">
          <Tabs defaultActiveKey="chart">
            <Tabs.TabPane tab="Price Bar Chart" key="chart">
              {(() => {
                let fuel = null, ev = null, robotaxi = null, taxi = null, evtol = null;
                if (results) {
                  const driving = results.driving.route && results.driving.route.paths && results.driving.route.paths[0];
                  if (driving) {
                    const tolls = Number(driving.tolls || 0);
                    const distanceKm = driving.distance / 1000;
                    const L_100km = 8.0; // L/100km
                    const P_fuel = 7.6;  // RMB/L
                    const C_maint_km = 0.07; // RMB/km
                    const C_annual_fixed = 6600; // RMB/year
                    const D_annual = 12000; // km/year
                    const variablePerKm = (L_100km / 100) * P_fuel + C_maint_km;
                    const fixedPerKm = C_annual_fixed / D_annual;
                    const economicCost = (variablePerKm + fixedPerKm) * distanceKm + tolls;
                    const durationHour = driving.duration / 3600;
                    const timeCost = durationHour * hourValue;
                    fuel = economicCost + timeCost;
                    // EV
                    const evEnergyPer100km = 15;
                    const evElectricityPrice = 0.8;
                    const C_annual_fixed_ev = 4000; // RMB/year
                    const D_annual_ev = 12000; // km/year
                    const variablePerKmEV = (evEnergyPer100km / 100) * evElectricityPrice;
                    const fixedPerKmEV = C_annual_fixed_ev / D_annual_ev;
                    const economicCostEV = (variablePerKmEV + fixedPerKmEV) * distanceKm + tolls;
                    const timeCostEV = durationHour * hourValue;
                    ev = economicCostEV + timeCostEV;
                    // Robotaxi
                    const baseCost = economicCostEV + timeCostEV;
                    const aiServiceCost = distanceKm * 0.3;
                    const platformFee = distanceKm * 0.3;
                    robotaxi = baseCost + aiServiceCost + platformFee;
                    // Taxi
                    let distanceCost = 0;
                    let emptyReturnCost = 0;
                    if (distanceKm <= 3) {
                      distanceCost = 10;
                    } else if (distanceKm <= 50) {
                      distanceCost = 10 + (distanceKm - 3) * 2.5;
                    } else {
                      distanceCost = 10 + (50 - 3) * 2.5 + (distanceKm - 50) * 2.5;
                      emptyReturnCost = (distanceKm - 50) * 2.5;
                    }
                    const durationMin = driving.duration / 60;
                    const timeCostTaxi = durationMin * 0.5;
                    const economicCostTaxi = distanceCost + timeCostTaxi + emptyReturnCost;
                    const timeValueCostTaxi = durationHour * hourValue;
                    taxi = economicCostTaxi + timeValueCostTaxi;
                  }
                  // eVTOL
                  if (results.straight && results.straight.results && results.straight.results[0]) {
                    const straight = results.straight.results[0];
                    const distance = straight.distance; // meters
                    const cruiseSpeed = 200 * 1000 / 3600; // m/s
                    const takeoffLandSpeed = 7.5; // m/s
                    const cruiseAltitude = 800; // m
                    const takeoffTime = cruiseAltitude / takeoffLandSpeed;
                    const landingTime = cruiseAltitude / takeoffLandSpeed;
                    const cruiseDistance = Math.max(0, distance - 2 * cruiseAltitude);
                    const cruiseTime = cruiseDistance / cruiseSpeed;
                    const totalTime = takeoffTime + cruiseTime + landingTime; // seconds
                    const distanceKm = distance / 1000;
                    const tripHours = totalTime / 3600; // hours
                    // All cost parameters in RMB
                    const C_energy = 192; // Energy cost per hour, RMB/h (40 AUD * 4.8)
                    const C_maint = 1008; // Maintenance cost per hour, RMB/h (210 AUD * 4.8)
                    const C_variable = C_energy + C_maint; // Variable cost per hour, RMB/h
                    const C_annual_fixed = 2880000; // Annual total fixed cost, RMB/year (600000 AUD * 4.8)
                    const annual_flight_hours = 3000; // hours/year
                    const N_trips_per_year = tripHours > 0 ? Math.floor(annual_flight_hours / tripHours) : 0;
                    const variableCost = C_variable * tripHours;
                    const fixedCost = N_trips_per_year > 0 ? C_annual_fixed / N_trips_per_year : 0;
                    const timeCost = tripHours * hourValue;
                    const totalCost = variableCost + fixedCost + timeCost;
                    evtol = totalCost;
                  }
                }
                const chartData = [
                  { name: 'Fuel Car', value: fuel },
                  { name: 'EV', value: ev },
                  { name: 'Robotaxi', value: robotaxi },
                  { name: 'Taxi', value: taxi },
                  { name: 'eVTOL', value: evtol },
                ];
                return (
                  <div style={{ width: '100%', height: 340 }}>
                    <ReactECharts
                      style={{ height: 320 }}
                      option={{
                        grid: { left: 40, right: 20, top: 30, bottom: 40 },
                        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                        xAxis: {
                          type: 'category',
                          data: ['Fuel Car', 'EV', 'Robotaxi', 'Taxi', 'eVTOL'],
                          axisLabel: { fontWeight: 600, fontSize: 12 },
                        },
                        yAxis: {
                          type: 'value',
                          name: 'RMB',
                          nameTextStyle: { fontWeight: 500, fontSize: 12, align: 'left' },
                          axisLabel: { fontWeight: 500, fontSize: 12 },
                        },
                        series: [{
                          type: 'bar',
                          data: chartData.map(d => (d.value !== null && !isNaN(d.value)) ? Number(d.value.toFixed(2)) : null),
                          itemStyle: {
                            color: function(params) {
                              const palette = ['#1890ff','#00c2b3','#00b96b','#ffb300','#ff4d4f'];
                              return palette[params.dataIndex % palette.length];
                            },
                            borderRadius: [6,6,0,0],
                          },
                          barWidth: 38,
                          label: {
                            show: true,
                            position: 'top',
                            fontWeight: 600,
                            fontSize: 12,
                            formatter: v => v.value?.toFixed(2)
                          }
                        }]
                      }}
                    />
                  </div>
                );
              })()}
            </Tabs.TabPane>
            <Tabs.TabPane tab="CO2 Emissions" key="co2">
              {(() => {
                // 计算各交通方式碳排放（单位kg）
                let fuel = null, ev = null, robotaxi = null, taxi = null, evtol = null;
                if (results) {
                  const driving = results.driving.route && results.driving.route.paths && results.driving.route.paths[0];
                  if (driving) {
                    const distanceKm = driving.distance / 1000;
                    // Fuel Car
                    const L_100km = 8.0; // L/100km
                    const CO2_per_L = 2.32; // kg CO2 per L 汽油
                    fuel = distanceKm * (L_100km / 100) * CO2_per_L;
                    // EV
                    const evEnergyPer100km = 15; // kWh/100km
                    const CO2_per_kWh = 0.55; // kg CO2 per kWh（中国平均电网）
                    ev = distanceKm * (evEnergyPer100km / 100) * CO2_per_kWh;
                    // Robotaxi（假设为电动车）
                    robotaxi = ev;
                    // Taxi（假设为燃油车）
                    taxi = fuel;
                  }
                  // eVTOL
                  if (results.straight && results.straight.results && results.straight.results[0]) {
                    const straight = results.straight.results[0];
                    const distance = straight.distance; // meters
                    const distanceKm = distance / 1000;
                    // eVTOL能耗与CO2
                    const kWh_per_100km = 60; // 假设eVTOL 60kWh/100km
                    const CO2_per_kWh = 0.55; // kg CO2 per kWh
                    evtol = distanceKm * (kWh_per_100km / 100) * CO2_per_kWh;
                  }
                }
                const chartData = [
                  { name: 'Fuel Car', value: fuel },
                  { name: 'EV', value: ev },
                  { name: 'Robotaxi', value: robotaxi },
                  { name: 'Taxi', value: taxi },
                  { name: 'eVTOL', value: evtol },
                ];
                return (
                  <div style={{ width: '100%', height: 340 }}>
                    <ReactECharts
                      style={{ height: 320 }}
                      option={{
                        grid: { left: 40, right: 20, top: 30, bottom: 40 },
                        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                        xAxis: {
                          type: 'category',
                          data: ['Fuel Car', 'EV', 'Robotaxi', 'Taxi', 'eVTOL'],
                          axisLabel: { fontWeight: 600, fontSize: 12 },
                        },
                        yAxis: {
                          type: 'value',
                          name: 'kg CO₂',
                          nameTextStyle: { fontWeight: 500, fontSize: 12, align: 'left' },
                          axisLabel: { fontWeight: 500, fontSize: 12 },
                        },
                        series: [{
                          type: 'bar',
                          data: chartData.map(d => (d.value !== null && !isNaN(d.value)) ? Number(d.value.toFixed(2)) : null),
                          itemStyle: {
                            color: function(params) {
                              const palette = ['#1890ff','#00c2b3','#00b96b','#ffb300','#ff4d4f'];
                              return palette[params.dataIndex % palette.length];
                            },
                            borderRadius: [6,6,0,0],
                          },
                          barWidth: 38,
                          label: {
                            show: true,
                            position: 'top',
                            fontWeight: 600,
                            fontSize: 12,
                            formatter: v => v.value?.toFixed(2)
                          }
                        }]
                      }}
                      onEvents={{
                        'click': (params) => {
                          setCo2BarSelected(params.name);
                        }
                      }}
                    />
                    {co2BarSelected && co2Params[co2BarSelected] && (
                      <div
                        ref={co2PopoverRef}
                        style={{
                          position: 'absolute',
                          left: 60,
                          top: 60,
                          zIndex: 20,
                          minWidth: 320,
                          background: '#f7f8fa',
                          borderRadius: 10,
                          boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                          padding: 18,
                          fontSize: 13,
                          color: '#222',
                          border: '1px solid #e0e0e0',
                          maxWidth: 400
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{co2BarSelected} CO₂ Emission Parameters & Calculation</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {co2Params[co2BarSelected].params.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                        <div style={{ margin: '6px 0 2px 0', color: '#555' }}>Formula: {co2Params[co2BarSelected].formula}</div>
                        {co2Params[co2BarSelected].example && <div style={{ color: '#888' }}>Example: {co2Params[co2BarSelected].example}</div>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Tabs.TabPane>
            <Tabs.TabPane tab="DeepSeek Analysis" key="deepseek">
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
      </div>
    );
  };

  // 新建ProjectInfo模块，包含eVTOL Route Planner标题、developed by和白色背景
  const ProjectInfo = () => (
    <div style={{ position: 'absolute', top: 0, left: 20, zIndex: 11, textAlign: 'left', background: 'rgba(255,255,255,0.85)', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '10px 18px 8px 18px', minWidth: 200 }}>
      <div style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 24 }}>eVTOL Route Planner</div>
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
            <Button onClick={handleReset} style={{ height: 48, width: 100, background: 'linear-gradient(90deg, #003366 0%, #0055aa 100%)', color: '#fff', border: 'none', fontWeight: 'bold' }}>Reset</Button>
            {points.length > 0 && (
              <div style={{ marginLeft: 8, background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: 4, fontSize: 14, color: '#333', fontWeight: 'bold', height: 48, display: 'flex', alignItems: 'center' }}>
                Press ESC to reset
              </div>
            )}
          </div>
          <div style={{
            marginLeft: 12,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.88)',
            padding: 8,
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            height: '100%',
            minWidth: 340,
            marginTop: 8,
            marginLeft: -2
          }}>
            <span style={{ fontWeight: 600, fontSize: 15, marginRight: 12, whiteSpace: 'nowrap' }}>
                Total Monthly Income of All Passengers
            </span>
            <Input
              type="number"
              min={0}
              value={monthIncome}
              onChange={e => setMonthIncome(Number(e.target.value) || 50000)}
              style={{ width: 100, margin: '0 6px', fontWeight: 500, fontSize: 15 }}
              placeholder="50000"
              step={1000}
            />
            <span style={{ color: '#222', fontSize: 15, marginLeft: 2, fontWeight: 600 }}>RMB</span>
          </div>
        </div>
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
          Driving Route
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
