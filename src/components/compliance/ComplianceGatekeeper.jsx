import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Upload, FileText, AlertTriangle, ArrowRight, Lock, Unlock, Loader2, MapPin, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

export default function ComplianceGatekeeper({ projectId, projectName, onAccessGranted, onCancel, returnPath }) {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  
  // Upload Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ notes: '', document_name: '' });

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Please login again');
      setLoading(false);
      return;
    }

    try {
      const accessRes = await fetch(`${API_URL}/api/compliance/check-access/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accessData = await accessRes.json();
      
      const reqRes = await fetch(`${API_URL}/api/compliance/contractor-requirements/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reqData = await reqRes.json();
      
      const reqs = reqData.requirements || [];
      setRequirements(reqs);
      
      const hasMissingMandatory = reqs.some(r => r.is_mandatory && r.status !== 'approved');
      
      if (accessData.has_access && !hasMissingMandatory) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
      
      setStats({
        total: reqData.total_count || 0,
        approved: reqData.approved_count || 0,
        pending: reqData.pending_count || 0
      });
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, document_name: file.name }));
    }
  };

  const handleSubmitRequirement = async (e) => {
    e.preventDefault();
    setUploading(true);
    const token = localStorage.getItem('access_token');
    
    try {
      const res = await fetch(`${API_URL}/api/compliance/submit-requirement/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement_id: selectedReq.id,
          notes: formData.notes,
          document_name: formData.document_name,
          document_url: 'https://example.com/dummy-doc.pdf' // Dummy URL for now
        })
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchData(); // Refresh the list to show "Submitted"
      } else {
        alert('Failed to submit requirement');
      }
    } catch (err) {
      alert('Error submitting requirement');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /> Loading compliance...</div>;
  if (error) return <div className="p-8 text-center text-red-400 bg-red-500/10 rounded-xl"><AlertTriangle className="h-8 w-8 mx-auto mb-2" /> {error} <button onClick={fetchData} className="block mx-auto mt-4 text-sm text-white underline">Retry</button></div>;

  return (
    <div className="bg-slate-900 rounded-xl shadow-xl p-6 text-white border border-slate-800">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {hasAccess ? <Unlock className="h-6 w-6 text-green-400" /> : <Lock className="h-6 w-6 text-red-500" />}
            Compliance Gatekeeper
          </h2>
          <p className="text-sm text-slate-400 mt-1">Project: {projectName}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${hasAccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {hasAccess ? '✅ Access Granted' : '⛔ Access Denied'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="text-xs text-slate-400">Total Required</div><div className="text-2xl font-bold">{stats.total}</div></div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="text-xs text-slate-400">Approved</div><div className="text-2xl font-bold text-green-400">{stats.approved}</div></div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="text-xs text-slate-400">Missing / Pending</div><div className="text-2xl font-bold text-red-400">{stats.total - stats.approved}</div></div>
      </div>

      <div className="space-y-3">
        {requirements.map(req => (
          <div key={req.id} className={`p-4 rounded-lg border ${req.status === 'approved' ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {req.title} 
                  {req.is_mandatory && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">MANDATORY</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1">{req.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded font-medium ${req.status === 'approved' ? 'text-green-400' : req.status === 'submitted' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {req.status.toUpperCase()}
                </span>
                {(req.status === 'pending' || req.status === 'rejected') && (
                  <button 
                    onClick={() => { setSelectedReq(req); setShowModal(true); }}
                    className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    <Upload className="h-3 w-3" /> Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasAccess ? (
        <button onClick={onAccessGranted} className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:from-green-600 transition">
          Continue to Daily Log <ArrowRight className="h-4 w-4 inline" />
        </button>
      ) : (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
          <p className="text-sm text-red-400 font-medium">Access Blocked</p>
          <p className="text-xs text-red-300 mt-1">Please upload all mandatory documents and wait for PM approval to continue.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && selectedReq && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Upload: {selectedReq.title}</h3>
            <form onSubmit={handleSubmitRequirement} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select File</label>
                <input type="file" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white" rows="3" placeholder="Add any notes about this document..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
                <button type="submit" disabled={uploading || !formData.document_name} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
