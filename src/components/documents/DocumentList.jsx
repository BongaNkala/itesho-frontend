import { useState, useEffect } from 'react';
import { File, Download, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

function DocumentList({ projectId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchDocuments();
  }, [projectId, filter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let url = `http://127.0.0.1:8000/api/documents/?project_id=${projectId}`;
      if (filter === 'active') url += '&is_latest=true&status=active';
      if (filter === 'pending') url += '&status=pending';
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'superseded': return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'expired': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1 rounded text-sm ${filter === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
        >
          Active Documents
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded text-sm ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
        >
          Pending Approval
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
        >
          All Documents
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents found
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <h4 className="font-medium">{doc.title}</h4>
                    <p className="text-sm text-gray-500">v{doc.version} • {doc.document_type?.replace('_', ' ')}</p>
                    {doc.description && <p className="text-sm text-gray-600 mt-1">{doc.description}</p>}
                    {doc.expiry_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 rounded ${doc.status === 'active' ? 'bg-green-100 text-green-800' : doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                  {doc.status}
                </span>
                {doc.is_latest && doc.status === 'active' && (
                  <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Latest</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentList;
