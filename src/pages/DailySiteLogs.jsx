// src/components/dailylog/DailySiteLogs.jsx

import { useState, useEffect } from 'react';
import { 
  Sun, CloudRain, Wind, Droplets, Thermometer,
  Users, Truck, FileText, ClipboardList,
  Camera, MapPin, Save, Send,
  Calendar, AlertTriangle, CheckCircle,
  Upload, X, Cloud, RefreshCw,
  Plus, Trash2, Shield, FileCheck,
  Clock, UserCheck, AlertOctagon, ArrowLeft
} from 'lucide-react';
import ComplianceGatekeeper from '../components/compliance/ComplianceGatekeeper';

const API_URL = 'http://127.0.0.1:8000';
const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '886336475379f4ee302c0179d9be24ec';

function DailySiteLogs() {
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('weather');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [weatherData, setWeatherData] = useState({
    loading: false,
    error: null,
    data: null
  });
  const [showCompliance, setShowCompliance] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);

  // BOQ Entries for daily work
  const [boqEntries, setBoqEntries] = useState([]);

  // Form state
  const [logData, setLogData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    weather: {
      condition: 'sunny',
      temperature: '',
      humidity: '',
      windSpeed: '',
      rainfall: '',
    },
    manpower: {
      engineers: 0,
      supervisors: 0,
      skilled: 0,
      laborers: 0,
      operators: 0,
      safety: 0,
      total: 0
    },
    equipment: {
      excavators: { active: 0, total: 0 },
      loaders: { active: 0, total: 0 },
      trucks: { active: 0, total: 0 },
      cranes: { active: 0, total: 0 },
      concreteMixers: { active: 0, total: 0 },
      generators: { active: 0, total: 0 }
    },
    safety: {
      toolbox_talk_topic: '',
      safety_talk_attendees: 0,
      near_miss_count: 0,
      near_miss_description: '',
      first_aid_cases: 0,
      safety_violations: 0,
      safety_inspection_done: false,
    },
    quality: {
      non_conformance_count: 0,
      non_conformance_details: '',
      rework_hours: 0,
      quality_checklist_used: '',
    },
    delays: {
      delay_type: '',
      delay_duration_hours: 0,
      delay_reason: '',
      workers_idle: 0,
      eot_claimed: false,
    },
    subcontractors_on_site: '',
    rfis_submitted: 0,
    rfis_responded: 0,
    drawing_revisions_received: '',
    workDescription: '',
    safetyNotes: '',
    issuesEncountered: '',
    nextDayPlan: '',
    location: {
      latitude: null,
      longitude: null,
      gpsCoordinates: ''
    }
  });

  const [stats, setStats] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    usagePercentage: 0
  });

  const getToken = () => localStorage.getItem('access_token');

  // Fetch projects when component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch BOQ items when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchBOQItems();
    }
  }, [selectedProject]);

  // Calculate equipment totals
  useEffect(() => {
    const totalEq = Object.values(logData.equipment).reduce((sum, eq) => sum + (eq.total || 0), 0);
    const activeEq = Object.values(logData.equipment).reduce((sum, eq) => sum + (eq.active || 0), 0);
    setStats({
      totalEquipment: totalEq,
      activeEquipment: activeEq,
      usagePercentage: totalEq > 0 ? Math.round((activeEq / totalEq) * 100) : 0
    });
  }, [logData.equipment]);

  const fetchProjects = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBOQItems = async () => {
    const token = getToken();
    if (!token || !selectedProject) return;

    try {
      const response = await fetch(`${API_URL}/api/boq/?project_id=${selectedProject}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      const flatItems = [];
      const flattenItems = (items) => {
        for (const item of items) {
          if (item.level >= 3) {
            flatItems.push({
              id: item.id,
              code: item.item_code,
              description: item.description,
              unit: item.unit,
              planned_quantity: item.planned_quantity,
              approved_quantity: item.approved_quantity
            });
          }
          if (item.children) flattenItems(item.children);
        }
      };
      flattenItems(data);
      setBoqItems(flatItems);
    } catch (err) {
      console.error('Failed to fetch BOQ items:', err);
    }
  };

  // WEATHER FUNCTIONS
  const mapWeatherCondition = (condition) => {
    const mapping = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Thunderstorm': 'stormy',
      'Snow': 'cloudy',
      'Mist': 'cloudy',
      'Fog': 'cloudy',
      'Haze': 'cloudy',
      'Smoke': 'cloudy',
      'Dust': 'cloudy',
      'Sand': 'cloudy',
      'Ash': 'cloudy',
      'Squall': 'stormy',
      'Tornado': 'stormy'
    };
    return mapping[condition] || 'cloudy';
  };

  const fetchWeather = async (latitude, longitude) => {
    setWeatherData({ loading: true, error: null, data: null });
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Weather data not available');
      }
      
      const data = await response.json();
      
      setLogData(prevLogData => ({
        ...prevLogData,
        weather: {
          condition: mapWeatherCondition(data.weather[0].main),
          temperature: Math.round(data.main.temp),
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6),
          rainfall: data.rain ? data.rain['1h'] || 0 : 0
        }
      }));
      
      setWeatherData({
        loading: false,
        error: null,
        data: data
      });
    } catch (err) {
      console.error('Failed to fetch weather:', err);
      setWeatherData({
        loading: false,
        error: err.message || 'Failed to fetch weather data',
        data: null
      });
    }
  };

  const getWeatherForLocation = () => {
    if (!navigator.geolocation) {
      setWeatherData({
        loading: false,
        error: 'Geolocation is not supported by your browser.',
        data: null
      });
      return;
    }
    
    setWeatherData({ loading: true, error: null, data: null });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setWeatherData({
          loading: false,
          error: 'Unable to get your location.',
          data: null
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // BOQ ENTRY HANDLERS
  const addBoqEntry = () => {
    setBoqEntries([
      ...boqEntries,
      {
        id: Date.now(),
        boq_item_id: '',
        quantity: '',
        notes: ''
      }
    ]);
  };

  const updateBoqEntry = (index, field, value) => {
    const updated = [...boqEntries];
    updated[index][field] = value;
    setBoqEntries(updated);
  };

  const removeBoqEntry = (index) => {
    setBoqEntries(boqEntries.filter((_, i) => i !== index));
  };

  const getBoqItemDetails = (itemId) => {
    return boqItems.find(item => item.id === parseInt(itemId));
  };

  // FORM HANDLERS
  const handleManpowerChange = (field, value) => {
    const newValue = parseInt(value) || 0;
    const updatedManpower = { ...logData.manpower, [field]: newValue };
    updatedManpower.total = Object.values(updatedManpower).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
    setLogData({ ...logData, manpower: updatedManpower });
  };

  const handleEquipmentChange = (type, field, value) => {
    const newValue = parseInt(value) || 0;
    const updatedEquipment = { ...logData.equipment };
    updatedEquipment[type][field] = newValue;
    setLogData({ ...logData, equipment: updatedEquipment });
  };

  const handleSafetyChange = (field, value) => {
    setLogData({
      ...logData,
      safety: { ...logData.safety, [field]: value }
    });
  };

  const handleQualityChange = (field, value) => {
    setLogData({
      ...logData,
      quality: { ...logData.quality, [field]: value }
    });
  };

  const handleDelaysChange = (field, value) => {
    setLogData({
      ...logData,
      delays: { ...logData.delays, [field]: value }
    });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        setPhotos([...photos, file]);
        setPhotoPreviews([...photoPreviews, URL.createObjectURL(file)]);
      }
    });
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photoPreviews[index]);
    const newPhotos = [...photos];
    const newPreviews = [...photoPreviews];
    newPhotos.splice(index, 1);
    newPreviews.splice(index, 1);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLogData({
          ...logData,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            gpsCoordinates: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          }
        });
      });
    }
  };

  const handleSubmit = async (status = 'draft') => {
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    setSubmitting(true);
    const token = getToken();

    try {
      const logResponse = await fetch(`${API_URL}/api/daily-logs/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: parseInt(selectedProject),
          log_date: logData.log_date,
          work_description: logData.workDescription,
          weather: logData.weather.condition,
          temperature: logData.weather.temperature,
          humidity: logData.weather.humidity,
          wind_speed: logData.weather.windSpeed,
          rainfall: logData.weather.rainfall,
          status: status === 'draft' ? 'draft' : 'submitted',
          manpower: logData.manpower,
          equipment: logData.equipment,
          safety_notes: logData.safetyNotes,
          issues: logData.issuesEncountered,
          next_day_plan: logData.nextDayPlan,
          gps_coordinates: logData.location.gpsCoordinates,
          toolbox_talk_topic: logData.safety.toolbox_talk_topic,
          safety_talk_attendees: logData.safety.safety_talk_attendees,
          near_miss_count: logData.safety.near_miss_count,
          near_miss_description: logData.safety.near_miss_description,
          first_aid_cases: logData.safety.first_aid_cases,
          safety_violations: logData.safety.safety_violations,
          safety_inspection_done: logData.safety.safety_inspection_done,
          non_conformance_count: logData.quality.non_conformance_count,
          non_conformance_details: logData.quality.non_conformance_details,
          rework_hours: logData.quality.rework_hours,
          quality_checklist_used: logData.quality.quality_checklist_used,
          delay_type: logData.delays.delay_type,
          delay_duration_hours: logData.delays.delay_duration_hours,
          delay_reason: logData.delays.delay_reason,
          workers_idle: logData.delays.workers_idle,
          eot_claimed: logData.delays.eot_claimed,
          subcontractors_on_site: logData.subcontractors_on_site,
          rfis_submitted: logData.rfis_submitted,
          rfis_responded: logData.rfis_responded,
          drawing_revisions_received: logData.drawing_revisions_received,
        }),
      });

      if (!logResponse.ok) {
        const errorData = await logResponse.json();
        throw new Error(errorData.message || 'Failed to create daily log');
      }

      const log = await logResponse.json();

      for (const entry of boqEntries) {
        if (entry.boq_item_id && entry.quantity) {
          await fetch(`${API_URL}/api/daily-logs/${log.id}/add_entry/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              boq_item: parseInt(entry.boq_item_id),
              quantity: parseFloat(entry.quantity),
              notes: entry.notes || ''
            }),
          });
        }
      }

      alert(status === 'draft' ? 'Draft saved successfully!' : 'Daily log submitted for approval!');
      if (status === 'submitted') {
        resetForm();
      }
    } catch (err) {
      console.error('Failed to submit:', err);
      alert('Failed to submit daily log: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setLogData({
      log_date: new Date().toISOString().split('T')[0],
      weather: { condition: 'sunny', temperature: '', humidity: '', windSpeed: '', rainfall: '' },
      manpower: { engineers: 0, supervisors: 0, skilled: 0, laborers: 0, operators: 0, safety: 0, total: 0 },
      equipment: {
        excavators: { active: 0, total: 0 },
        loaders: { active: 0, total: 0 },
        trucks: { active: 0, total: 0 },
        cranes: { active: 0, total: 0 },
        concreteMixers: { active: 0, total: 0 },
        generators: { active: 0, total: 0 }
      },
      safety: {
        toolbox_talk_topic: '',
        safety_talk_attendees: 0,
        near_miss_count: 0,
        near_miss_description: '',
        first_aid_cases: 0,
        safety_violations: 0,
        safety_inspection_done: false,
      },
      quality: {
        non_conformance_count: 0,
        non_conformance_details: '',
        rework_hours: 0,
        quality_checklist_used: '',
      },
      delays: {
        delay_type: '',
        delay_duration_hours: 0,
        delay_reason: '',
        workers_idle: 0,
        eot_claimed: false,
      },
      subcontractors_on_site: '',
      rfis_submitted: 0,
      rfis_responded: 0,
      drawing_revisions_received: '',
      workDescription: '',
      safetyNotes: '',
      issuesEncountered: '',
      nextDayPlan: '',
      location: { latitude: null, longitude: null, gpsCoordinates: '' }
    });
    setBoqEntries([]);
    setPhotos([]);
    setPhotoPreviews([]);
    setWeatherData({ loading: false, error: null, data: null });
  };

  const handleProjectSelect = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    if (projectId) {
      const project = projects.find(p => p.id === parseInt(projectId));
      setSelectedProjectName(project?.name || '');
      // Show compliance gatekeeper when project is selected
      setShowCompliance(true);
    }
  };

  const handleAccessGranted = () => {
    setShowCompliance(false);
    setAccessGranted(true);
  };

  const handleCancelCompliance = () => {
    setShowCompliance(false);
    setSelectedProject('');
    setSelectedProjectName('');
  };

  const weatherOptions = [
    { value: 'sunny', label: '☀️ Sunny' },
    { value: 'cloudy', label: '☁️ Cloudy' },
    { value: 'rainy', label: '🌧️ Rainy' },
    { value: 'stormy', label: '⛈️ Stormy' }
  ];

  const tabs = [
    { id: 'weather', label: 'Weather', icon: Sun },
    { id: 'manpower', label: 'Manpower', icon: Users },
    { id: 'equipment', label: 'Equipment', icon: Truck },
    { id: 'work', label: 'Work', icon: ClipboardList },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'quality', label: 'Quality', icon: FileCheck },
    { id: 'delays', label: 'Delays', icon: Clock },
    { id: 'photos', label: 'Photos', icon: Camera }
  ];

  // Show Compliance Gatekeeper
  if (showCompliance && selectedProject) {
    return (
      <div className="p-6">
        <button
          onClick={handleCancelCompliance}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>
        <ComplianceGatekeeper
          projectId={selectedProject}
          projectName={selectedProjectName}
          onAccessGranted={handleAccessGranted}
          onCancel={handleCancelCompliance}
          returnPath="daily-log"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-orange-500" />
              Daily Site Logs
            </h1>
            <p className="text-sm text-gray-500">Record daily site activities, manpower, and progress</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit('submitted')}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              <Send className="h-4 w-4" />
              Submit
            </button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            Select Project <span className="text-xs text-gray-400">(Compliance check required)</span>
          </label>
          <select
            className="w-full md:w-96 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
            value={selectedProject}
            onChange={handleProjectSelect}
          >
            <option value="">Select a project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Only show form if access granted */}
        {accessGranted ? (
          <>
            {/* Date */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                Log Date
              </label>
              <input
                type="date"
                className="w-full md:w-64 p-2 border border-gray-200 rounded-lg"
                value={logData.log_date}
                onChange={(e) => setLogData({ ...logData, log_date: e.target.value })}
              />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Weather Tab */}
            {activeTab === 'weather' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-gray-800">Weather Conditions</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {weatherData.loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                    )}
                    <button
                      onClick={getWeatherForLocation}
                      disabled={weatherData.loading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition border border-orange-200"
                    >
                      <Cloud className="h-4 w-4" />
                      {weatherData.loading ? 'Loading...' : 'Get Live Weather'}
                    </button>
                    {weatherData.data && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Updated {new Date().toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {weatherData.error && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {weatherData.error}
                  </div>
                )}

                {weatherData.data && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Weather updated from {weatherData.data.name}, {weatherData.data.sys.country}
                    <span className="ml-2 text-xs">({new Date().toLocaleTimeString()})</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 flex items-center gap-2">
                      {logData.weather.condition === 'sunny' && <Sun className="h-4 w-4 text-yellow-500" />}
                      {logData.weather.condition === 'cloudy' && <Cloud className="h-4 w-4 text-gray-500" />}
                      {logData.weather.condition === 'rainy' && <CloudRain className="h-4 w-4 text-blue-500" />}
                      {logData.weather.condition === 'stormy' && <CloudRain className="h-4 w-4 text-red-500" />}
                      <span className="capitalize">{logData.weather.condition}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Thermometer className="h-4 w-4 text-gray-400" /> Temperature (°C)
                    </label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                      {logData.weather.temperature || '--'} °C
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Droplets className="h-4 w-4 text-gray-400" /> Humidity (%)
                    </label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                      {logData.weather.humidity || '--'} %
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Wind className="h-4 w-4 text-gray-400" /> Wind Speed (km/h)
                    </label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                      {logData.weather.windSpeed || '--'} km/h
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <CloudRain className="h-4 w-4 text-gray-400" /> Rainfall (mm)
                    </label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                      {logData.weather.rainfall || '0'} mm
                    </div>
                  </div>
                </div>

                {!weatherData.data && !weatherData.loading && !weatherData.error && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Click "Get Live Weather" to fetch current conditions
                  </div>
                )}
              </div>
            )}

            {/* Manpower Tab */}
            {activeTab === 'manpower' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Manpower on Site</h2>
                  <span className="ml-auto text-sm text-gray-500">Total: {logData.manpower.total} workers</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {['engineers', 'supervisors', 'skilled', 'laborers', 'operators', 'safety'].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {field.replace('_', ' ')}
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-200 rounded-lg"
                        value={logData.manpower[field]}
                        onChange={(e) => handleManpowerChange(field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Equipment Status</h2>
                  <span className="ml-auto text-sm text-gray-500">
                    Active: {stats.activeEquipment} / {stats.totalEquipment} | Usage: {stats.usagePercentage}%
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(logData.equipment).map(([type, values]) => (
                    <div key={type} className="border rounded-lg p-3">
                      <div className="font-medium text-gray-700 mb-2 capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Active</label>
                          <input type="number" className="w-full p-1 border rounded mt-1" value={values.active} onChange={(e) => handleEquipmentChange(type, 'active', e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Total</label>
                          <input type="number" className="w-full p-1 border rounded mt-1" value={values.total} onChange={(e) => handleEquipmentChange(type, 'total', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Tab */}
            {activeTab === 'work' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Work Details</h2>
                </div>

                {/* BOQ Entries */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      BOQ Work Tracking
                    </h3>
                    <button
                      type="button"
                      onClick={addBoqEntry}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                      <Plus className="h-3 w-3" />
                      Add Entry
                    </button>
                  </div>

                  {boqItems.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No BOQ items found for this project. Please add BOQ items first.
                    </div>
                  )}

                  {boqEntries.map((entry, index) => {
                    const selectedItem = getBoqItemDetails(entry.boq_item_id);
                    return (
                      <div key={entry.id} className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">BOQ Item</label>
                            <select
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                              value={entry.boq_item_id}
                              onChange={(e) => updateBoqEntry(index, 'boq_item_id', e.target.value)}
                            >
                              <option value="">Select BOQ Item</option>
                              {boqItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.code} - {item.description} ({item.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Quantity Worked ({selectedItem?.unit || 'unit'})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                              placeholder="Enter quantity"
                              value={entry.quantity}
                              onChange={(e) => updateBoqEntry(index, 'quantity', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 p-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                                placeholder="Optional notes"
                                value={entry.notes}
                                onChange={(e) => updateBoqEntry(index, 'notes', e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeBoqEntry(index)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {selectedItem && entry.quantity && (
                          <div className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                            Planned: {selectedItem.planned_quantity} {selectedItem.unit} | 
                            Approved: {selectedItem.approved_quantity} {selectedItem.unit}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {boqEntries.length === 0 && boqItems.length > 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Click "Add Entry" to record BOQ work progress</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Description</label>
                  <textarea
                    rows="4"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Describe the work completed today in detail..."
                    value={logData.workDescription}
                    onChange={(e) => setLogData({ ...logData, workDescription: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Safety Notes</label>
                    <textarea
                      rows="3"
                      className="w-full p-3 border border-gray-200 rounded-lg"
                      placeholder="Any safety observations or incidents..."
                      value={logData.safetyNotes}
                      onChange={(e) => setLogData({ ...logData, safetyNotes: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issues Encountered</label>
                    <textarea
                      rows="3"
                      className="w-full p-3 border border-gray-200 rounded-lg"
                      placeholder="Any problems, delays, or challenges..."
                      value={logData.issuesEncountered}
                      onChange={(e) => setLogData({ ...logData, issuesEncountered: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Day Plan</label>
                  <textarea
                    rows="3"
                    className="w-full p-3 border border-gray-200 rounded-lg"
                    placeholder="Planned activities for tomorrow..."
                    value={logData.nextDayPlan}
                    onChange={(e) => setLogData({ ...logData, nextDayPlan: e.target.value })}
                  />
                </div>

                <div className="border-t border-gray-100 pt-4 mt-2">
                  <button
                    onClick={getLocation}
                    className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600"
                  >
                    <MapPin className="h-4 w-4" />
                    Get GPS Coordinates
                  </button>
                  {logData.location.gpsCoordinates && (
                    <p className="text-xs text-gray-500 mt-2">GPS: {logData.location.gpsCoordinates}</p>
                  )}
                </div>
              </div>
            )}

            {/* Safety Tab */}
            {activeTab === 'safety' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Safety & Compliance</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Toolbox Talk Topic
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Topic discussed"
                      value={logData.safety.toolbox_talk_topic}
                      onChange={(e) => handleSafetyChange('toolbox_talk_topic', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Safety Talk Attendees
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.safety.safety_talk_attendees}
                      onChange={(e) => handleSafetyChange('safety_talk_attendees', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Near Miss Count
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.safety.near_miss_count}
                      onChange={(e) => handleSafetyChange('near_miss_count', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Aid Cases
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.safety.first_aid_cases}
                      onChange={(e) => handleSafetyChange('first_aid_cases', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Safety Violations
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.safety.safety_violations}
                      onChange={(e) => handleSafetyChange('safety_violations', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-6">
                    <label className="text-sm font-medium text-gray-700">Safety Inspection Done</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        checked={logData.safety.safety_inspection_done}
                        onChange={(e) => handleSafetyChange('safety_inspection_done', e.target.checked)}
                      />
                      <span className="text-sm text-gray-500">
                        {logData.safety.safety_inspection_done ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Near Miss Description
                  </label>
                  <textarea
                    rows="3"
                    className="w-full p-3 border border-gray-200 rounded-lg"
                    placeholder="Describe any near misses..."
                    value={logData.safety.near_miss_description}
                    onChange={(e) => handleSafetyChange('near_miss_description', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Quality Tab */}
            {activeTab === 'quality' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Quality Control</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Non-Conformance Count
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.quality.non_conformance_count}
                      onChange={(e) => handleQualityChange('non_conformance_count', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rework Hours
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.quality.rework_hours}
                      onChange={(e) => handleQualityChange('rework_hours', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality Checklist Used
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Checklist name or reference"
                      value={logData.quality.quality_checklist_used}
                      onChange={(e) => handleQualityChange('quality_checklist_used', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Non-Conformance Details
                  </label>
                  <textarea
                    rows="3"
                    className="w-full p-3 border border-gray-200 rounded-lg"
                    placeholder="Describe any non-conformance issues..."
                    value={logData.quality.non_conformance_details}
                    onChange={(e) => handleQualityChange('non_conformance_details', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Delays Tab */}
            {activeTab === 'delays' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Delays & Disruptions</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay Type
                    </label>
                    <select
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.delays.delay_type}
                      onChange={(e) => handleDelaysChange('delay_type', e.target.value)}
                    >
                      <option value="">Select delay type</option>
                      <option value="weather">Weather</option>
                      <option value="material">Material Shortage</option>
                      <option value="labour">Labour Shortage</option>
                      <option value="equipment">Equipment Failure</option>
                      <option value="design">Design Changes</option>
                      <option value="subcontractor">Subcontractor Delays</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay Duration Hours
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.delays.delay_duration_hours}
                      onChange={(e) => handleDelaysChange('delay_duration_hours', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workers Idle
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      value={logData.delays.workers_idle}
                      onChange={(e) => handleDelaysChange('workers_idle', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-6">
                    <label className="text-sm font-medium text-gray-700">EOT Claimed</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        checked={logData.delays.eot_claimed}
                        onChange={(e) => handleDelaysChange('eot_claimed', e.target.checked)}
                      />
                      <span className="text-sm text-gray-500">
                        {logData.delays.eot_claimed ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay Reason
                  </label>
                  <textarea
                    rows="3"
                    className="w-full p-3 border border-gray-200 rounded-lg"
                    placeholder="Describe the reason for delay..."
                    value={logData.delays.delay_reason}
                    onChange={(e) => handleDelaysChange('delay_reason', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Site Photos</h2>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-gray-400" />
                    <span className="text-sm text-gray-500">Click to upload site photos</span>
                    <span className="text-xs text-gray-400">or drag and drop</span>
                  </label>
                </div>

                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {photoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img src={preview} alt={`Site ${idx + 1}`} className="w-full h-32 object-cover rounded-lg border" />
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => handleSubmit('draft')}
                disabled={submitting}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit('submitted')}
                disabled={submitting}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Submit for Approval
              </button>
            </div>
          </>
        ) : (
          // Show message when no project selected or access not granted
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
            <Shield className="h-12 w-12 text-orange-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">Select a Project</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select a project above to start logging daily site activities.
              <br />
              <span className="text-xs text-orange-500">Compliance verification required for access.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailySiteLogs;