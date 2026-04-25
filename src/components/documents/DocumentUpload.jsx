import { useState, useEffect } from 'react';
import { Upload, File, X, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

function DocumentUpload({ projectId, onUploadComplete }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/categories/', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('project', projectId);
    formData.append('category', selectedCategory);
    formData.append('document_type', documentType);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    formData.append('file_name', file.name);
    formData.append('file_size', file.size);
    formData.append('version', '1.0');
    if (issueDate) formData.append('issue_date', issueDate);
    if (expiryDate) formData.append('expiry_date', expiryDate);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/documents/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      });

      if (response.ok) {
        setFile(null);
        setTitle('');
        setDescription('');
        setIssueDate('');
        setExpiryDate('');
        onUploadComplete && onUploadComplete();
        alert('Document uploaded successfully! Pending approval.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const documentTypes = [
    'drawing', 'specification', 'permit', 'license', 'certificate',
    'risk_assessment', 'method_statement', 'qa_qc', 'inspection',
    'test_result', 'site_photo', 'survey', 'geotech', 'equipment_cert',
    'operator_license', 'quotation', 'other'
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-orange-500" />
        Upload Document
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Document Type *</label>
            <select
              className="w-full p-2 border rounded"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              required
            >
              <option value="">Select type</option>
              {documentTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full p-2 border rounded"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Issue Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">File *</label>
          <input
            type="file"
            className="w-full p-2 border rounded"
            onChange={handleFileChange}
            accept=".pdf,.dwg,.doc,.docx,.xlsx,.jpg,.png"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted: PDF, DWG, DOC, DOCX, XLSX, JPG, PNG
          </p>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="animate-spin inline mr-2 h-4 w-4" /> : <Upload className="inline mr-2 h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
    </div>
  );
}

export default DocumentUpload;
