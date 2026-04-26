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

// API Configuration - Hardcoded for production
const API_URL = 'https://bongankala.pythonanywhere.com';

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

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0';
    const num = Number(amount);
    if (num >= 1000000) {
      const millions = (num / 1000000).toFixed(1);
      return `R${millions}M`.replace('.0M', 'M');
    }
    return `R${num.toLocaleString('en-ZA').replace(/,/g, ' ')}`;
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString('en-ZA').replace(/,/g, ' ');
  };

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
    }
  }, []);

  const fetchAllData = async () => {
    const token = getToken();
    
    if (!token) {
      setLoading(false);
      setAuthError(true);
      return;
    }

    try {
      const [projectsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/projects/`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/daily-logs/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (projectsRes.status === 401 || logsRes.status === 401) {
        setAuthError(true);
        setLoading(false);
        return;
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
        <div className="bg-white rounded-xl shadow-xl p-6 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Authentication Error</h3>
          <p className="text-gray-500 text-sm mb-4">
            Your session has expired or you are not logged in.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/';
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
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-3 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-orange-400" />
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        </div>
        <p className="text-gray-500 text-sm">Welcome back! Here's your project overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div 
          onClick={() => navigate('/projects')}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Total Projects</span>
            <Building2 className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{formatNumber(stats.totalProjects)}</div>
          <div className="text-xs text-gray-400 mt-1">{formatNumber(stats.activeProjects)} active</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Overall Progress</span>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{stats.overallProgress?.toFixed(1) || 0}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${stats.overallProgress || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Total Budget</span>
            <DollarSign className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(stats.totalBudget)}</div>
          <div className="text-xs text-gray-400 mt-1">Actual: {formatCurrency(stats.totalActual)}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Pending Approvals</span>
            <AlertCircle className={`h-5 w-5 ${pendingCount > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{formatNumber(pendingCount)}</div>
          <div className="text-xs text-gray-400 mt-1">Awaiting review</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-gray-800">Recent Projects</h3>
            </div>
            <p className="text-xs text-gray-400">Your latest construction projects</p>
          </div>
          <div className="p-4 space-y-3">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No projects yet</div>
            ) : (
              projects.slice(0, 3).map(project => (
                <div 
                  key={project.id} 
                  className="bg-gray-50 rounded-lg p-3 border border-gray-100 transition-all duration-300 hover:shadow-md cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-800">{project.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>{project.status || 'draft'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.start_date)}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{project.progress || 0}%</span>
                  </div>
                  <DailyLogShortcut projectId={project.id} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-gray-800">Daily Logs Summary</h3>
            </div>
            <p className="text-xs text-gray-400">Quick access to site logs</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600">{formatNumber(pendingCount)}</div>
                <div className="text-xs text-gray-600">Pending Review</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="text-2xl font-bold text-green-600">{formatNumber(approvedCount)}</div>
                <div className="text-xs text-gray-600">Approved</div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/submissions')}
              className="mt-4 w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
            >
              View All Submissions →
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-800">Pending Submissions</h3>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {formatNumber(pendingCount)} pending
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Awaiting your review</p>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-300" />
                <p>No pending submissions</p>
              </div>
            ) : (
              pendingSubmissions.slice(0, 3).map(log => (
                <div 
                  key={log.id} 
                  onClick={() => navigate(`/projects/${log.project}`)} 
                  className="p-3 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-800 truncate">{log.project_name || 'Project'}</p>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-2">Pending</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{log.work_description?.substring(0, 60)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>by {log.contractor_name || 'Unknown'}</span>
                    <span>{formatDate(log.log_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {pendingSubmissions.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => navigate('/submissions')} 
                className="w-full text-center text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                Review all pending →
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-gray-800">Approved Submissions</h3>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {formatNumber(approvedCount)} approved
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Completed and verified</p>
          </div>
          <div className="divide-y divide-gray-100">
            {approvedSubmissions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No approved submissions yet</p>
              </div>
            ) : (
              approvedSubmissions.slice(0, 3).map(log => (
                <div 
                  key={log.id} 
                  onClick={() => navigate(`/projects/${log.project}`)} 
                  className="p-3 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-800 truncate">{log.project_name || 'Project'}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Approved</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{log.work_description?.substring(0, 60)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>by {log.contractor_name || 'Unknown'}</span>
                    <span>{formatDate(log.log_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
          <div className="bg-orange-100 p-2 rounded-lg">
            <ClipboardList className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Submissions</div>
            <div className="font-semibold text-gray-800">{formatNumber(pendingCount + approvedCount)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
          <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Approved</div>
            <div className="font-semibold text-green-600">{formatNumber(approvedCount)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Pending Review</div>
            <div className="font-semibold text-yellow-600">{formatNumber(pendingCount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;