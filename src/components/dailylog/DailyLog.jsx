const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';
import { useState, useEffect } from 'react';
import ComplianceGatekeeper from '../components/compliance/ComplianceGatekeeper';

function DailyLogForm({ projectId, onSuccess }) {
  const [boqItems, setBoqItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [showCompliance, setShowCompliance] = useState(true); // Start with compliance check
  const [projectName, setProjectName] = useState('');
  const [compliancePassed, setCompliancePassed] = useState(false);
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

  // Fetch project name on mount
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/projects/${projectId}/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setProjectName(data.name || 'Project');
      } catch (err) {
        console.error('Failed to fetch project:', err);
        setProjectName('Project');
      } finally {
        setCheckingCompliance(false);
      }
    };
    fetchProject();
  }, [projectId]);

  // Only fetch BOQ items after compliance is passed
  useEffect(() => {
    if (compliancePassed) {
      fetchBOQItems();
    }
  }, [compliancePassed]);

  const fetchBOQItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/boq/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
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
    }
  };

  const removeBoqEntry = (index) => {
    setBoqEntries(boqEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    if (!workDescription.trim()) {
      setError('Please enter a work description in the "Work" tab before submitting.');
      setActiveTab('work');
      setSubmitting(false);
      return;
    }
    
    try {
      const token = getToken();
      
      const logPayload = {
        project: parseInt(projectId),
        log_date: date,
        work_description: workDescription,
        weather: weather.condition,
        temperature: weather.temperature ? parseFloat(weather.temperature) : null,
        status: 'submitted'
      };
      
      console.log('Submitting payload:', logPayload);
      
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
      
      if (!logResponse.ok) {
        let errorMsg = `Server returned ${logResponse.status}: `;
        try {
          const errorData = JSON.parse(logResponseText);
          errorMsg += JSON.stringify(errorData);
        } catch(e) {
          errorMsg += logResponseText;
        }
        throw new Error(errorMsg);
      }
      
      const log = JSON.parse(logResponseText);
      console.log('Log created successfully:', log);
      
      for (const entry of boqEntries) {
        const entryPayload = {
          boq_item: entry.boq_item_id,
          quantity: entry.quantity,
          notes: entry.notes
        };
        
        const entryResponse = await fetch(`${API_URL}/api/daily-logs/${log.id}/add_entry/`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(entryPayload),
        });
        
        if (!entryResponse.ok) {
          const errorText = await entryResponse.text();
          throw new Error(`Failed to add entry: ${entryResponse.status} - ${errorText}`);
        }
      }
      
      alert('Daily log submitted successfully!');
      onSuccess && onSuccess();
      
      // Reset form
      setManpower([]);
      setEquipment([]);
      setBoqEntries([]);
      setWorkDescription('');
      setSafetyNotes('');
      setIssuesEncountered('');
      setNextDayPlan('');
      setDate(new Date().toISOString().split('T')[0]);
      setWeather({
        condition: 'sunny',
        temperature: '',
        humidity: '',
        windSpeed: '',
        rainfall: '',
        notes: '',
      });
      
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
    { id: 'weather', label: 'Weather' },
    { id: 'manpower', label: 'Manpower' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'boq', label: 'BOQ Progress' },
    { id: 'work', label: 'Work' }
  ];

  const handleNumberChange = (setter, field, value) => {
    if (value === '') {
      setter(prev => ({ ...prev, [field]: '' }));
    } else if (!isNaN(parseFloat(value))) {
      setter(prev => ({ ...prev, [field]: value }));
    }
  };

  // Show loading while checking compliance
  if (checkingCompliance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-3 text-gray-500">Checking compliance...</p>
      </div>
    );
  }

  // Show Compliance Gatekeeper if compliance check is required
  if (showCompliance && !compliancePassed) {
    return (
      <div className="relative min-h-[500px]">
        <button
          onClick={() => {
            // If user cancels, go back or close
            window.history.back();
          }}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-300"
        >
          ← Back
        </button>
        <ComplianceGatekeeper
          projectId={projectId}
          projectName={projectName}
          returnPath="daily-log"
          onAccessGranted={() => {
            console.log('✅ Compliance granted for Daily Log!');
            setCompliancePassed(true);
            setShowCompliance(false);
          }}
          onCancel={() => {
            console.log('❌ Compliance check cancelled');
            window.history.back();
          }}
        />
      </div>
    );
  }

  // Main form - only shown after compliance is passed
  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
          <span className="h-4 w-4 text-white">✨</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Daily Log Entry</h2>
          <p className="text-xs text-gray-400 mt-0.5">Record site activities, manpower, and progress</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Submission Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-all duration-300 rounded-t-xl ${
              activeTab === tab.id 
                ? 'bg-orange-500 text-white shadow-lg' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Weather Tab */}
      {activeTab === 'weather' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Weather Conditions</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Log Date</label>
                <input type="date" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Condition</label>
                <select className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={weather.condition} onChange={(e) => setWeather({ ...weather, condition: e.target.value })}>
                  <option value="sunny">Sunny</option>
                  <option value="cloudy">Cloudy</option>
                  <option value="rainy">Rainy</option>
                  <option value="stormy">Stormy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Temperature (°C)</label>
                <input type="text" inputMode="numeric" placeholder="e.g., 25" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={weather.temperature} onChange={(e) => handleNumberChange(setWeather, 'temperature', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Humidity (%)</label>
                <input type="text" inputMode="numeric" placeholder="e.g., 60" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={weather.humidity} onChange={(e) => handleNumberChange(setWeather, 'humidity', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Wind Speed (km/h)</label>
                <input type="text" inputMode="numeric" placeholder="e.g., 10" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={weather.windSpeed} onChange={(e) => handleNumberChange(setWeather, 'windSpeed', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Rainfall (mm)</label>
                <input type="text" inputMode="numeric" placeholder="e.g., 0" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" value={weather.rainfall} onChange={(e) => handleNumberChange(setWeather, 'rainfall', e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Additional Notes</label>
              <textarea className="w-full p-2.5 text-sm border border-gray-200 rounded-lg" rows="2" value={weather.notes} onChange={(e) => setWeather({ ...weather, notes: e.target.value })} placeholder="Any weather-related observations..." />
            </div>
          </div>
        </div>
      )}

      {/* Manpower Tab */}
      {activeTab === 'manpower' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Manpower Summary ({totalManpower} workers, {totalManHours} man-hours)</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input type="text" placeholder="Role (e.g., Labourer)" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newManpower.role} onChange={(e) => setNewManpower({ ...newManpower, role: e.target.value })} />
              <input type="text" inputMode="numeric" placeholder="Count" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newManpower.count} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d+$/.test(val)) setNewManpower({ ...newManpower, count: val }); }} />
              <input type="text" inputMode="numeric" placeholder="Hours Worked" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newManpower.hoursWorked} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setNewManpower({ ...newManpower, hoursWorked: val }); }} />
            </div>
            <button onClick={addManpower} className="w-full text-sm bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors mb-4">
              + Add Manpower
            </button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {manpower.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
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
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Equipment Usage ({operationalEquipment}/{equipment.length} operational)</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="text" placeholder="Equipment Name" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.name} onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })} />
              <select className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.status} onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value })}>
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="idle">Idle</option>
              </select>
              <input type="text" inputMode="numeric" placeholder="Hours Used" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.hoursUsed} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setNewEquipment({ ...newEquipment, hoursUsed: val }); }} />
              <input type="text" placeholder="Notes" className="p-2.5 text-sm border border-gray-200 rounded-lg" value={newEquipment.notes} onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })} />
            </div>
            <button onClick={addEquipment} className="w-full text-sm bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors mb-4">
              + Add Equipment
            </button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {equipment.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
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
                      ✕
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
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">BOQ Progress Entries</h3>
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
            <button onClick={addBoqEntry} className="w-full text-sm bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors mb-4">
              + Add BOQ Entry
            </button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {boqEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
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
                      ✕
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
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Work Details & Notes</h3>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Description <span className="text-red-500">*</span>
                </label>
                <textarea rows="4" className="w-full p-3 text-sm border border-gray-200 rounded-lg" value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} placeholder="Describe the work completed today in detail..." />
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
        disabled={submitting || !workDescription.trim()} 
        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-amber-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        {submitting ? 'Submitting...' : 'Submit Daily Log for Approval'}
      </button>
      
      {!workDescription.trim() && (
        <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-700 font-medium">
            Please add a Work Description in the "Work" tab before submitting
          </p>
        </div>
      )}
    </div>
  );
}

export default DailyLogForm;
