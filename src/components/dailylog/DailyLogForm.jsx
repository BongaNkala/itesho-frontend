import { useState, useEffect } from "react";
import { 
  Lock, CheckCircle, Clock, Image, Sparkles, Sun, Cloud, CloudRain, 
  Wind, Droplets, Thermometer, Users, Truck, FileText, 
  ClipboardList, AlertCircle, Plus, Trash2, Calendar, 
  Send, MapPin, Loader2, XCircle, Info, Unlock, Shield
} from "lucide-react";
import ComplianceGatekeeper from '../compliance/ComplianceGatekeeper';

const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';
const WEATHER_API_KEY = '886336475379f4ee302c0179d9be24ec';

function DailyLogForm({ projectId, onSuccess }) {
  const [activeTab, setActiveTab] = useState('weather');
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [checkingCompliance, setCheckingCompliance] = useState(true);
  const [showCompliance, setShowCompliance] = useState(true);
  const [hasComplianceAccess, setHasComplianceAccess] = useState(false);
  const [complianceProjectName, setComplianceProjectName] = useState('');
  
  const [weather, setWeather] = useState({ condition: 'sunny', temperature: '', humidity: '', windSpeed: '', rainfall: '', notes: '' });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [location, setLocation] = useState('Randburg, ZA');
  
  const [manpower, setManpower] = useState([]);
  const [newManpower, setNewManpower] = useState({ role: '', count: '', hoursWorked: '' });
  
  const [equipment, setEquipment] = useState([]);
  const [newEquipment, setNewEquipment] = useState({ name: '', status: 'operational', hoursUsed: '', notes: '' });
  
  const [boqEntries, setBoqEntries] = useState([]);
  const [newBoqEntry, setNewBoqEntry] = useState({ boq_item_id: '', quantity: '', notes: '' });
  const [boqItems, setBoqItems] = useState([]);
  
  const [workDescription, setWorkDescription] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    toolbox_talk_topic: '', safety_talk_attendees: 0, near_miss_count: 0, first_aid_cases: 0,
    non_conformance_count: 0, rework_hours: 0, delay_duration_hours: 0, workers_idle: 0
  });

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (projectId) {
      checkComplianceAccess();
    }
  }, [projectId]);

  const checkComplianceAccess = async () => {
    setCheckingCompliance(true);
    const token = getToken();
    if (!token) {
      setCheckingCompliance(false);
      setHasComplianceAccess(true);
      setShowCompliance(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/compliance/check-access/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.has_access) {
        setHasComplianceAccess(true);
        setShowCompliance(false);
      } else {
        setHasComplianceAccess(false);
        setShowCompliance(true);
      }
    } catch (err) {
      setHasComplianceAccess(true);
      setShowCompliance(false);
    } finally {
      setCheckingCompliance(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { name: file.name, url: previewUrl, file: file }]);
    });
  };

  const removePhoto = (index) => setPhotos(prev => prev.filter((_, i) => i !== index));
  
  const addManpower = () => {
    if (newManpower.role && newManpower.count > 0) {
      setManpower([...manpower, { ...newManpower, count: parseFloat(newManpower.count), hoursWorked: parseFloat(newManpower.hoursWorked) || 8 }]);
      setNewManpower({ role: '', count: '', hoursWorked: '' });
    }
  };
  const removeManpower = (idx) => setManpower(manpower.filter((_, i) => i !== idx));
  
  const addEquipment = () => {
    if (newEquipment.name) {
      setEquipment([...equipment, { ...newEquipment, hoursUsed: parseFloat(newEquipment.hoursUsed) || 0 }]);
      setNewEquipment({ name: '', status: 'operational', hoursUsed: '', notes: '' });
    }
  };
  const removeEquipment = (idx) => setEquipment(equipment.filter((_, i) => i !== idx));
  
  const addBoqEntry = () => {
    if (newBoqEntry.boq_item_id && newBoqEntry.quantity > 0) {
      const item = boqItems.find(i => i.id === parseInt(newBoqEntry.boq_item_id));
      setBoqEntries([...boqEntries, { ...newBoqEntry, item_code: item?.item_code, quantity: parseFloat(newBoqEntry.quantity) }]);
      setNewBoqEntry({ boq_item_id: '', quantity: '', notes: '' });
    }
  };
  const removeBoqEntry = (idx) => setBoqEntries(boqEntries.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const token = getToken();
    try {
      const payload = {
        project: projectId, log_date: date, work_description: workDescription, status: 'submitted',
        photos: photos.map(p => p.url), safety_notes: safetyNotes, issues: issuesEncountered, next_day_plan: nextDayPlan,
        toolbox_talk_topic: formData.toolbox_talk_topic, safety_talk_attendees: formData.safety_talk_attendees,
        near_miss_count: formData.near_miss_count, first_aid_cases: formData.first_aid_cases,
        non_conformance_count: formData.non_conformance_count, rework_hours: formData.rework_hours,
        delay_duration_hours: formData.delay_duration_hours, workers_idle: formData.workers_idle
      };
      const res = await fetch(`${API_URL}/api/daily-logs/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to submit log');
      const logData = await res.json();
      for (const entry of boqEntries) {
        await fetch(`${API_URL}/api/daily-logs/${logData.id}/add_entry/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ boq_item: entry.boq_item_id, quantity: entry.quantity, notes: entry.notes })
        });
      }
      setSuccess('Daily log submitted!');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

    const tabs = [
    { id: 'weather', label: 'Weather', icon: Sun, color: 'from-sky-500 to-blue-500' }
  ];

  if (showCompliance && checkingCompliance) {
    return <div className="p-8 text-center text-gray-500">Checking compliance...</div>;
  }
  if (showCompliance) {
    return <ComplianceGatekeeper projectId={projectId} projectName={complianceProjectName} onAccessGranted={() => setShowCompliance(false)} onCancel={() => setShowCompliance(false)} returnPath="daily-log" />;
  }

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-xl overflow-hidden min-h-[600px] font-sans">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg shadow-lg">
              <Sun className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Daily Log Entry</h2>
              <p className="text-xs text-slate-400">Record site activities, manpower, and progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-green-400 text-xs font-medium">
            <CheckCircle className="h-3 w-3" /> Compliance OK
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-2 bg-slate-950 border-b border-slate-800">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-300 ${
              activeTab === tab.id 
                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg` 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className={`h-4 w-4 transition-all duration-300 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 group-hover:text-orange-500'}`} /> 
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 bg-slate-900">
        {success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 mb-6 rounded-lg text-sm">{success}</div>}
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 mb-6 rounded-lg text-sm">{error}</div>}

        {activeTab === 'weather' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sun className="h-4 w-4 text-sky-400" /> Weather Conditions <span className="text-xs font-normal text-slate-400">(auto-generated)</span>
              </h3>
              <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {location}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-400 mb-1 block">Log Date</label><input disabled value={date} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Condition</label><input disabled value={weather.condition} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Temp (°C)</label><input disabled value={weather.temperature} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Humidity (%)</label><input disabled value={weather.humidity} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Wind (km/h)</label><input disabled value={weather.windSpeed} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Rainfall (mm)</label><input disabled value={weather.rainfall} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300" /></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Submit Button */}
      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <button onClick={handleSubmit} disabled={submitting} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3.5 rounded-xl text-sm font-bold shadow-lg hover:from-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Submitting...' : 'Submit Daily Log'}
        </button>
      </div>
    </div>
  );
}
export default DailyLogForm;
