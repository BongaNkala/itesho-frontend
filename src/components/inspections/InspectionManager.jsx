import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Plus, Eye, Calendar, AlertTriangle } from 'lucide-react';

function InspectionManager({ projectId, boqItemId }) {
  const [inspectionPoints, setInspectionPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [monthlyView, setMonthlyView] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyInspections, setMonthlyInspections] = useState([]);
  
  const [recordData, setRecordData] = useState({
    result: 'pass',
    comments: '',
    measured_value: '',
    corrective_action_required: false,
    corrective_action_taken: ''
  });

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (boqItemId) {
      fetchInspectionPoints();
    }
  }, [boqItemId]);

  useEffect(() => {
    if (monthlyView && projectId) {
      fetchMonthlyInspections();
    }
  }, [selectedMonth, projectId]);

  const fetchInspectionPoints = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/inspection-points/?boq_item_id=${boqItemId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setInspectionPoints(data);
    } catch (err) {
      console.error('Failed to fetch inspection points:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyInspections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/monthly-inspections/?project_id=${projectId}&month=${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setMonthlyInspections(data);
    } catch (err) {
      console.error('Failed to fetch monthly inspections:', err);
    }
  };

  const submitInspection = async (pointId) => {
    try {
      const response = await fetch('${API_URL}/api/inspection-records/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_point: pointId,
          result: recordData.result,
          comments: recordData.comments,
          measured_value: recordData.measured_value,
          corrective_action_required: recordData.corrective_action_required,
          corrective_action_taken: recordData.corrective_action_taken
        }),
      });
      if (response.ok) {
        alert('Inspection recorded successfully!');
        setShowRecordForm(false);
        fetchInspectionPoints();
        fetchMonthlyInspections();
        setRecordData({ result: 'pass', comments: '', measured_value: '', corrective_action_required: false, corrective_action_taken: '' });
      } else {
        alert('Failed to submit inspection');
      }
    } catch (err) {
      console.error('Failed to submit inspection:', err);
      alert('Failed to submit inspection');
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'passed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Monthly View Component
  if (monthlyView) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Monthly Inspection Summary</h3>
          </div>
          <button 
            onClick={() => setMonthlyView(false)}
            className="text-sm text-orange-500 hover:text-orange-600"
          >
            View Detailed Inspections →
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          />
        </div>
        
        {monthlyInspections.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No inspections recorded for this month</p>
            <button 
              onClick={() => setMonthlyView(false)}
              className="mt-2 text-sm text-orange-500 hover:text-orange-600"
            >
              Record an inspection
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyInspections.map(insp => (
              <div key={insp.id} className="border rounded-lg p-3 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{insp.boq_item_description}</div>
                    <div className="text-sm text-gray-600">{insp.inspection_point_name}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(insp.inspection_date).toLocaleDateString()}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    insp.result === 'pass' ? 'bg-green-100 text-green-700' :
                    insp.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {insp.result.toUpperCase()}
                  </div>
                </div>
                {insp.comments && <p className="text-xs text-gray-500 mt-2">{insp.comments}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Detailed View
  if (loading) return <div className="text-center py-4">Loading inspection points...</div>;

  if (inspectionPoints.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">No inspection points defined for this BOQ item.</p>
        <button 
          onClick={() => setMonthlyView(true)}
          className="mt-2 text-sm text-orange-500 hover:text-orange-600"
        >
          ← Back to Monthly View
        </button>
      </div>
    );
  }

  const hasFailedInspections = inspectionPoints.some(p => p.status === 'failed');
  const hasPendingInspections = inspectionPoints.some(p => p.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => setMonthlyView(true)}
          className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          ← Monthly Summary
        </button>
        {hasFailedInspections && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed inspections - Work cannot proceed</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {inspectionPoints.map(point => (
          <div key={point.id} className={`border rounded-lg p-4 ${
            point.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-white'
          }`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(point.status)}
                  <span className="font-medium">{point.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(point.priority)}`}>
                    {point.priority}
                  </span>
                  {point.required_before_work && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Hold Point</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{point.description}</p>
                {point.acceptance_criteria && (
                  <p className="text-xs text-gray-500 mt-1">Acceptance: {point.acceptance_criteria}</p>
                )}
              </div>
              {point.status === 'pending' && (
                <button
                  onClick={() => { setSelectedPoint(point); setShowRecordForm(true); }}
                  className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
                >
                  Record Inspection
                </button>
              )}
              {point.status !== 'pending' && (
                <button
                  onClick={() => { setSelectedPoint(point); setShowRecordForm(true); }}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                >
                  View Record
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inspection Record Modal */}
      {showRecordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Record Inspection: {selectedPoint?.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Result</label>
                <select
                  className="w-full p-2 border rounded"
                  value={recordData.result}
                  onChange={(e) => setRecordData({...recordData, result: e.target.value})}
                >
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="partial">Partial Pass</option>
                  <option value="deferred">Deferred</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comments</label>
                <textarea
                  rows="3"
                  className="w-full p-2 border rounded"
                  value={recordData.comments}
                  onChange={(e) => setRecordData({...recordData, comments: e.target.value})}
                  placeholder="Enter inspection notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Measured Value</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="e.g., 28.5 MPa, 150mm"
                  value={recordData.measured_value}
                  onChange={(e) => setRecordData({...recordData, measured_value: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="corrective_action"
                  checked={recordData.corrective_action_required}
                  onChange={(e) => setRecordData({...recordData, corrective_action_required: e.target.checked})}
                />
                <label htmlFor="corrective_action" className="text-sm">Corrective Action Required</label>
              </div>
              {recordData.corrective_action_required && (
                <div>
                  <label className="block text-sm font-medium mb-1">Corrective Action Taken</label>
                  <textarea
                    rows="2"
                    className="w-full p-2 border rounded"
                    value={recordData.corrective_action_taken}
                    onChange={(e) => setRecordData({...recordData, corrective_action_taken: e.target.value})}
                    placeholder="Describe corrective action..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRecordForm(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={() => submitInspection(selectedPoint.id)} className="px-4 py-2 bg-orange-500 text-white rounded">Save Inspection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InspectionManager;
