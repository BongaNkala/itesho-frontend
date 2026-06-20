import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, DollarSign, AlertCircle } from 'lucide-react';

// API Configuration
const API_URL = 'http://127.0.0.1:8000';

function ConsultantApprovals() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [rateNotes, setRateNotes] = useState('');
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
      const res = await fetch(`${API_URL}/api/daily-logs/`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const pending = Array.isArray(data) ? data.filter(log => log.status === 'engineer_approved') : [];
      setSubmissions(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateCheck = async (id, action) => {
    try {
      const res = await fetch(`${API_URL}/api/daily-logs/${id}/rate-check/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved: action === 'approve',
          notes: rateNotes,
          role: 'consultant'
        }),
      });
      if (res.ok) {
        alert(action === 'approve' ? 'Rates verified! Moving to PM approval.' : 'Rejected - contractor notified.');
        setShowModal(false);
        setRateNotes('');
        fetchSubmissions();
      }
    } catch (err) {
      alert('Failed to submit rate verification');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quantity Surveyor - Rate Verification</h1>
        <p className="text-gray-500">Verify that rates charged match the contract agreement</p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No pending rate verifications</p>
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
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Engineer Approved</span>
                    </div>
                    <p className="text-gray-700">{sub.work_description?.substring(0, 80)}</p>
                  </div>
                  <div>{expandedId === sub.id ? '▲' : '▼'}</div>
                </div>
              </div>
              
              {expandedId === sub.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="mb-3">
                    <strong>BOQ Items with Rates:</strong>
                    <ul className="mt-1">
                      {sub.entries?.map((e, i) => (
                        <li key={i}>• {e.boq_item_code}: {e.quantity} units @ R{e.boq_item_rate || '0'} each</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedItem(sub); setActionType('approve'); setShowModal(true); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">✓ Verify Rates</button>
                    <button onClick={() => { setSelectedItem(sub); setActionType('reject'); setShowModal(true); }} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">✗ Reject</button>
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
            <h3 className="text-lg font-bold mb-4">{actionType === 'approve' ? 'Rate Verification' : 'Reject Submission'}</h3>
            <textarea className="w-full p-2 border rounded mb-4" rows="3" placeholder={actionType === 'approve' ? "Rate verification notes (contract reference, market rate check, etc.)..." : "Reason for rejection..."} value={rateNotes} onChange={e => setRateNotes(e.target.value)} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={() => handleRateCheck(selectedItem.id, actionType)} className={`px-4 py-2 rounded text-white ${actionType === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConsultantApprovals;