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
  const [location, setLocation] = useState('Sandton, ZA');
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
    { id: 'weather', label: 'Weather', icon: Sun },
    { id: 'manpower', label: 'Manpower', icon: Users },
    { id: 'equipment', label: 'Equipment', icon: Truck },
    { id: 'boq', label: 'BOQ Progress', icon: FileText },
    { id: 'work', label: 'Work', icon: ClipboardList },
    { id: 'safety', label: 'Safety', icon: Lock },
    { id: 'quality', label: 'Quality', icon: CheckCircle },
    { id: 'delays', label: 'Delays', icon: Clock },
    { id: 'photos', label: 'Photos', icon: Image }
  ];

  if (showCompliance && checkingCompliance) {
    return <div className="p-8 text-center text-gray-500">Checking compliance...</div>;
  }
  if (showCompliance) {
    return <ComplianceGatekeeper projectId={projectId} projectName={complianceProjectName} onAccessGranted={() => setShowCompliance(false)} onCancel={() => setShowCompliance(false)} returnPath="daily-log" />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {success && <div className="bg-green-50 text-green-700 p-3 mb-4 rounded-lg">{success}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 mb-4 rounded-lg">{error}</div>}
      
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'weather' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-600">Condition</label><input disabled value={weather.condition} className="w-full p-2 bg-gray-50 border rounded mt-1" /></div>
            <div><label className="text-xs font-medium text-gray-600">Temp</label><input disabled value={weather.temperature} className="w-full p-2 bg-gray-50 border rounded mt-1" /></div>
            <div><label className="text-xs font-medium text-gray-600">Humidity</label><input disabled value={weather.humidity} className="w-full p-2 bg-gray-50 border rounded mt-1" /></div>
            <div><label className="text-xs font-medium text-gray-600">Wind</label><input disabled value={weather.windSpeed} className="w-full p-2 bg-gray-50 border rounded mt-1" /></div>
          </div>
        </div>
      )}

      {activeTab === 'manpower' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Role" value={newManpower.role} onChange={e => setNewManpower({...newManpower, role: e.target.value})} className="p-2 border rounded" />
            <input placeholder="Count" value={newManpower.count} onChange={e => setNewManpower({...newManpower, count: e.target.value})} className="p-2 border rounded" />
            <input placeholder="Hours" value={newManpower.hoursWorked} onChange={e => setNewManpower({...newManpower, hoursWorked: e.target.value})} className="p-2 border rounded" />
          </div>
          <button onClick={addManpower} className="w-full bg-emerald-50 text-emerald-700 py-2 rounded">Add Manpower</button>
          {manpower.map((m, i) => <div key={i} className="p-2 bg-gray-50 rounded flex justify-between"><span>{m.role} ({m.count})</span><button onClick={() => removeManpower(i)}><Trash2 className="h-4 w-4 text-red-500" /></button></div>)}
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Name" value={newEquipment.name} onChange={e => setNewEquipment({...newEquipment, name: e.target.value})} className="p-2 border rounded" />
            <input placeholder="Hours Used" value={newEquipment.hoursUsed} onChange={e => setNewEquipment({...newEquipment, hoursUsed: e.target.value})} className="p-2 border rounded" />
          </div>
          <button onClick={addEquipment} className="w-full bg-purple-50 text-purple-700 py-2 rounded">Add Equipment</button>
          {equipment.map((eq, i) => <div key={i} className="p-2 bg-gray-50 rounded flex justify-between"><span>{eq.name} ({eq.hoursUsed}h)</span><button onClick={() => removeEquipment(i)}><Trash2 className="h-4 w-4 text-red-500" /></button></div>)}
        </div>
      )}

      {activeTab === 'boq' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <select value={newBoqEntry.boq_item_id} onChange={e => setNewBoqEntry({...newBoqEntry, boq_item_id: e.target.value})} className="p-2 border rounded">
              <option value="">Select Item</option>
              {boqItems.map(i => <option key={i.id} value={i.id}>{i.item_code}</option>)}
            </select>
            <input placeholder="Qty" value={newBoqEntry.quantity} onChange={e => setNewBoqEntry({...newBoqEntry, quantity: e.target.value})} className="p-2 border rounded" />
            <input placeholder="Notes" value={newBoqEntry.notes} onChange={e => setNewBoqEntry({...newBoqEntry, notes: e.target.value})} className="p-2 border rounded" />
          </div>
          <button onClick={addBoqEntry} className="w-full bg-amber-50 text-amber-700 py-2 rounded">Add BOQ Entry</button>
          {boqEntries.map((b, i) => <div key={i} className="p-2 bg-gray-50 rounded flex justify-between"><span>{b.item_code} ({b.quantity})</span><button onClick={() => removeBoqEntry(i)}><Trash2 className="h-4 w-4 text-red-500" /></button></div>)}
        </div>
      )}

      {activeTab === 'work' && (
        <div className="space-y-4">
          <textarea placeholder="Work Description *" value={workDescription} onChange={e => setWorkDescription(e.target.value)} className="w-full p-2 border rounded" rows="4" />
          <textarea placeholder="Safety Notes" value={safetyNotes} onChange={e => setSafetyNotes(e.target.value)} className="w-full p-2 border rounded" rows="2" />
        </div>
      )}

      {activeTab === 'safety' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs">Topic</label><input className="w-full p-2 border rounded" value={formData.toolbox_talk_topic} onChange={e => setFormData({...formData, toolbox_talk_topic: e.target.value})} /></div>
            <div><label className="text-xs">Attendees</label><input className="w-full p-2 border rounded" type="number" value={formData.safety_talk_attendees} onChange={e => setFormData({...formData, safety_talk_attendees: parseInt(e.target.value) || 0})} /></div>
          </div>
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs">Non-Conformance</label><input className="w-full p-2 border rounded" type="number" value={formData.non_conformance_count} onChange={e => setFormData({...formData, non_conformance_count: parseInt(e.target.value) || 0})} /></div>
            <div><label className="text-xs">Rework Hours</label><input className="w-full p-2 border rounded" type="number" value={formData.rework_hours} onChange={e => setFormData({...formData, rework_hours: parseFloat(e.target.value) || 0})} /></div>
          </div>
        </div>
      )}

      {activeTab === 'delays' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs">Delay (Hours)</label><input className="w-full p-2 border rounded" type="number" value={formData.delay_duration_hours} onChange={e => setFormData({...formData, delay_duration_hours: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="text-xs">Workers Idle</label><input className="w-full p-2 border rounded" type="number" value={formData.workers_idle} onChange={e => setFormData({...formData, workers_idle: parseInt(e.target.value) || 0})} /></div>
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-4">
          <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="w-full p-2 border rounded" />
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.url} alt={p.name} className="w-full h-20 object-cover rounded" />
                <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSubmit} disabled={submitting || !workDescription.trim() || boqEntries.length === 0} className="w-full mt-6 bg-orange-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
        {submitting ? 'Submitting...' : 'Submit Daily Log for Approval'}
      </button>
    </div>
  );
}

export default DailyLogForm;
