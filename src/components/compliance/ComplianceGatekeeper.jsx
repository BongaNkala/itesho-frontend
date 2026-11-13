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
      
      // 2. Fetch requirements
      const reqRes = await fetch(`${API_URL}/api/compliance/contractor-requirements/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reqData = await reqRes.json();
      
      const reqs = reqData.requirements || [];
      setRequirements(reqs);
      
      // STRICT CHECK: Do not grant access if any mandatory requirement is not approved
      const hasMissingMandatory = reqs.some(r => r.is_mandatory && r.status !== 'approved');
      
      // If backend says has_access is true BUT there are missing mandatory docs, block it.
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
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {req.title} 
                  {req.is_mandatory && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">MANDATORY</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1">{req.description}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${req.status === 'approved' ? 'text-green-400' : req.status === 'submitted' ? 'text-yellow-400' : 'text-red-400'}`}>
                {req.status.toUpperCase()}
              </span>
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
          <p className="text-xs text-red-300 mt-1">You must upload all mandatory documents and have them approved by the PM before accessing this project.</p>
        </div>
      )}
    </div>
  );
}
