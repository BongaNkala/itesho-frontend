import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ClipboardList, Printer, Mail, ChevronDown, ChevronUp, Shield } from 'lucide-react';

function ApprovalsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [userRole, setUserRole] = useState('');

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    // Get user role from token
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'contractor');
      } catch (e) {}
    }
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('${API_URL}/api/daily-logs/', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      // Only show submitted/pending logs for approval
      const pending = Array.isArray(data) ? data.filter(log => log.status === 'submitted') : [];
      const sorted = pending.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
      setSubmissions(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/daily-logs/${id}/approve/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (res.ok) {
        alert('Approved! BOQ updated.');
        fetchSubmissions();
      }
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/daily-logs/${id}/reject/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reviewNotes }),
      });
      if (res.ok) {
        alert('Rejected');
        setShowRejectModal(false);
        setReviewNotes('');
        fetchSubmissions();
      }
    } catch (err) {
      alert('Failed to reject');
    }
  };

  const handlePrint = (sub) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Daily Log Approval</title></head>
      <body style="font-family:Arial;padding:40px">
        <h1>Daily Site Log - Approval</h1>
        <p><strong>Date:</strong> ${new Date(sub.log_date).toLocaleDateString()}</p>
        <p><strong>Submitted by:</strong> ${sub.contractor_name || 'Unknown'}</p>
        <h3>Work Description</h3>
        <p>${sub.work_description}</p>
        ${sub.entries && sub.entries.length > 0 ? `
          <h3>BOQ Quantities</h3>
          <ul>${sub.entries.map(e => `<li>${e.boq_item_code}: ${e.quantity} units</li>`).join('')}</ul>
        ` : ''}
        <p>Generated on ${new Date().toLocaleString()}</p>
      </body>
    `);
    win.document.close();
    win.print();
  };

  const getStatusBadge = (status) => {
    if (status === 'submitted') return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded"><Clock className="h-4 w-4" /> Pending Review</span>;
    return <span className="flex items-center gap-1 text-gray-500"><Clock className="h-4 w-4" /> {status}</span>;
  };

  // Check if user has permission to approve
  const canApprove = userRole === 'pm' || userRole === 'inspector';

  if (!canApprove) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-500">You don't have permission to view this page.</p>
        <p className="text-sm text-gray-400 mt-2">Only Project Managers and Inspectors can access approvals.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center">Loading pending approvals...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-gray-500 text-sm">Review and approve contractor daily logs</p>
        </div>
        {submissions.length > 0 && (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            {submissions.length} Pending
          </div>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No pending approvals</p>
          <p className="text-sm text-gray-400 mt-1">All daily logs have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-white rounded-lg shadow">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{new Date(sub.log_date).toLocaleDateString()}</span>
                      {getStatusBadge(sub.status)}
                      <span className="text-xs text-gray-400">by {sub.contractor_name}</span>
                    </div>
                    <p className="text-gray-700">{sub.work_description?.substring(0, 100)}</p>
                    {sub.entries && sub.entries.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">📦 {sub.entries.length} BOQ item(s)</p>
                    )}
                  </div>
                  <div>{expandedId === sub.id ? '▲' : '▼'}</div>
                </div>
              </div>
              
              {expandedId === sub.id && (
                <div className="border-t p-4 bg-gray-50">
                  <p className="mb-3"><strong>Full Description:</strong> {sub.work_description}</p>
                  {sub.entries && sub.entries.length > 0 && (
                    <div className="mb-3">
                      <strong>BOQ Quantities Submitted:</strong>
                      <ul className="mt-1">
                        {sub.entries.map((e, i) => (
                          <li key={i}>• {e.boq_item_code}: {e.quantity} units</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={() => handlePrint(sub)} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">🖨️ Print</button>
                    <button onClick={() => handleApprove(sub.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">✅ Approve</button>
                    <button onClick={() => { setSelectedItem(sub); setShowRejectModal(true); }} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">❌ Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRejectModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Reject Daily Log</h3>
            <textarea className="w-full p-2 border rounded mb-4" rows="3" placeholder="Reason for rejection..." value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={() => handleReject(selectedItem.id)} className="px-4 py-2 bg-red-500 text-white rounded">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalsPage;
