import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Eye, ChevronDown, ChevronUp, AlertCircle, FileText, Calendar, User, MapPin, DollarSign } from 'lucide-react';

function PendingApprovals() {
  const [pendingLogs, setPendingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [stats, setStats] = useState({ pending: 0, myLevel: '' });
  const [userRole, setUserRole] = useState('');

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchUserRole();
    fetchPendingLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserRole = () => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'contractor');
      } catch (e) {}
    }
  };

  const fetchPendingLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pending-approvals/', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setPendingLogs(data);
      
      // Calculate stats
      const currentLevel = data.length > 0 && data[0].current_level_name;
      setStats({
        pending: data.length,
        myLevel: currentLevel || 'Unknown'
      });
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (log) => {
    try {
      const response = await fetch(`${API_URL}/api/daily-logs/${log.id}/approve/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments: approvalComments,
          seal_number: sealNumber
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || 'Approved successfully!');
        setShowApproveModal(false);
        setApprovalComments('');
        setSealNumber('');
        fetchPendingLogs();
      } else {
        alert(data.error || 'Approval failed');
      }
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('Failed to approve');
    }
  };

  const handleReject = async (log) => {
    try {
      const response = await fetch(`${API_URL}/api/daily-logs/${log.id}/reject/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments: rejectionReason
        }),
      });
      
      if (response.ok) {
        alert('Rejected successfully!');
        setShowRejectModal(false);
        setRejectionReason('');
        fetchPendingLogs();
      } else {
        alert('Rejection failed');
      }
    } catch (err) {
      console.error('Failed to reject:', err);
      alert('Failed to reject');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rejected</span>;
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Pending</span>;
      default:
        return <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'pm': return 'bg-purple-100 text-purple-800';
      case 'inspector': return 'bg-blue-100 text-blue-800';
      case 'consultant': return 'bg-green-100 text-green-800';
      case 'municipal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const toggleExpand = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading pending approvals...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-gray-500">Review and approve daily logs from contractors</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-500">Pending for You</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-400 mt-1">Awaiting your approval</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Your Role</div>
          <div className="text-xl font-bold capitalize">{userRole || 'Unknown'}</div>
          <div className="text-xs text-gray-400 mt-1">Approval level: {stats.myLevel}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-500">Total Submissions</div>
          <div className="text-3xl font-bold">{pendingLogs.length}</div>
          <div className="text-xs text-gray-400 mt-1">Awaiting review chain</div>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div className="space-y-4">
        {pendingLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-3" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-gray-500">No pending approvals at this time.</p>
          </div>
        ) : (
          pendingLogs.map(log => (
            <div key={log.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{log.project_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(userRole)} capitalize`}>
                        {userRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.work_description?.substring(0, 100)}</p>
                  </div>
                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedLog === log.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Date: {formatDate(log.log_date)}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Contractor: {log.contractor_name}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Submitted: {formatDateTime(log.submitted_at)}</span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedLog === log.id && (
                <div className="p-4 border-b bg-gray-50">
                  <h4 className="font-semibold text-sm mb-3">Approval Chain Status</h4>
                  <div className="space-y-2">
                    {log.approval_status && log.approval_status.map((level, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded">
                        <div className="w-8 text-center">
                          {level.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {level.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                          {level.status === 'waiting' && <Clock className="h-4 w-4 text-gray-400" />}
                          {level.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{level.level}</div>
                          {level.approved_by && (
                            <div className="text-xs text-gray-500">by {level.approved_by} at {formatDateTime(level.approved_at)}</div>
                          )}
                          {level.comments && <div className="text-xs text-gray-400 mt-1">Comment: {level.comments}</div>}
                          {level.seal_number && <div className="text-xs text-blue-600 mt-1">Seal #: {level.seal_number}</div>}
                        </div>
                        <div>
                          {level.status === 'approved' && <span className="text-xs text-green-600">Approved</span>}
                          {level.status === 'pending' && <span className="text-xs text-yellow-600">Pending Your Action</span>}
                          {level.status === 'waiting' && <span className="text-xs text-gray-400">Waiting</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 flex gap-3 border-t">
                <button
                  onClick={() => {
                    setSelectedLog(log);
                    setShowApproveModal(true);
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedLog(log);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => navigate(`/projects/${log.project}`)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Full Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Approve Daily Log #{selectedLog.id}</h3>
            <p className="text-sm text-gray-600 mb-4">Project: {selectedLog.project_name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Comments (Optional)</label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows="3"
                  placeholder="Add any notes or verification comments..."
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                />
              </div>
              
              {userRole === 'municipal' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Seal / Reference Number *</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Enter government seal or reference number"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalComments('');
                  setSealNumber('');
                }}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedLog)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-600">Reject Daily Log #{selectedLog.id}</h3>
            <p className="text-sm text-gray-600 mb-4">Project: {selectedLog.project_name}</p>
            
            <div>
              <label className="block text-sm font-medium mb-1">Reason for Rejection *</label>
              <textarea
                className="w-full p-2 border rounded"
                rows="4"
                placeholder="Explain why this submission is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedLog)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingApprovals;
