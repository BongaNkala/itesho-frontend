import { useState, useEffect } from 'react';
import { X, Upload, File, Loader2, CheckCircle, Clock, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import ComplianceGatekeeper from '../components/compliance/ComplianceGatekeeper';

const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

function ProjectRequirementsForm({ isOpen, onClose, projectId, onSuccess }) {
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [documents, setDocuments] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [categories, setCategories] = useState([]);
  const [projectName, setProjectName] = useState('');
  
  // Compliance Gatekeeper state
  const [showCompliance, setShowCompliance] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [complianceChecked, setComplianceChecked] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  const [formData, setFormData] = useState({
    project_name: '', project_location: '', client_name: '', project_manager: '',
    start_date: '', expected_completion_date: '', scope_description: '', key_deliverables: '',
    exclusions: '', functional_requirements: '', aesthetic_requirements: '', special_requests: '',
    drawing_references: '', specification_documents: '', approved_by: '', site_conditions: '',
    access_logistics: '', existing_services: '', environmental_considerations: '', approved_budget: '',
    cost_priorities: '', key_milestones: '', critical_deadlines: '', permits_approvals: '',
    applicable_standards: '', labour_requirements: '', plant_equipment: '', key_materials: '',
    quality_standards: '', inspection_testing: '', reporting_structure: '', meeting_frequency: '',
    approval_process: '', known_risks: '', site_constraints: '', mitigation_plan: '',
  });

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectName();
      fetchCategories();
      fetchDocuments();
      // Reset compliance state when modal opens
      setComplianceChecked(false);
      setAccessGranted(false);
      setShowCompliance(false);
    }
  }, [isOpen, projectId]);

  const fetchProjectName = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProjectName(data.name || 'Project');
      }
    } catch (err) {
      console.error('Failed to fetch project name:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories/`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      const grouped = {};
      data.forEach(doc => {
        if (!grouped[doc.document_type]) grouped[doc.document_type] = [];
        grouped[doc.document_type].push(doc);
      });
      setDocuments(grouped);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const validDocumentTypes = [
    'drawing', 'specification', 'permit', 'license', 'certificate',
    'risk_assessment', 'method_statement', 'qa_qc', 'inspection',
    'test_result', 'site_photo', 'survey', 'geotech', 'equipment_cert',
    'operator_license', 'quotation', 'other'
  ];

  const getCategoryForDocType = (docType) => {
    const mapping = {
      'drawing': 'Drawings & Specifications',
      'specification': 'Drawings & Specifications',
      'permit': 'Legal & Compliance',
      'license': 'Legal & Compliance',
      'certificate': 'Legal & Compliance',
      'risk_assessment': 'Risks & Constraints',
      'method_statement': 'Risks & Constraints',
      'qa_qc': 'Quality Requirements',
      'inspection': 'Quality Requirements',
      'test_result': 'Quality Requirements',
      'site_photo': 'Site Information',
      'survey': 'Site Information',
      'geotech': 'Site Information',
      'equipment_cert': 'Resource Requirements',
      'operator_license': 'Resource Requirements',
      'quotation': 'Budget & Cost Constraints',
      'other': 'General Attachments',
    };
    const categoryName = mapping[docType] || 'General Attachments';
    const category = categories.find(c => c.name === categoryName);
    return category?.id || null;
  };

  const uploadDocument = async (sectionId, documentType, file) => {
    if (!file) return;

    const allowedExtensions = ['pdf', 'dwg', 'doc', 'docx', 'xlsx', 'jpg', 'png'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      alert(`File type .${fileExt} not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }

    const categoryId = getCategoryForDocType(documentType);
    if (!categoryId) {
      alert(`Could not determine category for ${documentType}`);
      return;
    }

    setUploadingDoc(documentType);
    setUploadStatus(prev => ({ ...prev, [documentType]: { status: 'uploading', message: 'Uploading...' } }));

    const formData = new FormData();
    formData.append('project', projectId);
    formData.append('category', categoryId);
    formData.append('document_type', documentType);
    formData.append('title', `${getSectionTitle(sectionId)} - ${documentType}`);
    formData.append('description', `Uploaded for ${getSectionTitle(sectionId)}`);
    formData.append('file', file);
    formData.append('file_name', file.name);
    formData.append('file_size', file.size.toString());
    formData.append('version', '1.0');

    try {
      const response = await fetch(`${API_URL}/api/documents/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(prev => ({ ...prev, [documentType]: { status: 'pending', message: '✓ Uploaded - Awaiting Approval' } }));
        fetchDocuments();
      } else {
        const errorMsg = data.file?.[0] || data.category?.[0] || 'Upload failed';
        setUploadStatus(prev => ({ ...prev, [documentType]: { status: 'error', message: `Error: ${errorMsg}` } }));
      }
    } catch (err) {
      setUploadStatus(prev => ({ ...prev, [documentType]: { status: 'error', message: 'Error: Connection failed' } }));
    } finally {
      setUploadingDoc(null);
    }
  };

  const getSectionTitle = (sectionId) => {
    const titles = {
      1: 'Project Details', 2: 'Project Scope', 3: 'Client Requirements',
      4: 'Drawings & Specifications', 5: 'Site Information', 6: 'Budget & Cost',
      7: 'Time Requirements', 8: 'Legal & Compliance', 9: 'Resources',
      10: 'Quality', 11: 'Communication', 12: 'Risks',
    };
    return titles[sectionId] || 'Requirements';
  };

  const getDocumentStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case 'pending': return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded flex items-center gap-1"><Clock className="h-3 w-3" /> Pending Approval</span>;
      case 'superseded': return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Superseded</span>;
      case 'expired': return <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Expired</span>;
      default: return null;
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/requirements/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert('Requirements saved successfully! Documents are pending approval.');
        onSuccess && onSuccess();
        onClose();
      } else {
        alert('Failed to save requirements');
      }
    } catch (err) {
      console.error('Failed to save requirements:', err);
      alert('Failed to save requirements');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening the form - check compliance first
  const handleOpenForm = () => {
    if (!complianceChecked) {
      setShowCompliance(true);
    } else {
      // Already passed compliance
    }
  };

  // Handle access granted from Compliance Gatekeeper
  const handleAccessGranted = () => {
    setShowCompliance(false);
    setAccessGranted(true);
    setComplianceChecked(true);
  };

  // Handle cancel from Compliance Gatekeeper
  const handleCancelCompliance = () => {
    setShowCompliance(false);
    onClose(); // Close the form entirely
  };

  // If compliance gatekeeper is showing, render it
  if (showCompliance && projectId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6">
          <button
            onClick={handleCancelCompliance}
            className="self-start mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <ComplianceGatekeeper
            projectId={projectId}
            projectName={projectName || 'Project'}
            onAccessGranted={handleAccessGranted}
            onCancel={handleCancelCompliance}
            returnPath="project-requirements"
          />
        </div>
      </div>
    );
  }

  // If compliance not yet checked, show a compliance check screen
  if (!complianceChecked && !showCompliance) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl w-full max-w-md p-8 text-center">
          <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Compliance Check Required</h2>
          <p className="text-gray-500 text-sm mb-6">
            You need to pass the compliance gatekeeper before accessing project requirements.
          </p>
          <button
            onClick={handleOpenForm}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 mx-auto"
          >
            <Shield className="h-4 w-4" />
            Verify Compliance
          </button>
          <button
            onClick={onClose}
            className="block mt-3 text-sm text-gray-400 hover:text-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // If access not granted yet, show message
  if (!accessGranted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl w-full max-w-md p-8 text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-6">
            You don't have access to this project's requirements.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Main form - only shown when compliance is passed
  const sections = [
    { id: 1, title: 'Project Details', icon: '📋', 
      docTypes: ['contract', 'project_brief', 'budget'] },
    { id: 2, title: 'Project Scope', icon: '🎯', 
      docTypes: ['scope_of_work', 'specification', 'drawing'] },
    { id: 3, title: 'Client Requirements', icon: '👤', 
      docTypes: ['client_brief', 'requirements_doc'] },
    { id: 4, title: 'Drawings & Specs', icon: '📐', 
      docTypes: ['drawing', 'specification'] },
    { id: 5, title: 'Site Information', icon: '🏗️', 
      docTypes: ['site_photo', 'survey', 'geotech', 'site_plan'] },
    { id: 6, title: 'Budget & Cost', icon: '💰', 
      docTypes: ['budget', 'quotation', 'cost_estimate'] },
    { id: 7, title: 'Time Requirements', icon: '⏰', 
      docTypes: ['schedule', 'milestone_plan', 'gantt_chart'] },
    { id: 8, title: 'Legal & Compliance', icon: '⚖️', 
      docTypes: ['permit', 'license', 'certificate', 'insurance', 'safety_file'] },
    { id: 9, title: 'Resources', icon: '👷', 
      docTypes: ['equipment_cert', 'operator_license', 'cv', 'qualification'] },
    { id: 10, title: 'Quality', icon: '✅', 
      docTypes: ['qa_qc_plan', 'inspection_checklist', 'test_result', 'quality_cert'] },
    { id: 11, title: 'Communication', icon: '📢', 
      docTypes: ['communication_plan', 'reporting_template', 'meeting_minutes'] },
    { id: 12, title: 'Risks', icon: '⚠️', 
      docTypes: ['risk_assessment', 'method_statement', 'emergency_plan', 'hazard_register'] },
  ];

  if (!isOpen) return null;

  const DocumentUploadWidget = ({ section }) => (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 text-orange-500" />
        Required Documents
        <span className="text-xs text-gray-500 ml-2">(Upload each document individually)</span>
      </h4>
      <div className="space-y-3">
        {section.docTypes.map(docType => {
          const existingDocs = documents[docType] || [];
          const latestDoc = existingDocs.find(d => d.is_latest);
          const status = uploadStatus[docType];
          
          return (
            <div key={docType} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium capitalize">{docType.replace('_', ' ')}</span>
                <label className="cursor-pointer bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 transition">
                  <Upload className="h-3 w-3 inline mr-1" />
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.dwg,.doc,.docx,.xlsx,.jpg,.png"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        uploadDocument(section.id, docType, e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
              
              {status && (
                <div className={`text-xs mt-2 p-2 rounded ${
                  status.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                  status.status === 'uploading' ? 'bg-blue-50 text-blue-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {status.status === 'uploading' && <Loader2 className="inline animate-spin h-3 w-3 mr-1" />}
                  {status.status === 'pending' && <Clock className="inline h-3 w-3 mr-1" />}
                  {status.status === 'error' && <AlertCircle className="inline h-3 w-3 mr-1" />}
                  {status.message}
                </div>
              )}
              
              {existingDocs.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">Uploaded Documents:</div>
                  {existingDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between text-sm border-l-2 pl-2 ml-1 py-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <File className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-mono">v{doc.version}</span>
                        <span className="text-xs text-gray-600">{doc.file_name}</span>
                        {getDocumentStatusBadge(doc.status)}
                        {doc.is_latest && doc.status === 'active' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Current</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Project Requirements & Document Control</h2>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded-full text-xs text-green-700">
              <CheckCircle className="h-3 w-3" />
              Compliance Verified
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex overflow-x-auto border-b px-4 gap-1">
          {sections.map((section) => (
            <button key={section.id} onClick={() => setActiveSection(section.id)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${activeSection === section.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className="mr-2">{section.icon}</span>{section.title}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeSection === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Project Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Project Name *</label><input type="text" className="w-full p-2 border rounded" value={formData.project_name} onChange={(e) => handleChange('project_name', e.target.value)} required /></div>
                <div><label className="block text-sm font-medium mb-1">Project Location</label><input type="text" className="w-full p-2 border rounded" value={formData.project_location} onChange={(e) => handleChange('project_location', e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Client Name</label><input type="text" className="w-full p-2 border rounded" value={formData.client_name} onChange={(e) => handleChange('client_name', e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Project Manager</label><input type="text" className="w-full p-2 border rounded" value={formData.project_manager} onChange={(e) => handleChange('project_manager', e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" className="w-full p-2 border rounded" value={formData.start_date} onChange={(e) => handleChange('start_date', e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Expected Completion</label><input type="date" className="w-full p-2 border rounded" value={formData.expected_completion_date} onChange={(e) => handleChange('expected_completion_date', e.target.value)} /></div>
              </div>
              <DocumentUploadWidget section={sections[0]} />
            </div>
          )}

          {activeSection === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Drawings & Specifications</h3>
              <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-sm">⚠️ Version Control: Upload new versions as drawings are revised. Old versions marked "Superseded".</div>
              <div><label className="block text-sm font-medium mb-1">Drawing References</label><input type="text" className="w-full p-2 border rounded" value={formData.drawing_references} onChange={(e) => handleChange('drawing_references', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">Specification Documents</label><input type="text" className="w-full p-2 border rounded" value={formData.specification_documents} onChange={(e) => handleChange('specification_documents', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">Approved By</label><input type="text" className="w-full p-2 border rounded" value={formData.approved_by} onChange={(e) => handleChange('approved_by', e.target.value)} /></div>
              <DocumentUploadWidget section={sections[3]} />
            </div>
          )}

          {activeSection === 8 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Legal & Compliance</h3>
              <div className="bg-orange-50 p-3 rounded-lg mb-4 text-sm">⚠️ Expiry Tracking: Upload permits/licenses with expiry dates for automatic alerts.</div>
              <div><label className="block text-sm font-medium mb-1">Permits/Approvals</label><textarea rows="2" className="w-full p-2 border rounded" value={formData.permits_approvals} onChange={(e) => handleChange('permits_approvals', e.target.value)} placeholder="List required permits and their status" /></div>
              <div><label className="block text-sm font-medium mb-1">Applicable Standards</label><textarea rows="2" className="w-full p-2 border rounded" value={formData.applicable_standards} onChange={(e) => handleChange('applicable_standards', e.target.value)} placeholder="e.g., SANS 10400, OHS Act" /></div>
              <DocumentUploadWidget section={sections[7]} />
            </div>
          )}

          {[2,3,5,6,7,9,10,11,12].map(sectionNum => {
            const section = sections.find(s => s.id === sectionNum);
            return activeSection === sectionNum && (
              <div className="space-y-4" key={sectionNum}>
                <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                <textarea rows="4" className="w-full p-2 border rounded" placeholder={`Enter ${section.title} details...`} 
                  value={formData[Object.keys(formData)[sectionNum]] || ''} 
                  onChange={(e) => handleChange(Object.keys(formData)[sectionNum], e.target.value)} />
                <DocumentUploadWidget section={section} />
              </div>
            );
          })}

          <div className="flex justify-between mt-8 pt-4 border-t">
            <button type="button" onClick={() => setActiveSection(Math.max(1, activeSection - 1))} className={`px-4 py-2 border rounded ${activeSection === 1 ? 'invisible' : ''}`}>Previous</button>
            {activeSection < 12 ? (
              <button type="button" onClick={() => setActiveSection(Math.min(12, activeSection + 1))} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">Next</button>
            ) : (
              <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Submit All Requirements'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectRequirementsForm;
