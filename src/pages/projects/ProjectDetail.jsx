const API_URL = 'https://bongankala.pythonanywhere.com';

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Building2, Calendar, Layers, ClipboardList, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import BOQManager from '../../components/boq/BOQManager';
import DailyLogForm from '../../components/dailylog/DailyLogForm';
import InvoiceGenerator from '../../components/invoices/InvoiceGenerator';
import InspectionManager from '../../components/inspections/InspectionManager';
import LogsDashboard from '../../components/diary/LogsDashboard';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [boqItems, setBoqItems] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchBOQItems();
    }
  }, [id]);

  const fetchProject = async () => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401) { 
        setAuthError(true);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data);
    } catch (err) { 
      console.error('Failed to load project:', err);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchBOQItems = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/boq/?project_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const flatten = (items) => {
        let result = [];
        for (const item of items) {
          if (item.level === 3 || item.level === 4 || item.level === 5) {
            result.push(item);
          }
          if (item.children) result.push(...flatten(item.children));
        }
        return result;
      };
      setBoqItems(flatten(data));
    } catch (err) {
      console.error('Failed to fetch BOQ:', err);
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-3 text-gray-500">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="bg-white rounded-xl shadow-xl p-6 text-center">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Project not found</p>
          <button 
            onClick={() => navigate('/projects')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/projects')} 
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
              {project.status?.replace('_', ' ') || 'draft'}
            </span>
          </div>
          {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Budget</span>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">
            R{project.budget ? Number(project.budget).toLocaleString() : '0'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Progress</span>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{project.progress || 0}%</div>
          <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${project.progress || 0}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Location</span>
            <Building2 className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-lg font-medium text-gray-800 mt-2">{project.location || 'N/A'}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Timeline</span>
            <Calendar className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-sm font-medium text-gray-800 mt-2">{formatDate(project.start_date)}</div>
          <p className="text-xs text-gray-400">to {formatDate(project.end_date)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="boq" className="space-y-4">
        <TabsList className="bg-gray-100 rounded-xl p-1 flex flex-wrap gap-1">
          <TabsTrigger value="boq" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 text-gray-600 rounded-lg px-4 py-2">
            <Layers className="h-4 w-4 inline mr-2" /> BOQ
          </TabsTrigger>
          <TabsTrigger value="daily-logs" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 text-gray-600 rounded-lg px-4 py-2">
            <ClipboardList className="h-4 w-4 inline mr-2" /> Daily Logs
          </TabsTrigger>
          <TabsTrigger value="inspections" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 text-gray-600 rounded-lg px-4 py-2">
            <FileText className="h-4 w-4 inline mr-2" /> Inspections
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 text-gray-600 rounded-lg px-4 py-2">
            <FileText className="h-4 w-4 inline mr-2" /> Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boq" className="bg-white rounded-xl border border-gray-100 p-6">
          <BOQManager projectId={id} />
        </TabsContent>
        
        <TabsContent value="daily-logs" className="bg-white rounded-xl border border-gray-100 p-6">
          {showLogForm ? (
            <div>
              <button 
                onClick={() => setShowLogForm(false)} 
                className="mb-4 text-orange-500 hover:text-orange-600"
              >
                ← Back to Logs
              </button>
              <DailyLogForm projectId={id} onSuccess={() => setShowLogForm(false)} />
            </div>
          ) : (
            <LogsDashboard projectId={id} onNewEntry={() => setShowLogForm(true)} />
          )}
        </TabsContent>
        
        <TabsContent value="inspections" className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Inspections</h3>
          <p className="text-gray-500 text-sm mb-4">Inspection points for BOQ items</p>
          <div className="space-y-6">
            {boqItems.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No BOQ items found. Create BOQ items first.</p>
            ) : (
              boqItems.map(item => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-800 mb-3">{item.item_code} - {item.description}</h4>
                  <InspectionManager projectId={id} boqItemId={item.id} />
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="invoices" className="bg-white rounded-xl border border-gray-100 p-6">
          <InvoiceGenerator projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectDetail;