import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  Calendar,
  Sparkles
} from 'lucide-react';
import DailyLogShortcut from '../components/DailyLogShortcut';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalBudget: 0,
    totalActual: 0,
    overallProgress: 0
  });
  const navigate = useNavigate();

  // Helper function to format currency with spaces for thousands
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0';
    // Convert to number and format with spaces for thousands
    const num = Number(amount);
    // For millions, show as e.g., "R2.5M"
    if (num >= 1000000) {
      const millions = (num / 1000000).toFixed(1);
      return `R${millions}M`.replace('.0M', 'M');
    }
    // For thousands, format with spaces
    return `R${num.toLocaleString('en-ZA').replace(/,/g, ' ')}`;
  };

  // Helper function to format number with spaces
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString('en-ZA').replace(/,/g, ' ');
  };

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    const token = getToken();
    console.log('Token exists:', !!token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = new Date(payload.exp * 1000);
        console.log('Token expires:', exp.toLocaleString());
        console.log('Is expired:', exp < new Date());
      } catch (e) {
        console.error('Invalid token format', e);
        setAuthError(true);
      }
    } else {
      console.log('No token found - user may not be logged in');
      setAuthError(true);
    }
  }, []);

  const fetchAllData = async () => {
    const token = getToken();
    
    if (!token) {
      console.error('No access token found');
      setLoading(false);
      setAuthError(true);
      return;
    }

    try {
      const [projectsRes, logsRes] = await Promise.all([
        fetch('${API_URL}/api/projects/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('${API_URL}/api/daily-logs/', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (projectsRes.status === 401 || logsRes.status === 401) {
        console.error('Authentication failed - token invalid or expired');
        setAuthError(true);
        setLoading(false);
        return;
      }

      if (!projectsRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const projectsData = await projectsRes.json();
      const logsData = await logsRes.json();

      setProjects(projectsData);
      
      const pending = Array.isArray(logsData) ? logsData.filter(log => log.status === 'submitted') : [];
      const approved = Array.isArray(logsData) ? logsData.filter(log => log.status === 'approved') : [];
      
      setPendingSubmissions(pending);
      setApprovedSubmissions(approved);

      const totalBudget = projectsData.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      const totalActual = projectsData.reduce((sum, p) => sum + (Number(p.actual_cost) || 0), 0);
      const activeProjects = projectsData.filter(p => p.status === 'active').length;
      const overallProgress = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      setStats({
        totalProjects: projectsData.length,
        activeProjects,
        totalBudget,
        totalActual,
        overallProgress
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingCount = pendingSubmissions.length;
  const approvedCount = approvedSubmissions.length;

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-white text-lg font-semibold mb-2">Authentication Error</h3>
          <p className="text-white/60 text-sm mb-4">
            Your session has expired or you are not logged in.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-3 text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-orange-400" />
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">Dashboard</h1>
        </div>
        <p className="text-white/70 drop-shadow text-sm">Welcome back! Here's your project overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects Card */}
        <div 
          onClick={() => navigate('/projects')}
          className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Total Projects</span>
            <Building2 className="h-5 w-5 text-orange-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">{formatNumber(stats.totalProjects)}</div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">{formatNumber(stats.activeProjects)} active</div>
        </div>

        {/* Overall Progress Card */}
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Overall Progress</span>
            <TrendingUp className="h-5 w-5 text-orange-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">{stats.overallProgress?.toFixed(1) || 0}%</div>
          <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.overallProgress || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Total Budget Card - Properly formatted */}
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Total Budget</span>
            <DollarSign className="h-5 w-5 text-orange-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">{formatCurrency(stats.totalBudget)}</div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">Actual: {formatCurrency(stats.totalActual)}</div>
        </div>

        {/* Pending Approvals Card */}
        <div 
          onClick={() => window.open('${API_URL}/admin/core/dailylog/', '_blank')}
          className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Pending Approvals</span>
            <AlertCircle className={`h-5 w-5 transition-all duration-300 ${pendingCount > 0 ? 'text-yellow-300 group-hover:text-yellow-400' : 'text-white/50'} group-hover:scale-110`} />
          </div>
          <div className={`text-2xl font-bold mt-2 drop-shadow-lg ${pendingCount > 0 ? 'text-yellow-200' : 'text-white'}`}>{formatNumber(pendingCount)}</div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">Awaiting review</div>
        </div>
      </div>

      {/* Two Cards Side by Side */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Recent Projects Card */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-300" />
              <h3 className="font-semibold text-white drop-shadow">Recent Projects</h3>
            </div>
            <p className="text-xs text-white/60 drop-shadow">Your latest construction projects</p>
          </div>
          <div className="p-4 space-y-3">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-white/50">No projects yet</div>
            ) : (
              projects.slice(0, 3).map(project => (
                <div 
                  key={project.id} 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-white drop-shadow">{project.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(project.status)} transition-all duration-200`}>{project.status || 'draft'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.start_date)}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{project.progress || 0}%</span>
                  </div>
                  <DailyLogShortcut projectId={project.id} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daily Log Shortcut Info */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-300" />
              <h3 className="font-semibold text-white drop-shadow">Daily Logs Summary</h3>
            </div>
            <p className="text-xs text-white/60 drop-shadow">Quick access to site logs</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-400/20 transition-all duration-300 hover:scale-105 hover:bg-yellow-500/30">
                <div className="text-2xl font-bold text-yellow-200">{formatNumber(pendingCount)}</div>
                <div className="text-xs text-white/70">Pending Review</div>
              </div>
              <div className="text-center p-3 bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-400/20 transition-all duration-300 hover:scale-105 hover:bg-green-500/30">
                <div className="text-2xl font-bold text-green-200">{formatNumber(approvedCount)}</div>
                <div className="text-xs text-white/70">Approved</div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/submissions')}
              className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              View All Submissions →
            </button>
          </div>
        </div>
      </div>

      {/* Two Submission Widgets */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Pending Submissions Widget */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-300" />
                <h3 className="font-semibold text-white drop-shadow">Pending Submissions</h3>
              </div>
              <span className="text-xs bg-yellow-500/30 backdrop-blur-sm text-yellow-100 px-2 py-0.5 rounded-full">
                {formatNumber(pendingCount)} pending
              </span>
            </div>
            <p className="text-xs text-white/60 drop-shadow mt-1">Awaiting your review</p>
          </div>
          <div className="divide-y divide-white/10">
            {pendingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-300/50" />
                <p>No pending submissions</p>
              </div>
            ) : (
              pendingSubmissions.slice(0, 3).map(log => (
                <div 
                  key={log.id} 
                  onClick={() => navigate(`/projects/${log.project}`)} 
                  className="p-3 hover:bg-white/10 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-white truncate drop-shadow">{log.project_name || 'Project'}</p>
                    <span className="text-xs bg-yellow-500/30 text-yellow-100 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">Pending</span>
                  </div>
                  <p className="text-sm text-white/70 mt-1 line-clamp-1">{log.work_description?.substring(0, 60)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                    <span>by {log.contractor_name || 'Unknown'}</span>
                    <span>{formatDate(log.log_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {pendingSubmissions.length > 0 && (
            <div className="p-3 border-t border-white/10 bg-white/5">
              <button 
                onClick={() => navigate('/submissions')} 
                className="w-full text-center text-sm text-orange-300 hover:text-orange-200 font-medium transition-colors"
              >
                Review all pending →
              </button>
            </div>
          )}
        </div>

        {/* Approved Submissions Widget */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <h3 className="font-semibold text-white drop-shadow">Approved Submissions</h3>
              </div>
              <span className="text-xs bg-green-500/30 backdrop-blur-sm text-green-100 px-2 py-0.5 rounded-full">
                {formatNumber(approvedCount)} approved
              </span>
            </div>
            <p className="text-xs text-white/60 drop-shadow mt-1">Completed and verified</p>
          </div>
          <div className="divide-y divide-white/10">
            {approvedSubmissions.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                <Clock className="h-8 w-8 mx-auto mb-2 text-white/30" />
                <p>No approved submissions yet</p>
              </div>
            ) : (
              approvedSubmissions.slice(0, 3).map(log => (
                <div 
                  key={log.id} 
                  onClick={() => navigate(`/projects/${log.project}`)} 
                  className="p-3 hover:bg-white/10 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-white truncate drop-shadow">{log.project_name || 'Project'}</p>
                    <span className="text-xs bg-green-500/30 text-green-100 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">Approved</span>
                  </div>
                  <p className="text-sm text-white/70 mt-1 line-clamp-1">{log.work_description?.substring(0, 60)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                    <span>by {log.contractor_name || 'Unknown'}</span>
                    <span>{formatDate(log.log_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-3 flex items-center gap-3 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="bg-orange-500/30 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-orange-500/40">
            <ClipboardList className="h-5 w-5 text-orange-200" />
          </div>
          <div>
            <div className="text-sm text-white/70 drop-shadow">Total Submissions</div>
            <div className="font-semibold text-white drop-shadow-lg">{formatNumber(pendingCount + approvedCount)}</div>
          </div>
        </div>
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-3 flex items-center gap-3 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="bg-green-500/30 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-green-500/40">
            <CheckCircle className="h-5 w-5 text-green-200" />
          </div>
          <div>
            <div className="text-sm text-white/70 drop-shadow">Approved</div>
            <div className="font-semibold text-green-200 drop-shadow-lg">{formatNumber(approvedCount)}</div>
          </div>
        </div>
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-3 flex items-center gap-3 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="bg-yellow-500/30 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-yellow-500/40">
            <Clock className="h-5 w-5 text-yellow-200" />
          </div>
          <div>
            <div className="text-sm text-white/70 drop-shadow">Pending Review</div>
            <div className="font-semibold text-yellow-200 drop-shadow-lg">{formatNumber(pendingCount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;