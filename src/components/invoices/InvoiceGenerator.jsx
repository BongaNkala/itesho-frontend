const API_URL = 'http://127.0.0.1:8000';

import { useState, useEffect, useCallback } from 'react';
import { 
  Save, FileText, Calendar, User, Building2, RefreshCw, Lock, 
  AlertCircle, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle
} from 'lucide-react';

function InvoiceGenerator({ projectId }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [boqItems, setBoqItems] = useState([]);
  const [boqSummary, setBoqSummary] = useState({
    totalPlanned: 0,
    totalClaimable: 0,
    totalClaimed: 0,
    remaining: 0,
    progress: 0,
    claimableItems: [],
    claimedItems: []
  });
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const VAT_RATE = 15;
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    client_name: '',
    client_address: '',
    items: [],
    subtotal: 0,
    vat_amount: 0,
    total_amount: 0,
    notes: '',
    status: 'draft',
    deductions: [],
    deduction_total: 0,
    net_amount: 0
  });

  const getToken = () => localStorage.getItem('access_token');

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (amount) => {
    const num = safeNumber(amount);
    return `R${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // ============================================================
  // GENERATE INVOICE NUMBER
  // ============================================================
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const project = projects.find(p => p.id === parseInt(selectedProject));
    const prefix = project?.name ? project.name.substring(0, 3).toUpperCase() : 'INV';
    const projectInvoices = invoices.filter(inv => inv.project === parseInt(selectedProject));
    const count = projectInvoices.length + 1;
    const sequence = String(count).padStart(3, '0');
    
    return `${prefix}-${year}${month}${day}-${sequence}`;
  };

  // ============================================================
  // CALCULATE DUE DATE (30 days from invoice date)
  // ============================================================
  const calculateDueDate = (invoiceDate) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  // ============================================================
  // CALCULATE BOQ TOTALS
  // ============================================================
  const calculateBOQTotals = (items) => {
    let totalPlanned = 0;
    let totalClaimable = 0;
    let totalClaimed = 0;
    let claimableItems = [];
    let claimedItems = [];
    
    const flatten = (itemList) => {
      for (const item of itemList) {
        if (item.level === 1) {
          const plannedQty = safeNumber(item.planned_quantity);
          const approvedQty = safeNumber(item.approved_quantity);
          const rate = safeNumber(item.rate);
          
          totalPlanned += plannedQty * rate;
          totalClaimable += approvedQty * rate;
          
          if (approvedQty > 0) {
            claimableItems.push({
              id: item.id,
              code: item.item_code,
              description: item.description,
              quantity: approvedQty,
              rate: rate,
              amount: approvedQty * rate,
              unit: item.unit,
              status: 'claimable'
            });
          }
        }
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    };
    
    flatten(items);
    
    const claimedAmount = invoices.reduce((sum, inv) => {
      if (inv.status !== 'cancelled') {
        return sum + safeNumber(inv.total_amount);
      }
      return sum;
    }, 0);
    
    invoices.forEach(inv => {
      if (inv.status !== 'cancelled' && inv.items) {
        inv.items.forEach(item => {
          claimedItems.push({
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            description: item.description,
            quantity: safeNumber(item.quantity),
            rate: safeNumber(item.unit_price),
            amount: safeNumber(item.amount),
            status: inv.status
          });
        });
      }
    });
    
    return {
      totalPlanned,
      totalClaimable,
      totalClaimed: claimedAmount,
      remaining: totalClaimable - claimedAmount,
      progress: totalClaimable > 0 ? (claimedAmount / totalClaimable) * 100 : 0,
      claimableItems,
      claimedItems
    };
  };

  // ============================================================
  // FETCH DATA
  // ============================================================
  const fetchBOQ = useCallback(async () => {
    if (!selectedProject) return;
    
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/boq/tree/?project_id=${selectedProject}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch BOQ data');
      }
      
      const data = await response.json();
      const totals = calculateBOQTotals(data);
      setBoqSummary(totals);
      
      const project = projects.find(p => p.id === parseInt(selectedProject));
      
      const invoiceItems = totals.claimableItems.map(item => ({
        description: `${item.code} - ${item.description}`,
        quantity: item.quantity,
        unit_price: item.rate,
        amount: item.amount
      }));
      
      const subtotal = totals.totalClaimable;
      const vatAmount = subtotal * (VAT_RATE / 100);
      const totalAmount = subtotal + vatAmount;
      const invoiceDate = new Date().toISOString().split('T')[0];
      
      setFormData({
        invoice_number: generateInvoiceNumber(),
        invoice_date: invoiceDate,
        due_date: calculateDueDate(invoiceDate),
        client_name: project?.client_name || '',
        client_address: project?.location || '',
        items: invoiceItems,
        subtotal: subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        net_amount: totalAmount,
        notes: `Invoice based on approved Level 1 BOQ quantities for ${project?.name || 'Project'}`,
        status: 'draft',
        deductions: [],
        deduction_total: 0
      });
      
    } catch (err) {
      console.error('Failed to fetch BOQ:', err);
      setError('Failed to load BOQ data. Please refresh.');
    }
  }, [selectedProject, projects, invoices]);

  const fetchProjects = useCallback(async () => {
    const token = getToken();
    
    if (!token) {
      setError('Please log in to view projects');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
      setError(null);
      
      if (!projectId && data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchInvoices = useCallback(async () => {
    const token = getToken();
    if (!token || !selectedProject) return;

    try {
      const response = await fetch(`${API_URL}/api/invoices/?project_id=${selectedProject}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  }, [selectedProject]);

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projectId) {
      setSelectedProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedProject) {
      fetchBOQ();
      fetchInvoices();
    }
  }, [selectedProject, fetchInvoices]);

  // ============================================================
  // DEDUCTIONS
  // ============================================================
  const addDeduction = () => {
    setFormData({
      ...formData,
      deductions: [
        ...formData.deductions,
        { description: '', amount: 0, reason: 'retention' }
      ]
    });
  };

  const updateDeduction = (index, field, value) => {
    const deductions = [...formData.deductions];
    deductions[index][field] = value;
    
    const deduction_total = deductions.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    
    setFormData({
      ...formData,
      deductions,
      deduction_total,
      net_amount: safeNumber(formData.total_amount) - deduction_total
    });
  };

  const removeDeduction = (index) => {
    const deductions = formData.deductions.filter((_, i) => i !== index);
    const deduction_total = deductions.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    
    setFormData({
      ...formData,
      deductions,
      deduction_total,
      net_amount: safeNumber(formData.total_amount) - deduction_total
    });
  };

  // ============================================================
  // SUBMIT INVOICE
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    if (formData.items.length === 0) {
      alert('No Level 1 BOQ items with approved quantities. Please approve BOQ items first.');
      return;
    }

    setSubmitting(true);
    const token = getToken();

    try {
      const invoiceData = {
        project: parseInt(selectedProject),
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        client_name: formData.client_name || 'Unknown Client',
        client_address: formData.client_address || '',
        subtotal: safeNumber(formData.subtotal),
        vat_rate: VAT_RATE,
        vat_amount: safeNumber(formData.vat_amount),
        total_amount: safeNumber(formData.total_amount),
        deduction_total: safeNumber(formData.deduction_total),
        net_amount: safeNumber(formData.net_amount),
        notes: formData.notes || '',
        status: formData.status,
        items: formData.items.map(item => ({
          description: item.description,
          quantity: safeNumber(item.quantity),
          unit_price: safeNumber(item.unit_price),
          amount: safeNumber(item.amount)
        })),
        deductions: formData.deductions.map(d => ({
          description: d.description,
          amount: safeNumber(d.amount),
          reason: d.reason
        }))
      };

      console.log('Sending invoice data:', invoiceData);

      const response = await fetch(`${API_URL}/api/invoices/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(invoiceData),
      });

      const responseText = await response.text();
      console.log('Response:', response.status, responseText);

      if (!response.ok) {
        let errorMsg = 'Failed to create invoice';
        try {
          const errorData = JSON.parse(responseText);
          if (typeof errorData === 'object') {
            const errors = Object.entries(errorData)
              .map(([key, val]) => `${key}: ${val}`)
              .join(', ');
            errorMsg = errors || errorMsg;
          }
        } catch (e) {
          errorMsg = responseText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      alert('✅ Invoice created successfully!');
      fetchInvoices();
      // Reset form after successful creation
      setFormData({
        ...formData,
        status: 'draft',
        deductions: [],
        deduction_total: 0
      });
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert('❌ Failed to create invoice: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetchProjects();
    fetchBOQ();
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BOQ Summary Card */}
      {selectedProject && (
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Total Planned</div>
              <div className="text-lg font-bold text-gray-800">
                {formatCurrency(boqSummary.totalPlanned)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                Claimable
              </div>
              <div className="text-lg font-bold text-emerald-600">
                {formatCurrency(boqSummary.totalClaimable)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-blue-500" />
                Claimed
              </div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(boqSummary.totalClaimed)}
              </div>
              <div className="text-xs text-gray-400">
                {boqSummary.progress.toFixed(1)}% claimed
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-orange-500" />
                Remaining
              </div>
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(boqSummary.remaining)}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Invoice auto-generated from approved Level 1 BOQ quantities.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Project Selector */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-500" />
            Select Project
          </label>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
        
        <select
          className="w-full md:w-96 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Select a project...</option>
          {projects.length === 0 ? (
            <option value="" disabled>No projects available</option>
          ) : (
            projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))
          )}
        </select>
        
        {projects.length === 0 && !error && (
          <p className="text-sm text-gray-400 mt-2">No projects available. Create a project first.</p>
        )}
      </div>

      {/* Invoice Form */}
      {selectedProject && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-800">Generate Invoice</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="h-3 w-3" /> Auto-generated
              </span>
            </div>
          </div>
          
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label>
                  <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono">
                    {formData.invoice_number}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Invoice Date
                  </label>
                  <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    {formData.invoice_date ? new Date(formData.invoice_date).toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Due Date (30 days)
                  </label>
                  <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-blue-600">
                    {formData.due_date ? new Date(formData.due_date).toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">📄 Draft</option>
                    <option value="submitted">📤 Submit for Approval</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.status === 'draft' ? 'Draft invoices can still be edited' : 'Submitted invoices are locked for approval'}
                  </p>
                </div>
              </div>

              {/* Client Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> Client Name
                  </label>
                  <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    {formData.client_name || 'No client set'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Address</label>
                  <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    {formData.client_address || 'No address set'}
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Items (Claimable Amount)
                  <span className="text-xs text-gray-400 ml-2">
                    {formData.items.length} items | {formatCurrency(formData.subtotal)}
                  </span>
                </h4>

                <div className="space-y-2">
                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                      <p>No Level 1 BOQ items with approved quantities.</p>
                      <p className="text-xs mt-1">Please approve Level 1 BOQ items first.</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 text-xs font-medium text-gray-600">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2 text-right">Quantity</div>
                        <div className="col-span-2 text-right">Rate (R)</div>
                        <div className="col-span-3 text-right">Amount (R)</div>
                      </div>
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 hover:bg-gray-100 transition">
                          <div className="col-span-5 text-sm text-gray-700">{item.description}</div>
                          <div className="col-span-2 text-right text-sm font-medium">{item.quantity}</div>
                          <div className="col-span-2 text-right text-sm">R{item.unit_price.toFixed(2)}</div>
                          <div className="col-span-3 text-right text-sm font-bold text-emerald-600">{formatCurrency(item.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Deductions</h4>
                  <button
                    type="button"
                    onClick={addDeduction}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    Add Deduction
                  </button>
                </div>

                {formData.deductions.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-2">No deductions added</div>
                ) : (
                  <div className="space-y-2">
                    {formData.deductions.map((deduction, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-red-50 p-2 rounded-lg border border-red-100">
                        <div className="col-span-4">
                          <input
                            type="text"
                            className="w-full p-1.5 border border-red-200 rounded-lg text-sm bg-white"
                            placeholder="Description"
                            value={deduction.description}
                            onChange={(e) => updateDeduction(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            className="w-full p-1.5 border border-red-200 rounded-lg text-sm text-right bg-white"
                            placeholder="0.00"
                            value={deduction.amount}
                            onChange={(e) => updateDeduction(index, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            className="w-full p-1.5 border border-red-200 rounded-lg text-sm bg-white"
                            value={deduction.reason || 'retention'}
                            onChange={(e) => updateDeduction(index, 'reason', e.target.value)}
                          >
                            <option value="retention">Retention</option>
                            <option value="defects">Defects</option>
                            <option value="penalty">Penalty</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeDeduction(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4">
                <div className="space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal (Claimable):</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">VAT @ 15%:</span>
                    <span className="font-medium text-blue-600">+{formatCurrency(formData.vat_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span className="text-gray-500">Deductions:</span>
                    <span className="font-medium">-{formatCurrency(formData.deduction_total)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                    <span>Total Amount:</span>
                    <span className="text-orange-600">{formatCurrency(formData.net_amount)}</span>
                  </div>
                  <div className="text-right text-[10px] text-gray-400">
                    VAT Rate: {VAT_RATE}% | Valid for tax invoice
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                  rows="2"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || formData.items.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'Creating...' : formData.status === 'draft' ? 'Save Draft' : 'Submit Invoice'}
                </button>
              </div>
              {formData.items.length === 0 && (
                <p className="text-xs text-red-500 text-right">
                  ⚠️ No approved Level 1 BOQ items. Cannot generate invoice.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Existing Invoices */}
      {selectedProject && invoices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-800">Transaction History</h3>
              <span className="text-xs text-gray-400">{invoices.length} transactions</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {invoices.map(invoice => (
              <div key={invoice.id} className="p-3 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{invoice.invoice_number}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-800">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      {invoice.deduction_total > 0 && (
                        <div className="text-xs text-red-500">
                          -{formatCurrency(invoice.deduction_total)}
                        </div>
                      )}
                      {invoice.net_amount && (
                        <div className="text-xs font-bold text-emerald-600">
                          Net: {formatCurrency(invoice.net_amount)}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                      invoice.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      invoice.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {invoice.status === 'paid' && <CheckCircle className="h-3 w-3" />}
                      {invoice.status === 'submitted' && <Clock className="h-3 w-3" />}
                      {invoice.status || 'draft'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceGenerator;