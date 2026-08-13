const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';
const WEATHER_API_KEY = '886336475379f4ee302c0179d9be24ec';

import { useState, useEffect } from 'react';
import { 
  Sparkles, Sun, Cloud, CloudRain, Wind, Droplets, Thermometer, 
  Users, Truck, FileText, ClipboardList, AlertCircle, Plus, Trash2, 
  Calendar, Clock, Send, MapPin, Loader2, CheckCircle, XCircle, Info,
  Lock, Unlock, Shield
} from 'lucide-react';
import ComplianceGatekeeper from '../compliance/ComplianceGatekeeper';

function DailyLogForm({ projectId, onSuccess }) {
  const [boqItems, setBoqItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [info, setInfo] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [location, setLocation] = useState('Sandton, ZA');

  // Compliance Gatekeeper state
  const [showCompliance, setShowCompliance] = useState(true);
  const [complianceProjectName, setComplianceProjectName] = useState('');
  const [hasComplianceAccess, setHasComplianceAccess] = useState(false);
  const [checkingCompliance, setCheckingCompliance] = useState(true);

  const [weather, setWeather] = useState({
    condition: 'sunny',
    temperature: '',
    humidity: '',
    windSpeed: '',
    rainfall: '',
    notes: '',
  });

  const [manpower, setManpower] = useState([]);
  const [newManpower, setNewManpower] = useState({ role: '', count: '', hoursWorked: '' });

  const [equipment, setEquipment] = useState([]);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    status: 'operational',
    hoursUsed: '',
    notes: '',
  });

  const [boqEntries, setBoqEntries] = useState([]);
  const [newBoqEntry, setNewBoqEntry] = useState({ boq_item_id: '', quantity: '', notes: '' });

  const [workDescription, setWorkDescription] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');

  const [activeTab, setActiveTab] = useState('weather');

  const getToken = () => localStorage.getItem('access_token');

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (success || error || info) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
        setInfo(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error, info]);

  // Check compliance when component mounts
  useEffect(() => {
    if (projectId) {
      checkComplianceAccess();
    }
  }, [projectId]);

  const checkComplianceAccess = async () => {
    setCheckingCompliance(true);
    const token = getToken();
    
    console.log('🔐 Checking compliance for Daily Log...');
    console.log('Project ID:', projectId);
    console.log('Token exists:', !!token);
    
    if (!token) {
      console.log('⚠️ No token, skipping compliance check');
      setCheckingCompliance(false);
      setHasComplianceAccess(true);
      setShowCompliance(false);
      return;
    }

    try {
      // First get project name
      const projectRes = await fetch(`${API_URL}/api/projects/${projectId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projectData = await projectRes.json();
      setComplianceProjectName(projectData.name || 'Project');
      
      // Then check compliance access
      const response = await fetch(
        `${API_URL}/api/compliance/check-access/?project_id=${projectId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const data = await response.json();
      console.log('✅ Compliance check response:', data);
      
      if (data.has_access) {
        console.log('✅ Compliance access granted');
        setHasComplianceAccess(true);
        setShowCompliance(false);
      } else {
        console.log('⛔ Compliance access denied, showing gatekeeper');
        setHasComplianceAccess(false);
        setShowCompliance(true);
      }
    } catch (error) {
      console.error('❌ Failed to check compliance:', error);
      // If compliance check fails, allow access
      setHasComplianceAccess(true);
      setShowCompliance(false);
    } finally {
      setCheckingCompliance(false);
    }
  };

  const handleAccessGranted = () => {
    console.log('✅ Compliance granted via gatekeeper');
    setShowCompliance(false);
    setHasComplianceAccess(true);
  };

  const handleCancelCompliance = () => {
    console.log('❌ Compliance check cancelled');
    setShowCompliance(false);
    // If cancelled, go back
    window.history.back();
  };

  // Fetch weather data when compliance is met
  useEffect(() => {
    if (hasComplianceAccess && !showCompliance) {
      fetchWeatherData();
    }
  }, [date, hasComplianceAccess, showCompliance]);

  const fetchWeatherData = async () => {
    setWeatherLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await getWeatherByCoords(latitude, longitude);
          },
          async () => {
            await getWeatherByCity('Sandton,ZA');
          }
        );
      } else {
        await getWeatherByCity('Sandton,ZA');
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeatherLoading(false);
    }
  };

  const getWeatherByCoords = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) throw new Error('Weather API request failed');
      
      const data = await response.json();
      updateWeatherState(data);
      
      const locationResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`
      );
      const locationData = await locationResponse.json();
      if (locationData && locationData.length > 0) {
        setLocation(`${locationData[0].name}, ${locationData[0].country}`);
      }
      
      setWeatherLoading(false);
    } catch (error) {
      console.error('Weather fetch error:', error);
      await getWeatherByCity('Sandton,ZA');
    }
  };

  const getWeatherByCity = async (city) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) throw new Error('Weather API request failed');
      
      const data = await response.json();
      updateWeatherState(data);
      setLocation(city.replace(',', ', '));
      setWeatherLoading(false);
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherLoading(false);
    }
  };

  const updateWeatherState = (data) => {
    const conditionMap = {
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
    };

    const mainCondition = data.weather?.[0]?.main || 'Clear';
    const mappedCondition = conditionMap[mainCondition] || 'sunny';

    setWeather({
      condition: mappedCondition,
      temperature: data.main?.temp?.toString() || '',
      humidity: data.main?.humidity?.toString() || '',
      windSpeed: data.wind?.speed?.toString() || '',
      rainfall: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0).toString() : '0',
      notes: `${data.weather?.[0]?.description || ''} (auto-fetched)`,
    });
  };

  const handleRefreshWeather = () => {
    fetchWeatherData();
    setInfo('Weather data refreshed successfully!');
  };

  // Fetch BOQ items when compliance is met
  useEffect(() => {
    if (hasComplianceAccess && !showCompliance && projectId) {
      fetchBOQItems();
    }
  }, [projectId, hasComplianceAccess, showCompliance]);

  const fetchBOQItems = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found. Please login again.');
        return;
      }

      const response = await fetch(`${API_URL}/api/boq/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch BOQ: ${response.status}`);
      }

      const data = await response.json();
      const flatten = (items) => {
        let result = [];
        for (const item of items) {
          if (item.level >= 3) result.push(item);
          if (item.children) result.push(...flatten(item.children));
        }
        return result;
      };
      setBoqItems(flatten(data));
    } catch (err) {
      console.error('Failed to fetch BOQ:', err);
      setError('Failed to load BOQ items: ' + err.message);
    }
  };

  const addManpower = () => {
    if (newManpower.role && newManpower.count && newManpower.count > 0) {
      setManpower([...manpower, { 
        role: newManpower.role, 
        count: parseFloat(newManpower.count), 
        hoursWorked: parseFloat(newManpower.hoursWorked) || 8 
      }]);
      setNewManpower({ role: '', count: '', hoursWorked: '' });
      setSuccess('Manpower entry added successfully!');
    }
  };

  const removeManpower = (index) => {
    setManpower(manpower.filter((_, i) => i !== index));
  };

  const addEquipment = () => {
    if (newEquipment.name) {
      setEquipment([...equipment, { 
        ...newEquipment, 
        hoursUsed: parseFloat(newEquipment.hoursUsed) || 0 
      }]);
      setNewEquipment({ name: '', status: 'operational', hoursUsed: '', notes: '' });
      setSuccess('Equipment entry added successfully!');
    }
  };

  const removeEquipment = (index) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const addBoqEntry = () => {
    if (newBoqEntry.boq_item_id && newBoqEntry.quantity && newBoqEntry.quantity > 0) {
      const selectedItem = boqItems.find(item => item.id === parseInt(newBoqEntry.boq_item_id));
      setBoqEntries([...boqEntries, {
        boq_item_id: parseInt(newBoqEntry.boq_item_id),
        item_code: selectedItem?.item_code,
        description: selectedItem?.description,
        quantity: parseFloat(newBoqEntry.quantity),
        notes: newBoqEntry.notes
      }]);
      setNewBoqEntry({ boq_item_id: '', quantity: '', notes: '' });
      setSuccess('BOQ entry added successfully!');
    }
  };

  const removeBoqEntry = (index) => {
    setBoqEntries(boqEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    if (!workDescription.trim()) {
      setError('Please enter a work description in the "Work" tab before submitting.');
      setActiveTab('work');
      setSubmitting(false);
      return;
    }
    
    if (boqEntries.length === 0) {
      setError('Please add at least one BOQ entry before submitting.');
      setActiveTab('boq');
      setSubmitting(false);
      return;
    }
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const projectIdNum = parseInt(projectId, 10);
      if (isNaN(projectIdNum)) {
        throw new Error('Invalid project ID');
      }
      
      const logPayload = {
        project: projectIdNum,
        log_date: date,
        work_description: workDescription,
        weather: weather.condition,
        temperature: weather.temperature ? parseFloat(weather.temperature) : null,
        status: 'submitted'
      };
      
      console.log('Creating log with payload:', logPayload);
      
      const logResponse = await fetch(`${API_URL}/api/daily-logs/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(logPayload),
      });
      
      const logResponseText = await logResponse.text();
      console.log('Log response status:', logResponse.status);
      console.log('Log response body:', logResponseText);
      
      if (!logResponse.ok) {
        let errorMsg = `Failed to create log: ${logResponse.status}`;
        try {
          const errorData = JSON.parse(logResponseText);
          errorMsg += ` - ${JSON.stringify(errorData)}`;
        } catch(e) {
          errorMsg += ` - ${logResponseText}`;
        }
        throw new Error(errorMsg);
      }
      
      const log = JSON.parse(logResponseText);
      console.log('Log created successfully:', log);
      
      for (const entry of boqEntries) {
        const entryPayload = {
          daily_log: log.id,
          boq_item: entry.boq_item_id,
          quantity: entry.quantity,
          notes: entry.notes || ''
        };
        
        console.log('Adding entry:', entryPayload);
        
        const entryResponse = await fetch(`${API_URL}/api/daily-logs/${log.id}/add_entry/`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(entryPayload),
        });
        
        const entryResponseText = await entryResponse.text();
        console.log(`Entry response status: ${entryResponse.status}`);
        console.log(`Entry response body: ${entryResponseText}`);
        
        if (!entryResponse.ok) {
          let errorMsg = `Failed to add entry: ${entryResponse.status}`;
          try {
            const errorData = JSON.parse(entryResponseText);
            errorMsg += ` - ${JSON.stringify(errorData)}`;
          } catch(e) {
            errorMsg += ` - ${entryResponseText}`;
          }
          throw new Error(errorMsg);
        }
      }
      
      setSuccess('✅ Daily log submitted successfully!');
      onSuccess && onSuccess();
      
      setTimeout(() => {
        setManpower([]);
        setEquipment([]);
        setBoqEntries([]);
        setWorkDescription('');
        setSafetyNotes('');
        setIssuesEncountered('');
        setNextDayPlan('');
      }, 1000);
      
    } catch (err) {
      console.error('Failed to submit:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalManpower = manpower.reduce((sum, m) => sum + (m.count || 0), 0);
  const totalManHours = manpower.reduce((sum, m) => sum + (m.count || 0) * (m.hoursWorked || 0), 0);
  const operationalEquipment = equipment.filter(e => e.status === 'operational').length;

  const tabs = [
    { id: 'weather', label: 'Weather', icon: Sun, color: 'from-sky-500 to-blue-500' },
    { id: 'manpower', label: 'Manpower', icon: Users, color: 'from-emerald-500 to-teal-500' },
    { id: 'equipment', label: 'Equipment', icon: Truck, color: 'from-purple-500 to-indigo-500' },
    { id: 'boq', label: 'BOQ Progress', icon: FileText, color: 'from-amber-500 to-orange-500' },
    { id: 'work', label: 'Work', icon: ClipboardList, color: 'from-rose-500 to-pink-500' }
  ];

  const handleNumberChange = (setter, field, value) => {
    if (value === '') {
      setter(prev => ({ ...prev, [field]: '' }));
    } else if (!isNaN(parseFloat(value))) {
      setter(prev => ({ ...prev, [field]: value }));
    }
  };

  const getWeatherIcon = (condition) => {
    switch(condition) {
      case 'sunny': return <Sun className="h-8 w-8 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-8 w-8 text-gray-500" />;
      case 'rainy': return <CloudRain className="h-8 w-8 text-blue-500" />;
      case 'stormy': return <CloudRain className="h-8 w-8 text-purple-600" />;
      default: return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getConditionLabel = (condition) => {
    switch(condition) {
      case 'sunny': return '☀️ Sunny';
      case 'cloudy': return '☁️ Cloudy';
      case 'rainy': return '🌧️ Rainy';
      case 'stormy': return '⛈️ Stormy';
      default: return '☀️ Sunny';
    }
  };

  // Alert Component
  const Alert = ({ type, message, onClose }) => {
    const styles = {
      success: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
        text: 'text-emerald-700',
        button: 'text-emerald-400 hover:text-emerald-600'
      },
      error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        text: 'text-red-700',
        button: 'text-red-400 hover:text-red-600'
      },
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: <Info className="h-5 w-5 text-blue-500" />,
        text: 'text-blue-700',
        button: 'text-blue-400 hover:text-blue-600'
      }
    };

    const style = styles[type] || styles.info;

    return (
      <div className={`${style.bg} border ${style.border} rounded-xl p-4 flex items-start gap-3 shadow-sm animate-slideDown`}>
        <div className="flex-shrink-0 mt-0.5">
          {style.icon}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${style.text}`}>{message}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className={`flex-shrink-0 ${style.button} transition-colors`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  // Show compliance gatekeeper if needed
  if (checkingCompliance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
          <p className="text-white/70">Checking compliance requirements...</p>
        </div>
      </div>
    );
  }

  if (showCompliance && !hasComplianceAccess) {
    return (
      <div className="relative min-h-[500px]">
        <button
          onClick={handleCancelCompliance}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300"
        >
          ← Back
        </button>
        <ComplianceGatekeeper
          projectId={projectId}
          projectName={complianceProjectName || 'Project'}
          onAccessGranted={handleAccessGranted}
          onCancel={handleCancelCompliance}
          returnPath="daily-log"
        />
      </div>
    );
  }

  // Main render - Daily Log Form
  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* Header with Compliance Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Daily Log Entry</h2>
            <p className="text-xs text-gray-400 mt-0.5">Record site activities, manpower, and progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-[10px] text-green-600 border border-green-500/30">
            <CheckCircle className="h-3 w-3" />
            Compliance OK
          </div>
          <button
            onClick={() => setShowCompliance(true)}
            className="text-xs text-blue-500 hover:text-blue-600"
          >
            View Compliance
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {info && <Alert type="info" message={info} onClose={() => setInfo(null)} />}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-300 rounded-t-xl ${
              activeTab === tab.id 
                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg` 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className={`h-4 w-4 transition-all duration-300 ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Weather Tab */}
      {activeTab === 'weather' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-sky-100">
                  <Sun className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Weather Conditions</h3>
                <span className="text-[10px] text-gray-400 ml-2">(auto-fetched)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <MapPin className="h-3 w-3" />
                  {location}
                </div>
                <button
                  onClick={handleRefreshWeather}
                  disabled={weatherLoading}
                  className="p-1.5 rounded-lg bg-white/50 hover:bg-white transition-colors"
                  title="Refresh weather"
                >
                  {weatherLoading ? (
                    <Loader2 className="h-3.5 w-3.5 text-sky-500 animate-spin" />
                  ) : (
                    <svg className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400" /> Log Date
                </label>
                <input 
                  type="date" 
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                  value={date} 
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <Cloud className="h-3 w-3 text-gray-400" /> Condition
                </label>
                <div className="flex items-center gap-2 w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed">
                  {weatherLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <>
                      {getWeatherIcon(weather.condition)}
                      <span>{getConditionLabel(weather.condition)}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-gray-400" /> Temperature (°C)
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                  value={weatherLoading ? 'Loading...' : (weather.temperature || 'N/A')}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-gray-400" /> Humidity (%)
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                  value={weatherLoading ? 'Loading...' : (weather.humidity || 'N/A')}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <Wind className="h-3 w-3 text-gray-400" /> Wind Speed (km/h)
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                  value={weatherLoading ? 'Loading...' : (weather.windSpeed || 'N/A')}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <CloudRain className="h-3 w-3 text-gray-400" /> Rainfall (mm)
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                  value={weatherLoading ? 'Loading...' : (weather.rainfall || '0')}
                  disabled
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Additional Notes</label>
              <textarea 
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                rows="2" 
                value={weather.notes || 'Weather data auto-fetched from OpenWeather'} 
                disabled
              />
            </div>
          </div>
        </div>
      )}

      {/* Manpower Tab */}
      {activeTab === 'manpower' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-100">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              Manpower Summary
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input type="text" placeholder="Role (e.g., Labourer)" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newManpower.role} onChange={(e) => setNewManpower({ ...newManpower, role: e.target.value })} />
              <input type="text" inputMode="numeric" placeholder="Count" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newManpower.count} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d+$/.test(val)) setNewManpower({ ...newManpower, count: val }); }} />
              <input type="text" inputMode="numeric" placeholder="Hours Worked" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newManpower.hoursWorked} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setNewManpower({ ...newManpower, hoursWorked: val }); }} />
            </div>
            <button onClick={addManpower} className="w-full text-sm bg-emerald-50 text-emerald-700 py-2.5 rounded-lg hover:bg-emerald-100 transition-colors mb-4 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Add Manpower
            </button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {manpower.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No manpower entries added</p>
                  <p className="text-xs mt-1">Click "Add Manpower" to start</p>
                </div>
              ) : (
                manpower.map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{entry.role}</span>
                      <span className="text-xs text-gray-500 ml-2">{entry.count} workers × {entry.hoursWorked}h = {entry.count * entry.hoursWorked} hrs</span>
                    </div>
                    <button onClick={() => removeManpower(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {manpower.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">Total Workers:</span>
                <span className="font-semibold text-gray-800">{totalManpower}</span>
                <span className="text-gray-500">Total Man-hours:</span>
                <span className="font-semibold text-gray-800">{totalManHours}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <div className="p-1 rounded-lg bg-purple-100">
                <Truck className="h-3.5 w-3.5 text-purple-600" />
              </div>
              Equipment Usage
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="text" placeholder="Equipment Name" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.name} onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })} />
              <select className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.status} onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value })}>
                <option value="operational">🟢 Operational</option>
                <option value="maintenance">🟡 Maintenance</option>
                <option value="idle">⚪ Idle</option>
              </select>
              <input type="text" inputMode="numeric" placeholder="Hours Used" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.hoursUsed} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setNewEquipment({ ...newEquipment, hoursUsed: val }); }} />
              <input type="text" placeholder="Notes" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.notes} onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })} />
            </div>
            <button onClick={addEquipment} className="w-full text-sm bg-purple-50 text-purple-700 py-2.5 rounded-lg hover:bg-purple-100 transition-colors mb-4 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Add Equipment
            </button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {equipment.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No equipment entries added</p>
                  <p className="text-xs mt-1">Click "Add Equipment" to start</p>
                </div>
              ) : (
                equipment.map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{entry.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{entry.status} • {entry.hoursUsed}h used</span>
                      {entry.notes && <span className="text-xs text-gray-400 ml-2">• {entry.notes}</span>}
                    </div>
                    <button onClick={() => removeEquipment(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOQ Progress Tab */}
      {activeTab === 'boq' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-100">
                <FileText className="h-3.5 w-3.5 text-amber-600" />
              </div>
              BOQ Progress Entries
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <select className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newBoqEntry.boq_item_id} onChange={(e) => setNewBoqEntry({ ...newBoqEntry, boq_item_id: e.target.value })}>
                <option value="">Select BOQ Item</option>
                {boqItems.map(item => <option key={item.id} value={item.id}>{item.item_code} - {item.description.substring(0, 40)}</option>)}
              </select>
              <input type="text" inputMode="numeric" placeholder="Quantity" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newBoqEntry.quantity} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setNewBoqEntry({ ...newBoqEntry, quantity: val }); }} />
              <input type="text" placeholder="Notes" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newBoqEntry.notes} onChange={(e) => setNewBoqEntry({ ...newBoqEntry, notes: e.target.value })} />
            </div>
            <button onClick={addBoqEntry} className="w-full text-sm bg-amber-50 text-amber-700 py-2.5 rounded-lg hover:bg-amber-100 transition-colors mb-4 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Add BOQ Entry
            </button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {boqEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No BOQ entries added</p>
                  <p className="text-xs mt-1">Click "Add BOQ Entry" to start</p>
                </div>
              ) : (
                boqEntries.map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{entry.item_code}</span>
                      <span className="text-xs text-gray-500 ml-2">Qty: {entry.quantity}</span>
                      {entry.notes && <span className="text-xs text-gray-400 ml-2">• {entry.notes}</span>}
                    </div>
                    <button onClick={() => removeBoqEntry(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work Tab */}
      {activeTab === 'work' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-pink-50">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <div className="p-1 rounded-lg bg-rose-100">
                <ClipboardList className="h-3.5 w-3.5 text-rose-600" />
              </div>
              Work Details & Notes
            </h3>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Description <span className="text-red-500">*</span>
                </label>
                <textarea rows="4" className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500" value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} placeholder="Describe the work completed today in detail..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Safety Notes</label>
                <textarea rows="2" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} placeholder="Any safety observations or incidents..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Issues Encountered</label>
                <textarea rows="2" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={issuesEncountered} onChange={(e) => setIssuesEncountered(e.target.value)} placeholder="Any problems, delays, or challenges..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Next Day Plan</label>
                <textarea rows="2" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={nextDayPlan} onChange={(e) => setNextDayPlan(e.target.value)} placeholder="Planned activities for tomorrow..." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button 
        onClick={handleSubmit} 
        disabled={submitting || !workDescription.trim() || boqEntries.length === 0} 
        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-amber-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Daily Log for Approval
          </>
        )}
      </button>
      
      {!workDescription.trim() && (
        <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <p className="text-xs text-amber-700 font-medium">
            Please add a Work Description in the "Work" tab before submitting
          </p>
        </div>
      )}
      
      {workDescription.trim() && boqEntries.length === 0 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <p className="text-xs text-blue-700 font-medium">
            Please add at least one BOQ entry in the "BOQ Progress" tab before submitting
          </p>
        </div>
      )}
    </div>
  );
}

export default DailyLogForm;
