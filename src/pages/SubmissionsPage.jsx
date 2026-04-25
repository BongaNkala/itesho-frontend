import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Eye, Sparkles, AlertCircle } from 'lucide-react';

function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/daily-logs/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const entriesArray = Array.isArray(data) ? data : [];
      
      // Sort by date descending, then by created_at time for same day
      const sorted = [...entriesArray].sort((a, b) => {
        const dateCompare = new Date(b.log_date) - new Date(a.log_date);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
      
      setSubmissions(sorted);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
          <CheckCircle className="h-2.5 w-2.5" /> Approved
        </span>
      );
    }
    if (status === 'submitted') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
          <Clock className="h-2.5 w-2.5" /> Pending
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
          <XCircle className="h-2.5 w-2.5" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
        <Clock className="h-2.5 w-2.5" /> Draft
      </span>
    );
  };

  const formatFullDateTime = (dateString, createdString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const time = createdString ? new Date(createdString) : date;
    return `${date.toLocaleDateString()} ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="bg-white rounded-xl shadow-xl p-6 text-center max-w-md border border-gray-100">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Authentication Error</h3>
          <p className="text-gray-500 text-sm mb-4">
            Your session has expired or you are not logged in.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-3 text-gray-500 text-sm">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4 bg-white min-h-screen">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h1 className="text-xl font-semibold text-gray-800">Submissions</h1>
        </div>
        <p className="text-xs text-gray-400">All daily log submissions from contractors</p>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-2.5 text-xs font-medium text-gray-500">Date & Time</th>
                <th className="text-left p-2.5 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left p-2.5 text-xs font-medium text-gray-500">Contractor</th>
                <th className="text-left p-2.5 text-xs font-medium text-gray-500">Work Description</th>
                <th className="text-left p-2.5 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left p-2.5 text-xs font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400 text-sm">
                    No submissions found
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <td className="p-2.5 text-xs text-gray-600 whitespace-nowrap">
                      {formatFullDateTime(sub.log_date, sub.created_at)}
                    </td>
                    <td className="p-2.5 text-xs font-medium text-gray-700">
                      {sub.project_name || 'N/A'}
                    </td>
                    <td className="p-2.5 text-xs text-gray-600">
                      {sub.contractor_name || 'Unknown'}
                    </td>
                    <td className="p-2.5 text-xs text-gray-500 max-w-md truncate">
                      {sub.work_description || '-'}
                    </td>
                    <td className="p-2.5">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="p-2.5">
                      <button 
                        onClick={() => navigate(`/projects/${sub.project}`)}
                        className="text-orange-500 hover:text-orange-600 transition-colors p-1"
                        title="View Submission"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      {submissions.length > 0 && (
        <div className="text-xs text-gray-400 pt-2">
          Showing {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default SubmissionsPage;