// src/components/dailylog/DailySiteLogs.jsx

import DailyLogForm from '../components/dailylog/DailyLogForm';
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

const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';
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
        <ComplianceGatekeeper 
          projectId={selectedProject} 
          projectName={selectedProjectName}
          onAccessGranted={() => setShowCompliance(false)} 
          onCancel={() => setShowCompliance(false)} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            Daily Site Logs
          </h1>
          <p className="text-sm text-gray-500">Record daily site activities, manpower, and progress</p>
        </div>
      </div>

      {selectedProjectId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <DailyLogForm projectId={selectedProjectId} />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Please select a project to fill out a daily log.</p>
          <button onClick={() => navigate('/projects')} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">Go to Projects</button>
        </div>
      )}
    </div>
  );
}
