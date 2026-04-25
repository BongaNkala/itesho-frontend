import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, DollarSign, Sparkles, AlertCircle, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    client_name: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'planning'
  });

  const getToken = () => localStorage.getItem('access_token');

  const fetchProjects = async () => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowModal(false);
        setFormData({ name: '', description: '', location: '', client_name: '', start_date: '', end_date: '', budget: '', status: 'planning' });
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'planning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'on_hold': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
          <p className="mt-3 text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
          </div>
          <p className="text-xs text-gray-400">Manage your construction projects</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 text-sm"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Project
        </Button>
      </div>

      {/* Projects Grid - Compact Cards */}
      {projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-gray-400 text-sm mb-3">No projects yet</p>
          <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 text-sm">
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 hover:border-orange-200"
              onClick={() => window.location.href = `/projects/${project.id}`}
            >
              <CardHeader className="p-3 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold text-gray-800 truncate">{project.name}</CardTitle>
                    {project.location && (
                      <CardDescription className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate">{project.location}</span>
                      </CardDescription>
                    )}
                  </div>
                  <Badge className={`text-[9px] px-1.5 py-0.5 ${getStatusColor(project.status)} border`}>
                    {project.status?.replace('_', ' ') || 'draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {project.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(project.start_date)}</span>
                  {project.end_date && (
                    <span className="text-gray-400">→ {formatDate(project.end_date)}</span>
                  )}
                </div>
                
                {project.budget && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                    <DollarSign className="h-3 w-3 text-orange-500" />
                    <span>R{Number(project.budget).toLocaleString()}</span>
                  </div>
                )}
                
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Progress</span>
                    <span className="font-medium text-gray-600">{project.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500" 
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal - Glass Design */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Create New Project</h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Project Name *" 
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
                <textarea 
                  placeholder="Description" 
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  rows="2" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
                <input 
                  type="text" 
                  placeholder="Location" 
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                />
                <input 
                  type="text" 
                  placeholder="Client Name" 
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={formData.client_name} 
                  onChange={e => setFormData({...formData, client_name: e.target.value})} 
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="date" 
                    placeholder="Start Date" 
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    value={formData.start_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})} 
                  />
                  <input 
                    type="date" 
                    placeholder="End Date" 
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    value={formData.end_date} 
                    onChange={e => setFormData({...formData, end_date: e.target.value})} 
                  />
                </div>
                <input 
                  type="number" 
                  placeholder="Budget (R)" 
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={formData.budget} 
                  onChange={e => setFormData({...formData, budget: e.target.value})} 
                />
                <select 
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsList;