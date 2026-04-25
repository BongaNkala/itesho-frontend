import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';

function InvoiceGenerator({ projectId }) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/invoices/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    if (!periodStart || !periodEnd) {
      alert('Please select period start and end dates');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/invoices/generate_from_period/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, period_start: periodStart, period_end: periodEnd }),
      });
      if (response.ok) {
        alert('Invoice generated successfully!');
        fetchInvoices();
        setPeriodStart('');
        setPeriodEnd('');
      } else {
        alert('No approved work found in this period');
      }
    } catch (err) {
      console.error('Failed to generate invoice:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-orange-500" /> Generate Invoice</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm font-medium mb-1">Period Start</label><input type="date" className="w-full p-2 border rounded" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Period End</label><input type="date" className="w-full p-2 border rounded" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
        </div>
        <button onClick={generateInvoice} disabled={generating} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          {generating ? 'Generating...' : 'Generate Invoice from Approved Work'}
        </button>
        <p className="text-xs text-gray-500 mt-2">Only approved daily logs will be included in the invoice.</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b"><h3 className="font-semibold">Previous Invoices</h3></div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No invoices generated yet</div>
        ) : (
          <div className="divide-y">
            {invoices.map(inv => (
              <div key={inv.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div><div className="font-medium">{inv.invoice_number}</div><div className="text-sm text-gray-500">Period: {new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}</div><div className="text-sm">Items: {inv.items?.length || 0}</div></div>
                  <div className="text-right"><div className="text-xl font-bold">R{inv.total_amount?.toLocaleString()}</div><div className="text-sm"><span className={`px-2 py-0.5 rounded ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : inv.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.status}</span></div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoiceGenerator;