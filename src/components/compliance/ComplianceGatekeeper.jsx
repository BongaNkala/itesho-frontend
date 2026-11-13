import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Upload, FileText, AlertTriangle, ArrowRight, RefreshCw, Lock, Unlock, Eye, Loader2, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

export default function ComplianceGatekeeper({ projectId, projectName, onAccessGranted, onCancel, returnPath }) {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });

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
      // 1. Check access
      const accessRes = await fetch(`${API_URL}/api/compliance/check-access/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accessData = await accessRes.json();
      setHasAccess(accessData.has_access || false);

      // 2. Fetch requirements
      const reqRes = await fetch(`${API_URL}/api/compliance/contractor-requirements/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reqData = await reqRes.json();
      
      const reqs = reqData.requirements || [];
      setRequirements(reqs);
      
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

  const handleSubmit = async (reqId, notes, docName, docUrl) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_URL}/api/compliance/submit-requirement/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement_id: reqId, notes, document_name: docName, document_url: docUrl })
      });
      if (res.ok) {
        fetchData(); // Refresh the list
      } else {
        alert('Failed to submit requirement');
      }
    } catch (err) {
      alert('Error submitting requirement');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /> Loading compliance...</div>;
  if (error) return <div className="p-8 text-center text-red-400 bg-red-500/10 rounded-xl"><AlertTriangle className="h-8 w-8 mx-auto mb-2" /> {error} <button onClick={fetchData} className="block mx-auto mt-4 text-sm text-white underline">Retry</button></div>;

  return (
    <div className="bg-slate-900 rounded-xl shadow-xl p-6 text-white border border-slate-800">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {hasAccess ? <Unlock className="h-6 w-6 text-green-400" /> : <Lock className="h-6 w-6 text-orange-400" />}
            Compliance Checklist
          </h2>
          <p className="text-sm text-slate-400 mt-1">Project: {projectName}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${hasAccess ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
          {hasAccess ? '✅ Access Granted' : '⛔ Access Locked'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="text-xs text-slate-400">Total</div><div className="text-2xl font-bold">{stats.total}</div></div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="text-xs text-slate-400">Approved</div><div className="text-2xl font-bold text-green-400">{stats.approved}</div></div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="text-xs text-slate-400">Pending</div><div className="text-2xl font-bold text-yellow-400">{stats.pending}</div></div>
      </div>

      {requirements.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-300">No compliance requirements for this project.</p>
          <button onClick={onAccessGranted} className="mt-4 px-6 py-2 bg-orange-500 rounded-lg font-medium hover:bg-orange-600 transition">Continue</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map(req => (
            <div key={req.id} className={`p-4 rounded-lg border ${req.status === 'approved' ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {req.title} 
                    {req.is_mandatory && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">MANDATORY</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{req.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${req.status === 'approved' ? 'text-green-400' : req.status === 'submitted' ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {req.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasAccess && (
        <button onClick={onAccessGranted} className="w-full mt-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 rounded-xl font-bold shadow-lg hover:from-orange-600 transition">
          Continue to Daily Log <ArrowRight className="h-4 w-4 inline" />
        </button>
      )}
    </div>
  );
}
