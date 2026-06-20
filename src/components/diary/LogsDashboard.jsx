const API_URL = 'http://127.0.0.1:8000';

import { useState, useEffect } from 'react';
import { Search, ClipboardList, Clock, CheckCircle, FileText, Sparkles, Filter, AlertCircle, XCircle, MinusCircle } from 'lucide-react';

function LogsDashboard({ projectId, onNewEntry }) {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, partiallyApproved: 0, rejected: 0 });

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (projectId) {
      fetchEntries();
    }
  }, [projectId]);

  useEffect(() => {
    filterEntries();
  }, [searchTerm, statusFilter, entries]);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${API_URL}/api/daily-logs/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      const entriesArray = Array.isArray(data) ? data : [];
      
      const sorted = [...entriesArray].sort((a, b) => {
        const dateCompare = new Date(b.log_date) - new Date(a.log_date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setEntries(sorted);
      
      // Calculate stats based on actual status values from Django
      const pending = sorted.filter(e => e.status === 'submitted' || e.status === 'pending').length;
      const approved = sorted.filter(e => e.status === 'approved' || e.status === 'Fully Approved').length;
      const partiallyApproved = sorted.filter(e => e.status === 'partially_approved' || e.status === 'Partially Approved').length;
      const rejected = sorted.filter(e => e.status === 'rejected' || e.status === 'Rejected').length;
      
      setStats({
        total: sorted.length,
        pending: pending,
        approved: approved,
        partiallyApproved: partiallyApproved,
        rejected: rejected
      });
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.work_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved') {
        filtered = filtered.filter(e => e.status === 'approved' || e.status === 'Fully Approved');
      } else if (statusFilter === 'partially_approved') {
        filtered = filtered.filter(e => e.status === 'partially_approved' || e.status === 'Partially Approved');
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(e => e.status === 'rejected' || e.status === 'Rejected');
      } else {
        filtered = filtered.filter(e => e.status === statusFilter);
      }
    }
    setFilteredEntries(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    // Handle various status formats from Django
    const lowerStatus = status?.toLowerCase() || '';
    
    if (lowerStatus === 'approved' || lowerStatus === 'fully approved') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700"><CheckCircle className="h-2.5 w-2.5" /> Approved</span>;
    }
    if (lowerStatus === 'partially approved' || lowerStatus === 'partially_approved') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700"><MinusCircle className="h-2.5 w-2.5" /> Partially Approved</span>;
    }
    if (lowerStatus === 'submitted' || lowerStatus === 'pending') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-700"><Clock className="h-2.5 w-2.5" /> Pending</span>;
    }
    if (lowerStatus === 'rejected') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700"><XCircle className="h-2.5 w-2.5" /> Rejected</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600"><FileText className="h-2.5 w-2.5" /> {status || 'Draft'}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-sm text-gray-500">Loading logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-orange-50">
          <ClipboardList className="h-4 w-4 text-orange-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Daily Logs Dashboard</h3>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Total Logs</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</div>
            </div>
            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Pending</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
            </div>
            <div className="p-2 rounded-lg bg-yellow-50 group-hover:bg-yellow-100 transition-colors">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Partially Approved</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stats.partiallyApproved}</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <MinusCircle className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">Approved</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search logs by description..." 
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select 
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="submitted">Pending</option>
            <option value="partially_approved">Partially Approved</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button 
          onClick={onNewEntry}
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-sm flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          New Log
        </button>
      </div>

      {/* Logs List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <ClipboardList className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No logs found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
            {(searchTerm || statusFilter !== 'all') && (
              <button 
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                Clear filters →
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-orange-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        entry.status === 'approved' || entry.status === 'Fully Approved' ? 'bg-emerald-400' :
                        entry.status === 'partially_approved' || entry.status === 'Partially Approved' ? 'bg-blue-400' :
                        entry.status === 'submitted' ? 'bg-yellow-400' :
                        entry.status === 'rejected' ? 'bg-red-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="font-semibold text-sm text-gray-800">{formatDate(entry.log_date)}</span>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(entry.status)}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mt-2 line-clamp-2 leading-relaxed">
                    {entry.work_description || 'No description provided'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>by {entry.contractor_name || 'Unknown'}</span>
                    {entry.created_at && (
                      <span>• {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {entry.entries?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {entry.entries.length} items
                      </span>
                    )}
                  </div>
                  {/* Show approval notes if available */}
                  {entry.review_notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500 italic">
                      " {entry.review_notes} "
                    </div>
                  )}
                </div>
                <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {filteredEntries.length > 0 && (
        <div className="flex items-center justify-between pt-2 text-xs text-gray-400 border-t border-gray-100">
          <span>Showing {filteredEntries.length} of {entries.length} logs</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
              {stats.pending} pending
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              {stats.partiallyApproved} partial
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              {stats.approved} approved
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogsDashboard;