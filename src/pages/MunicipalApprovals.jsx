import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, Stamp, Award, AlertCircle } from 'lucide-react';

function MunicipalApprovals() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [sealNumber, setSealNumber] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState('');

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/daily-logs/', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const pending = Array.isArray(data) ? data.filter(log => log.status === 'pm_approved') : [];
      setSubmissions(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApproval = async (id, action) => {
    if (action === 'approve' && (!sealNumber || !reportNumber)) {
      alert('Seal number and report number are required for final approval');
      return;
    }
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/daily-logs/${id}/municipal-approve/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved: action === 'approve',
          seal_number: sealNumber,
          report_number: reportNumber,
          notes: inspectionNotes
        }),
      });
      if (res.ok) {
        alert(action === 'approve' ? 'Final approval granted! Digital seal applied. BOQ updated.' : 'Final approval denied.');
        setShowModal(false);
        setSealNumber('');
        setReportNumber('');
        setInspectionNotes('');
        fetchSubmissions();
      }
    } catch (err) {
      alert('Failed to submit final approval');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Municipal Inspector - Final Approval</h1>
        <p className="text-gray-500">Government sign-off with digital seal and report number</p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Stamp className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No pending municipal approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-white rounded-lg shadow">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{new Date(sub.log_date).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-400">Contractor: {sub.contractor_name}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">PM Approved</span>
                    </div>
                    <p className="text-gray-700">{sub.work_description?.substring(0, 80)}</p>
                  </div>
                  <div>{expandedId === sub.id ? '▲' : '▼'}</div>
                </div>
              </div>
              
              {expandedId === sub.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="mb-3">
                    <strong>Final Approval Required:</strong>
                    <ul className="mt-1 text-sm text-gray-600">
                      <li>✓ Engineer verified quantities</li>
                      <li>✓ Consultant verified rates</li>
                      <li>✓ PM approved for payment</li>
                      <li>⚠️ Awaiting municipal seal</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedItem(sub); setActionType('approve'); setShowModal(true); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"><Stamp className="h-4 w-4" /> Apply Seal & Approve</button>
                    <button onClick={() => { setSelectedItem(sub); setActionType('reject'); setShowModal(true); }} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">✗ Deny</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Stamp className="h-5 w-5" /> Municipal Final Approval</h3>
            <p className="text-sm text-gray-600 mb-3">Project: {selectedItem?.project_name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Seal Number *</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., MUN-2024-00456" value={sealNumber} onChange={e => setSealNumber(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Report Number *</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., INSP-2024-0089" value={reportNumber} onChange={e => setReportNumber(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Inspection Notes</label>
                <textarea className="w-full p-2 border rounded" rows="3" placeholder="Site inspection findings, compliance notes..." value={inspectionNotes} onChange={e => setInspectionNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={() => handleFinalApproval(selectedItem.id, actionType)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Confirm Final Approval</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MunicipalApprovals;