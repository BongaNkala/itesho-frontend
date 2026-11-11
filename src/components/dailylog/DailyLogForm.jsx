import { useState, useEffect } from "react";
import { 
  Sun, Cloud, CloudRain, Wind, Droplets, Thermometer, Users, Truck, 
  FileText, ClipboardList, AlertCircle, Plus, Trash2, Calendar, 
  Send, MapPin, Loader2, XCircle, Info, Unlock, Lock, CheckCircle, Clock, Image
} from "lucide-react";
import ComplianceGatekeeper from '../compliance/ComplianceGatekeeper';

const WEATHER_API_KEY = '886336475379f4ee302c0179d9be24ec';
const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

function DailyLogForm({ projectId }) {
  const [activeTab, setActiveTab] = useState('weather');
  const [loading, setLoading] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  
  const [workDescription, setWorkDescription] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  
  const [boqEntries, setBoqEntries] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [manpower, setManpower] = useState([]);
  const [equipment, setEquipment] = useState([]);
  
  // This state contains all the new fields
  const [formData, setFormData] = useState({
    toolbox_talk_topic: '',
    safety_talk_attendees: 0,
    near_miss_count: 0,
    first_aid_cases: 0,
    non_conformance_count: 0,
    rework_hours: 0,
    delay_duration_hours: 0,
    workers_idle: 0
  });

  const getToken = () => localStorage.getItem('access_token');

  const tabs = [
    { id: 'weather', label: 'Weather', icon: Sun, color: 'from-sky-500 to-blue-500' },
    { id: 'manpower', label: 'Manpower', icon: Users, color: 'from-emerald-500 to-teal-500' },
    { id: 'equipment', label: 'Equipment', icon: Truck, color: 'from-purple-500 to-indigo-500' },
    { id: 'boq', label: 'BOQ Progress', icon: FileText, color: 'from-amber-500 to-orange-500' },
    { id: 'work', label: 'Work', icon: ClipboardList, color: 'from-rose-500 to-pink-500' },
    { id: 'safety', label: 'Safety', icon: Lock, color: 'from-red-500 to-orange-500' },
    { id: 'quality', label: 'Quality', icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { id: 'delays', label: 'Delays', icon: Clock, color: 'from-yellow-500 to-amber-500' },
    { id: 'photos', label: 'Photos', icon: Image, color: 'from-blue-500 to-cyan-500' }
  ];

  if (showCompliance) {
    return (
      <ComplianceGatekeeper 
        projectId={projectId} 
        projectName="Project" 
        onAccessGranted={() => setShowCompliance(false)} 
        onCancel={() => setShowCompliance(false)} 
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500 rounded-lg">
            <Sun className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Daily Log Entry</h2>
            <p className="text-xs text-slate-400">Record site activities, manpower, and progress</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg` 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-slate-50 min-h-[300px]">
        {activeTab === 'safety' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-500" /> Safety & Compliance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Toolbox Talk Topic</label>
                <input type="text" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.toolbox_talk_topic} 
                  onChange={(e) => setFormData({...formData, toolbox_talk_topic: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Attendees</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.safety_talk_attendees} 
                  onChange={(e) => setFormData({...formData, safety_talk_attendees: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Near Misses</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.near_miss_count} 
                  onChange={(e) => setFormData({...formData, near_miss_count: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Aid Cases</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.first_aid_cases} 
                  onChange={(e) => setFormData({...formData, first_aid_cases: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Quality Control
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Non-Conformance Count</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.non_conformance_count} 
                  onChange={(e) => setFormData({...formData, non_conformance_count: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rework Hours</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.rework_hours} 
                  onChange={(e) => setFormData({...formData, rework_hours: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delays' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" /> Delays & Disruptions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Delay Duration (Hours)</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.delay_duration_hours} 
                  onChange={(e) => setFormData({...formData, delay_duration_hours: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Workers Idle</label>
                <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" 
                  value={formData.workers_idle} 
                  onChange={(e) => setFormData({...formData, workers_idle: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" /> Site Photos
            </h3>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500">Upload site photos here (coming soon)</p>
            </div>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {['weather', 'manpower', 'equipment', 'boq', 'work'].includes(activeTab) && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Fields for {activeTab} go here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyLogForm;
