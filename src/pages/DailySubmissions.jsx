import { useState, useEffect } from 'react';

function DailySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/daily-logs/', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/daily-logs/${id}/approve/`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/daily-logs/${id}/reject/`, {
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
      <html><head><title>Daily Log</title></head>
      <body style="font-family:Arial;padding:40px">
        <h1>Daily Site Log</h1>
        <p><strong>Date:</strong> ${new Date(sub.log_date).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${sub.status}</p>
        <p><strong>Submitted by:</strong> ${sub.contractor_name || 'Unknown'}</p>
        ${sub.approved_by_name ? `<p><strong>Approved by:</strong> ${sub.approved_by_name}</p>` : ''}
        <h3>Work Description</h3>
        <p>${sub.work_description}</p>
        ${sub.entries && sub.entries.length > 0 ? `
          <h3>BOQ Quantities</h3>
          <table border="1" cellpadding="5">
            <tr><th>Item</th><th>Quantity</th><th>Notes</th></tr>
            ${sub.entries.map(e => `<tr><td>${e.boq_item_code}</td><td>${e.quantity}</td><td>${e.notes || ''}</td></tr>`).join('')}
          </table>
        ` : ''}
        <p><small>Generated on ${new Date().toLocaleString()}</small></p>
      </body>
    `);
    win.document.close();
    win.print();
  };

  const handleEmail = (sub) => {
    const subject = `Daily Log ${new Date(sub.log_date).toLocaleDateString()}`;
    const body = `Date: ${new Date(sub.log_date).toLocaleDateString()}\nStatus: ${sub.status}\nWork: ${sub.work_description}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getBadge = (status) => {
    if (status === 'approved') return <span className="text-green-600">✅ Approved</span>;
    if (status === 'submitted') return <span className="text-yellow-600">⏳ Pending</span>;
    if (status === 'rejected') return <span className="text-red-600">❌ Rejected</span>;
    return <span className="text-gray-500">📝 Draft</span>;
  };

  const pendingCount = submissions.filter(s => s.status === 'submitted').length;

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daily Submissions</h1>
        {pendingCount > 0 && <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded">{pendingCount} Pending</div>}
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">No submissions yet</div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-white rounded-lg shadow">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{new Date(sub.log_date).toLocaleDateString()}</span>
                      {getBadge(sub.status)}
                      <span className="text-xs text-gray-400">by {sub.contractor_name}</span>
                    </div>
                    <p className="text-gray-700">{sub.work_description?.substring(0, 100)}</p>
                  </div>
                  <div>{expandedId === sub.id ? '▲' : '▼'}</div>
                </div>
              </div>
              
              {expandedId === sub.id && (
                <div className="border-t p-4 bg-gray-50">
                  <p className="mb-3"><strong>Full Description:</strong> {sub.work_description}</p>
                  {sub.entries && sub.entries.length > 0 && (
                    <div className="mb-3">
                      <strong>BOQ Quantities:</strong>
                      <ul className="mt-1">
                        {sub.entries.map((e, i) => (
                          <li key={i}>• {e.boq_item_code}: {e.quantity} units</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={() => handlePrint(sub)} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">🖨️ Print</button>
                    <button onClick={() => handleEmail(sub)} className="px-3 py-1 bg-blue-100 rounded text-sm hover:bg-blue-200">📧 Email</button>
                    {sub.status === 'submitted' && (
                      <>
                        <button onClick={() => handleApprove(sub.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">✅ Approve</button>
                        <button onClick={() => { setSelectedItem(sub); setShowRejectModal(true); }} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">❌ Reject</button>
                      </>
                    )}
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

export default DailySubmissions;
