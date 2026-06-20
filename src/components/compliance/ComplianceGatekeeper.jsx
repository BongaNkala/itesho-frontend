// src/components/compliance/ComplianceGatekeeper.jsx

import { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Upload, 
  FileText,
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Eye, 
  Loader2,
  Calendar,
  AlertCircle,
  FileCheck,
  ListChecks
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

// Helper functions
const differenceInDays = (date1, date2) => {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

function ComplianceGatekeeper({ projectId, projectName, onAccessGranted, onCancel, returnPath }) {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    all_met: false,
    total_count: 0,
    approved_count: 0,
    pending_count: 0,
    rejected_count: 0,
    expired_count: 0,
    expiring_soon_count: 0
  });
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [formData, setFormData] = useState({
    notes: '',
    document_url: '',
    document_name: ''
  });
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (projectId) {
      checkAccessAndFetch();
    }
  }, [projectId]);

  const checkAccessAndFetch = async () => {
    setLoading(true);
    setError(null);
    const token = getToken();
    
    console.log('=== Compliance Gatekeeper Debug ===');
    console.log('Project ID:', projectId);
    console.log('Token exists:', !!token);
    
    if (!token) {
      setError('Please login again');
      setLoading(false);
      return;
    }

    try {
      // Check access
      console.log('Checking access for project:', projectId);
      const accessResponse = await fetch(
        `${API_URL}/api/compliance/check-access/?project_id=${projectId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const accessData = await accessResponse.json();
      console.log('Access check response:', accessData);

      // Always set hasAccess regardless of status
      setHasAccess(accessData.has_access || false);

      // Always fetch requirements to show the checklist
      console.log('Fetching requirements...');
      const response = await fetch(
        `${API_URL}/api/compliance/contractor-requirements/?project_id=${projectId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      console.log('Requirements response status:', response.status);
      
      if (response.status === 404) {
        setError('Compliance endpoint not found. Please check if the backend is running.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Requirements data:', data);

      if (!response.ok) {
        setError(data.error || 'Failed to load compliance requirements.');
        setLoading(false);
        return;
      }

      // Calculate expiry stats
      const now = new Date();
      const requirementsWithExpiry = (data.requirements || []).map(req => {
        let daysUntilExpiry = null;
        let isExpired = false;
        let isExpiringSoon = false;

        if (req.expiry_date) {
          const expiryDate = new Date(req.expiry_date);
          daysUntilExpiry = differenceInDays(expiryDate, now);
          isExpired = daysUntilExpiry < 0;
          isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        }

        return {
          ...req,
          daysUntilExpiry,
          isExpired,
          isExpiringSoon,
          expiryDate: req.expiry_date ? new Date(req.expiry_date) : null
        };
      });

      setRequirements(requirementsWithExpiry);
      
      const expiredCount = requirementsWithExpiry.filter(r => r.isExpired).length;
      const expiringSoonCount = requirementsWithExpiry.filter(r => r.isExpiringSoon).length;
      
      setStats({
        all_met: data.all_met || false,
        total_count: data.total_count || 0,
        approved_count: data.approved_count || 0,
        pending_count: data.pending_count || 0,
        rejected_count: data.rejected_count || 0,
        expired_count: expiredCount,
        expiring_soon_count: expiringSoonCount
      });

    } catch (error) {
      console.error('Failed to fetch requirements:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequirement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    const token = getToken();
    try {
      console.log('Submitting requirement:', selectedRequirement.id);
      
      const response = await fetch(`${API_URL}/api/compliance/submit-requirement/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirement_id: selectedRequirement.id,
          notes: formData.notes,
          document_url: formData.document_url,
          document_name: formData.document_name
        })
      });
      
      const data = await response.json();
      console.log('Submit response:', data);
      
      if (response.ok) {
        setShowSubmitModal(false);
        setSelectedRequirement(null);
        setFormData({ notes: '', document_url: '', document_name: '' });
        await checkAccessAndFetch();
        
        if (data.all_approved && onAccessGranted) {
          onAccessGranted();
        }
      } else {
        setError(data.error || 'Failed to submit requirement');
      }
    } catch (error) {
      console.error('Failed to submit:', error);
      setError('Error submitting requirement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      approved: { 
        bg: 'bg-green-500/20 text-green-400 border-green-500/30', 
        icon: CheckCircle, 
        label: 'Approved' 
      },
      submitted: { 
        bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
        icon: Clock, 
        label: 'Submitted' 
      },
      pending: { 
        bg: 'bg-gray-500/20 text-gray-400 border-gray-500/30', 
        icon: Clock, 
        label: 'Pending' 
      },
      rejected: { 
        bg: 'bg-red-500/20 text-red-400 border-red-500/30', 
        icon: XCircle, 
        label: 'Rejected' 
      },
      expired: { 
        bg: 'bg-red-500/20 text-red-400 border-red-500/30', 
        icon: AlertTriangle, 
        label: 'Expired' 
      },
    };
    const cfg = config[status] || config.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text}`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </span>
    );
  };

  const getDaysUntilExpiryDisplay = (days) => {
    if (days === null || days === undefined) return null;
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today';
    return `${days} days remaining`;
  };

  const getExpiryColor = (days) => {
    if (days === null || days === undefined) return 'text-gray-400';
    if (days < 0) return 'text-red-400';
    if (days <= 7) return 'text-red-300';
    if (days <= 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
        <p className="mt-4 text-white/70">Loading compliance requirements...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] max-w-md mx-auto text-center">
        <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error</h2>
        <p className="text-white/70">{error}</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={checkAccessAndFetch}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <button
            onClick={() => onCancel && onCancel()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No requirements
  if (requirements.length === 0) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <Shield className="h-16 w-16 mx-auto text-green-400 mb-4" />
        <h2 className="text-2xl font-bold text-white">All Clear!</h2>
        <p className="text-white/70 mt-2">No compliance requirements for this project.</p>
        <button
          onClick={() => onAccessGranted && onAccessGranted()}
          className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 mx-auto"
        >
          {returnPath === 'daily-log' ? 'Access Daily Log' : 'Continue to Project'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Main render - Always show Compliance Checklist
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Access Status */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border ${
          hasAccess ? 'bg-green-500/20 border-green-500/30' : 'bg-orange-500/20 border-orange-500/30'
        }`}>
          {hasAccess ? (
            <Unlock className="h-8 w-8 text-green-400" />
          ) : (
            <Lock className="h-8 w-8 text-orange-400" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">Compliance Checklist</h1>
        <p className="text-white/70 mt-1">
          {hasAccess 
            ? `You have access to ${projectName}` 
            : `Complete all requirements to access ${projectName}`
          }
        </p>
        {hasAccess && (
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full text-xs text-green-300 border border-green-500/30">
            <CheckCircle className="h-3 w-3" />
            Access Granted
          </div>
        )}
        {returnPath === 'daily-log' && (
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 rounded-full text-xs text-blue-300 border border-blue-500/30">
            <FileText className="h-3 w-3" />
            Required to access Daily Log
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <p className="text-sm text-white/60">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total_count}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <p className="text-sm text-white/60">Approved</p>
          <p className="text-2xl font-bold text-green-400">{stats.approved_count}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <p className="text-sm text-white/60">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending_count}</p>
        </div>
        <div className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border ${hasAccess ? 'border-green-500/50' : 'border-orange-500/50'}`}>
          <p className="text-sm text-white/60">Access</p>
          <p className={`text-2xl font-bold ${hasAccess ? 'text-green-400' : 'text-orange-400'}`}>
            {hasAccess ? '✅ Granted' : '⛔ Locked'}
          </p>
        </div>
      </div>

      {/* Expiry Alerts */}
      {(stats.expired_count > 0 || stats.expiring_soon_count > 0) && (
        <div className="mb-6 space-y-2">
          {stats.expired_count > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">
                <span className="font-bold">{stats.expired_count}</span> requirement(s) have expired. Please renew them.
              </p>
            </div>
          )}
          {stats.expiring_soon_count > 0 && (
            <div className="flex items-center gap-3 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
              <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-300">
                <span className="font-bold">{stats.expiring_soon_count}</span> requirement(s) are expiring soon (within 30 days).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Requirements Checklist */}
      <div className="space-y-3">
        {requirements.map((req) => {
          const isExpired = req.isExpired;
          const isExpiringSoon = req.isExpiringSoon;
          
          return (
            <div 
              key={req.id} 
              className={`bg-white/10 backdrop-blur-md rounded-xl border p-4 transition-all ${
                req.status === 'approved' ? 'border-green-500/30 bg-green-500/10' : 
                req.status === 'rejected' ? 'border-red-500/30 bg-red-500/10' :
                isExpired ? 'border-red-500/30 bg-red-500/10' :
                isExpiringSoon ? 'border-yellow-500/30 bg-yellow-500/10' :
                'border-white/20 hover:border-white/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{req.title}</h3>
                    {req.is_mandatory && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/30 text-red-300 rounded-full">MANDATORY</span>
                    )}
                    {isExpired && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/30 text-red-300 rounded-full">EXPIRED</span>
                    )}
                    {isExpiringSoon && !isExpired && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-500/30 text-yellow-300 rounded-full">EXPIRING SOON</span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 mt-1">{req.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                    <span>Type: {req.requirement_type.replace('_', ' ')}</span>
                    {req.requires_upload && <span>📎 Upload required</span>}
                    {req.requires_approval && <span>✓ Approval required</span>}
                  </div>
                  
                  {/* Expiry Information */}
                  {req.expiryDate && (
                    <div className={`flex items-center gap-2 mt-2 text-xs ${getExpiryColor(req.daysUntilExpiry)}`}>
                      <Calendar className="h-3 w-3" />
                      <span>
                        {req.daysUntilExpiry !== null && req.daysUntilExpiry < 0 ? '⚠️ ' : ''}
                        Expires: {formatDate(req.expiryDate)}
                        {req.daysUntilExpiry !== null && (
                          <span className="ml-1 font-medium">
                            ({getDaysUntilExpiryDisplay(req.daysUntilExpiry)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
                  {getStatusBadge(req.status)}
                  {req.can_submit && (
                    <button
                      onClick={() => {
                        setSelectedRequirement(req);
                        setShowSubmitModal(true);
                      }}
                      className="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                      Submit
                    </button>
                  )}
                  {req.status === 'submitted' && (
                    <span className="text-[10px] text-yellow-400">Awaiting approval</span>
                  )}
                  {req.document_url && (
                    <button 
                      onClick={() => window.open(req.document_url, '_blank')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {!hasAccess && (
        <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-orange-300 font-medium">Requirements not yet met</p>
              <p className="text-xs text-orange-300/70">Complete all mandatory requirements to access this project.</p>
            </div>
            <button
              onClick={checkAccessAndFetch}
              className="ml-auto px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>
      )}

      {hasAccess && (
        <div className="mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Unlock className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-300 font-medium">All requirements met!</p>
              <p className="text-xs text-green-300/70">You can now access this project.</p>
            </div>
            <button
              onClick={() => onAccessGranted && onAccessGranted()}
              className="ml-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
            >
              {returnPath === 'daily-log' ? 'Access Daily Log' : 'Continue to Project'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && selectedRequirement && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Submit Requirement</h2>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmitRequirement} className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-white">{selectedRequirement.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{selectedRequirement.description}</p>
                {selectedRequirement.expiryDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Expiry: {formatDate(selectedRequirement.expiryDate)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                <textarea
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows="3"
                  placeholder="Add any notes about your submission..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {selectedRequirement.requires_upload && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Upload Document</label>
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-600 transition">
                    <Upload className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                    <p className="text-sm text-gray-400">Drop your document here or click to browse</p>
                    <input
                      type="file"
                      className="hidden"
                      id="document-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({
                            ...formData,
                            document_name: file.name,
                            document_url: URL.createObjectURL(file)
                          });
                        }
                      }}
                    />
                    <label htmlFor="document-upload" className="mt-2 inline-block px-4 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition">
                      Choose File
                    </label>
                    {formData.document_name && (
                      <p className="mt-2 text-sm text-green-400">✓ {formData.document_name}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceGatekeeper;