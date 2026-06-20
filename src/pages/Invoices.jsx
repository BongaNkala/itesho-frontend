const API_URL = 'http://127.0.0.1:8000';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DollarSign, 
  Plus, 
  Download, 
  Eye, 
  Send, 
  Printer,
  Search,
  Calendar,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  TrendingUp,
  RefreshCw,
  Lock,
  TrendingDown,
  User,
  Save,
  FileDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const invoicePreviewRef = useRef(null);

  const [boqSummary, setBoqSummary] = useState({
    totalPlanned: 0,
    totalClaimable: 0,
    totalClaimed: 0,
    remaining: 0,
    progress: 0,
    claimableItems: []
  });

  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    client_name: '',
    client_address: '',
    items: [],
    subtotal: 0,
    vat_rate: 15,
    vat_amount: 0,
    total_amount: 0,
    net_amount: 0,
    notes: '',
    status: 'draft',
    deductions: [],
    deduction_total: 0
  });

  const getToken = () => localStorage.getItem('access_token');

  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (amount) => {
    const num = safeNumber(amount);
    return `R${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const generateInvoiceNumber = useCallback(() => {
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
  }, [selectedProject, projects, invoices]);

  const calculateDueDate = (invoiceDate) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const calculateBOQTotals = (items) => {
    let totalPlanned = 0;
    let totalClaimable = 0;
    let claimableItems = [];
    
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
              unit: item.unit
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
    
    return {
      totalPlanned,
      totalClaimable,
      totalClaimed: claimedAmount,
      remaining: totalClaimable - claimedAmount,
      progress: totalClaimable > 0 ? (claimedAmount / totalClaimable) * 100 : 0,
      claimableItems
    };
  };

  const fetchProjects = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/invoices/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBOQ = useCallback(async () => {
    if (!selectedProject) return;
    const token = getToken();
    if (!token) return;
    try {
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
      const vatAmount = subtotal * 0.15;
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
        vat_rate: 15,
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
    }
  }, [selectedProject, projects, invoices, generateInvoiceNumber]);

  useEffect(() => {
    fetchProjects();
    fetchInvoices();
  }, [fetchProjects, fetchInvoices]);

  useEffect(() => {
    if (selectedProject) {
      fetchBOQ();
    }
  }, [selectedProject, fetchBOQ]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }
    if (formData.items.length === 0) {
      alert('No Level 1 BOQ items with approved quantities.');
      return;
    }
    const token = getToken();
    try {
      const invoiceData = {
        project: parseInt(selectedProject),
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        client_name: formData.client_name || 'Unknown Client',
        client_address: formData.client_address || '',
        subtotal: safeNumber(formData.subtotal),
        vat_rate: 15,
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
      const response = await fetch(`${API_URL}/api/invoices/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(invoiceData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create invoice');
      }
      alert('✅ Invoice created successfully!');
      setShowGenerateModal(false);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert('❌ Failed to create invoice: ' + err.message);
    }
  };

  const updateInvoiceStatus = async (id, status) => {
    const token = getToken();
    try {
      const response = await fetch(`${API_URL}/api/invoices/${id}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        fetchInvoices();
        alert(`✅ Invoice ${status} successfully`);
      }
    } catch (err) {
      console.error('Failed to update invoice:', err);
      alert('❌ Failed to update invoice');
    }
  };

  const deleteInvoice = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    const token = getToken();
    try {
      const response = await fetch(`${API_URL}/api/invoices/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchInvoices();
        alert('✅ Invoice deleted successfully');
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      alert('❌ Failed to delete invoice');
    }
  };

  const viewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreviewModal(true);
  };

  // ============================================================
  // DOWNLOAD PDF - FIXED FOR OKLCH ERROR WITH SAFE HTML APPROACH
  // ============================================================
  const downloadPDF = async () => {
    if (!selectedInvoice) {
      alert('No invoice selected');
      return;
    }

    setPdfGenerating(true);

    try {
      // Build safe HTML for PDF - no oklch colors
      const safeHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff; color: #000000;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px;">
            <div>
              <h1 style="color: #f97316; font-size: 28px; margin: 0;">ITesho</h1>
              <p style="color: #6b7280; margin: 5px 0 0; font-size: 14px;">Construction Project Management</p>
              <p style="color: #6b7280; margin: 5px 0 0; font-size: 14px;">Invoice #: ${selectedInvoice.invoice_number}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">Date: ${selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : '-'}</p>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">Due Date: ${selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</p>
              <p style="color: #374151; margin: 5px 0 0; font-size: 14px; font-weight: bold;">Status: ${selectedInvoice.status?.toUpperCase() || 'DRAFT'}</p>
            </div>
          </div>

          <!-- Client -->
          <div style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
            <h3 style="color: #374151; font-size: 14px; margin: 0;">Bill To:</h3>
            <p style="color: #1f2937; font-size: 18px; margin: 5px 0 0; font-weight: 500;">${selectedInvoice.client_name || 'N/A'}</p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">${selectedInvoice.client_address || ''}</p>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <th style="text-align: left; padding: 8px 0; color: #4b5563; font-size: 13px; font-weight: 600;">Description</th>
                <th style="text-align: right; padding: 8px 0; color: #4b5563; font-size: 13px; font-weight: 600;">Qty</th>
                <th style="text-align: right; padding: 8px 0; color: #4b5563; font-size: 13px; font-weight: 600;">Rate (R)</th>
                <th style="text-align: right; padding: 8px 0; color: #4b5563; font-size: 13px; font-weight: 600;">Amount (R)</th>
              </tr>
            </thead>
            <tbody>
              ${selectedInvoice.items?.map(item => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 8px 0; color: #374151; font-size: 13px;">${item.description}</td>
                  <td style="text-align: right; padding: 8px 0; color: #374151; font-size: 13px;">${item.quantity}</td>
                  <td style="text-align: right; padding: 8px 0; color: #374151; font-size: 13px;">${Number(item.unit_price).toFixed(2)}</td>
                  <td style="text-align: right; padding: 8px 0; color: #374151; font-size: 13px; font-weight: 500;">${Number(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <div style="max-width: 280px; margin-left: auto;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #6b7280;">Subtotal:</span>
                <span>${Number(selectedInvoice.subtotal).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #6b7280;">VAT (15%):</span>
                <span>${Number(selectedInvoice.vat_amount).toFixed(2)}</span>
              </div>
              ${selectedInvoice.deductions && selectedInvoice.deductions.length > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; color: #dc2626;">
                  <span style="color: #6b7280;">Deductions:</span>
                  <span>-${Number(selectedInvoice.deduction_total).toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 1px solid #e5e7eb; padding-top: 10px;">
                <span>Total:</span>
                <span style="color: #f97316;">${Number(selectedInvoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${selectedInvoice.notes ? `
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <p style="color: #4b5563; font-size: 13px; margin: 0;">${selectedInvoice.notes}</p>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">Thank you for your business!</p>
            <p style="color: #d1d5db; font-size: 11px; margin: 5px 0 0;">ITesho Construction Project Management</p>
          </div>
        </div>
      `;

      // Create a temporary container with safe HTML
      const container = document.createElement('div');
      container.innerHTML = safeHtml;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.background = '#ffffff';
      container.style.width = '794px'; // A4 width in pixels
      container.style.padding = '20px';
      document.body.appendChild(container);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture with html2canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: 794,
        height: container.scrollHeight,
        windowWidth: 794,
      });

      // Remove container
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${selectedInvoice.invoice_number || 'ITesho'}.pdf`);

      console.log('PDF downloaded successfully');

    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to download PDF: ' + error.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  // ============================================================
  // PRINT INVOICE - UPDATED WITH SAFE HTML
  // ============================================================
  const printInvoice = () => {
    if (!selectedInvoice) {
      alert('No invoice selected');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the invoice.');
      return;
    }

    const printHtml = `
      <html>
        <head>
          <title>Invoice ${selectedInvoice.invoice_number || 'ITesho'}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 40px; background: #ffffff; color: #000000; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
            .brand { color: #f97316; font-size: 28px; font-weight: bold; margin: 0; }
            .subtitle { color: #6b7280; font-size: 14px; margin: 5px 0 0; }
            .client { padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
            .client-name { font-size: 18px; font-weight: 500; margin: 5px 0 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { text-align: left; padding: 8px 0; color: #4b5563; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
            td { padding: 8px 0; color: #374151; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
            .text-right { text-align: right; }
            .totals { border-top: 1px solid #e5e7eb; padding-top: 15px; max-width: 280px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
            .grand-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            .grand-total-amount { color: #f97316; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div>
                <h1 class="brand">ITesho</h1>
                <p class="subtitle">Construction Project Management</p>
                <p class="subtitle">Invoice #: ${selectedInvoice.invoice_number}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Date: ${selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : '-'}</p>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Due Date: ${selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</p>
                <p style="color: #374151; margin: 5px 0 0; font-size: 14px; font-weight: bold;">Status: ${selectedInvoice.status?.toUpperCase() || 'DRAFT'}</p>
              </div>
            </div>

            <!-- Client -->
            <div class="client">
              <h3 style="color: #374151; font-size: 14px; margin: 0;">Bill To:</h3>
              <p class="client-name">${selectedInvoice.client_name || 'N/A'}</p>
              <p style="color: #6b7280; margin: 0;">${selectedInvoice.client_address || ''}</p>
            </div>

            <!-- Items -->
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Rate (R)</th>
                  <th class="text-right">Amount (R)</th>
                </tr>
              </thead>
              <tbody>
                ${selectedInvoice.items?.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${Number(item.unit_price).toFixed(2)}</td>
                    <td class="text-right">${Number(item.amount).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span style="color: #6b7280;">Subtotal:</span>
                <span>${Number(selectedInvoice.subtotal).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span style="color: #6b7280;">VAT (15%):</span>
                <span>${Number(selectedInvoice.vat_amount).toFixed(2)}</span>
              </div>
              ${selectedInvoice.deductions && selectedInvoice.deductions.length > 0 ? `
                <div class="total-row" style="color: #dc2626;">
                  <span style="color: #6b7280;">Deductions:</span>
                  <span>-${Number(selectedInvoice.deduction_total).toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="grand-total">
                <span>Total:</span>
                <span class="grand-total-amount">${Number(selectedInvoice.total_amount).toFixed(2)}</span>
              </div>
            </div>

            ${selectedInvoice.notes ? `
              <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <p style="color: #4b5563; font-size: 13px; margin: 0;">${selectedInvoice.notes}</p>
              </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="margin: 5px 0 0; color: #d1d5db;">ITesho Construction Project Management</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const getStatusBadge = (status) => {
    const config = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Paid' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send, label: 'Sent' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Overdue' },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Draft' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Submitted' },
    };
    const cfg = config[status] || config.draft;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </span>
    );
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.invoice_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (inv.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoices = invoices.length;
  const pendingCount = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const totalValue = invoices.reduce((sum, i) => sum + safeNumber(i.total_amount), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + safeNumber(i.total_amount), 0);
  const totalPending = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + safeNumber(i.total_amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-800">Invoice & Financial Management</h1>
          </div>
          <p className="text-sm text-gray-500">Manage invoices, track payments, and generate bills</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { fetchInvoices(); fetchBOQ(); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setShowGenerateModal(true)} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 transition flex items-center gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Invoices</p><p className="text-2xl font-bold text-gray-800">{totalInvoices}</p></div>
            <div className="p-2 bg-orange-100 rounded-lg"><FileText className="h-5 w-5 text-orange-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Pending Payment</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></div>
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-5 w-5 text-yellow-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Paid</p><p className="text-2xl font-bold text-green-600">{paidCount}</p></div>
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Value</p><p className="text-2xl font-bold text-gray-800">{formatCurrency(totalValue)}</p></div>
            <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>Paid: {formatCurrency(totalPaid)}</span>
            <span>Pending: {formatCurrency(totalPending)}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search invoices..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* INVOICES TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No invoices found</p>
                    <button onClick={() => setShowGenerateModal(true)} className="mt-3 text-orange-500 hover:text-orange-600 text-sm">Create your first invoice →</button>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition group">
                    <td className="p-3 font-medium text-gray-800 text-sm">{inv.invoice_number}</td>
                    <td className="p-3 text-gray-600 text-sm">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</td>
                    <td className="p-3 text-gray-600 text-sm">{inv.client_name || '-'}</td>
                    <td className="p-3 text-right font-semibold text-gray-800">{formatCurrency(inv.total_amount)}</td>
                    <td className="p-3 text-center">{getStatusBadge(inv.status)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition">
                        <button onClick={() => viewInvoice(inv)} className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition" title="View"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => { setSelectedInvoice(inv); setTimeout(() => downloadPDF(), 300); }} className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition" title="Download PDF" disabled={pdfGenerating}>
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setSelectedInvoice(inv); setTimeout(() => printInvoice(), 300); }} className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition" title="Print"><Printer className="h-4 w-4" /></button>
                        {inv.status === 'draft' && <button onClick={() => updateInvoiceStatus(inv.id, 'sent')} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition" title="Send"><Send className="h-4 w-4" /></button>}
                        {inv.status === 'sent' && <button onClick={() => updateInvoiceStatus(inv.id, 'paid')} className="p-1.5 text-gray-400 hover:text-green-500 rounded-lg hover:bg-green-50 transition" title="Mark Paid"><CheckCircle className="h-4 w-4" /></button>}
                        {(inv.status === 'draft' || inv.status === 'sent') && <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition" title="Delete"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE INVOICE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Generate Invoice</h2>
                <p className="text-sm text-gray-500">Auto-generated from approved Level 1 BOQ quantities</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                ✕
              </button>
            </div>

            {/* BOQ Summary */}
            {selectedProject && (
              <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><div className="text-xs text-gray-500">Total Planned</div><div className="text-lg font-bold text-gray-800">{formatCurrency(boqSummary.totalPlanned)}</div></div>
                  <div><div className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" />Claimable</div><div className="text-lg font-bold text-emerald-600">{formatCurrency(boqSummary.totalClaimable)}</div></div>
                  <div><div className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle className="h-3 w-3 text-blue-500" />Claimed</div><div className="text-lg font-bold text-blue-600">{formatCurrency(boqSummary.totalClaimed)}</div><div className="text-xs text-gray-400">{boqSummary.progress.toFixed(1)}% claimed</div></div>
                  <div><div className="text-xs text-gray-500 flex items-center gap-1"><TrendingDown className="h-3 w-3 text-orange-500" />Remaining</div><div className="text-lg font-bold text-orange-600">{formatCurrency(boqSummary.remaining)}</div></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Lock className="h-3 w-3" />Invoice auto-generated from approved Level 1 BOQ quantities.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-500" />Select Project</label>
                <select className="w-full md:w-96 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="">Select a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label><div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono">{formData.invoice_number || 'Auto-generated'}</div></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Invoice Date</label><div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">{formData.invoice_date ? new Date(formData.invoice_date).toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</div></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Due Date (30 days)</label><div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-blue-600">{formData.due_date ? new Date(formData.due_date).toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</div></div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="draft">📄 Draft</option>
                    <option value="submitted">📤 Submit for Approval</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">{formData.status === 'draft' ? 'Draft invoices can still be edited' : 'Submitted invoices are locked for approval'}</p>
                </div>
              </div>

              {/* Client Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><User className="h-3 w-3" />Client Name</label><div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">{formData.client_name || 'No client set'}</div></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Client Address</label><div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">{formData.client_address || 'No address set'}</div></div>
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Items (Claimable Amount) <span className="text-xs text-gray-400 ml-2">{formData.items.length} items | {formatCurrency(formData.subtotal)}</span></h4>
                <div className="space-y-2">
                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg"><p>No Level 1 BOQ items with approved quantities.</p><p className="text-xs mt-1">Please approve Level 1 BOQ items first.</p></div>
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
                  <button type="button" onClick={addDeduction} className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">Add Deduction</button>
                </div>
                {formData.deductions.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-2">No deductions added</div>
                ) : (
                  <div className="space-y-2">
                    {formData.deductions.map((deduction, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-red-50 p-2 rounded-lg border border-red-100">
                        <div className="col-span-4"><input type="text" className="w-full p-1.5 border border-red-200 rounded-lg text-sm bg-white" placeholder="Description" value={deduction.description} onChange={(e) => updateDeduction(index, 'description', e.target.value)} /></div>
                        <div className="col-span-3"><input type="number" className="w-full p-1.5 border border-red-200 rounded-lg text-sm text-right bg-white" placeholder="0.00" value={deduction.amount} onChange={(e) => updateDeduction(index, 'amount', parseFloat(e.target.value) || 0)} /></div>
                        <div className="col-span-3"><select className="w-full p-1.5 border border-red-200 rounded-lg text-sm bg-white" value={deduction.reason || 'retention'} onChange={(e) => updateDeduction(index, 'reason', e.target.value)}><option value="retention">Retention</option><option value="defects">Defects</option><option value="penalty">Penalty</option><option value="other">Other</option></select></div>
                        <div className="col-span-2 text-right"><button type="button" onClick={() => removeDeduction(index)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition">✕</button></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4">
                <div className="space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal (Claimable):</span><span className="font-medium">{formatCurrency(formData.subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">VAT @ 15%:</span><span className="font-medium text-blue-600">+{formatCurrency(formData.vat_amount)}</span></div>
                  <div className="flex justify-between text-sm text-red-600"><span className="text-gray-500">Deductions:</span><span className="font-medium">-{formatCurrency(formData.deduction_total)}</span></div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2"><span>Total Amount:</span><span className="text-orange-600">{formatCurrency(formData.net_amount)}</span></div>
                  <div className="text-right text-[10px] text-gray-400">VAT Rate: 15% | Valid for tax invoice</div>
                </div>
              </div>

              {/* Notes */}
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea className="w-full p-2 border border-gray-200 rounded-lg text-sm" rows="2" placeholder="Additional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"><Save className="h-4 w-4" />{formData.status === 'draft' ? 'Save Draft' : 'Submit Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE PREVIEW MODAL - Uses the ref for the original preview */}
      {showPreviewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center rounded-t-xl z-10">
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-orange-500" /><h2 className="text-lg font-bold text-gray-800">Invoice Preview</h2></div>
              <div className="flex items-center gap-2">
                <button onClick={downloadPDF} disabled={pdfGenerating} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm disabled:opacity-50">
                  {pdfGenerating ? 'Generating...' : <><FileDown className="h-4 w-4" /> Download PDF</>}
                </button>
                <button onClick={printInvoice} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"><Printer className="h-4 w-4" /> Print</button>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">✕</button>
              </div>
            </div>
            
            <div className="p-8 bg-white">
              <div ref={invoicePreviewRef} className="max-w-3xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-orange-600">ITesho</h1>
                    <p className="text-sm text-gray-500">Construction Project Management</p>
                    <p className="text-sm text-gray-500 mt-1">Invoice #: {selectedInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Date: {selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
                    <div className="text-sm text-gray-500">Due Date: {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
                    <div className="text-sm font-medium text-gray-700 mt-1">Status: {selectedInvoice.status?.toUpperCase() || 'DRAFT'}</div>
                  </div>
                </div>

                {/* Client */}
                <div className="py-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Bill To:</h3>
                  <p className="text-lg font-medium text-gray-800">{selectedInvoice.client_name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.client_address || ''}</p>
                </div>

                {/* Items */}
                <div className="py-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-semibold text-gray-600">Description</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-600">Qty</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-600">Rate (R)</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-600">Amount (R)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 text-sm text-gray-700">{item.description}</td>
                          <td className="py-2 text-sm text-right text-gray-700">{item.quantity}</td>
                          <td className="py-2 text-sm text-right text-gray-700">{safeNumber(item.unit_price).toFixed(2)}</td>
                          <td className="py-2 text-sm text-right font-medium text-gray-800">{safeNumber(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="max-w-xs ml-auto space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal:</span><span>{safeNumber(selectedInvoice.subtotal).toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">VAT (15%):</span><span>{safeNumber(selectedInvoice.vat_amount).toFixed(2)}</span></div>
                    {selectedInvoice.deductions && selectedInvoice.deductions.length > 0 && <div className="flex justify-between text-sm text-red-600"><span className="text-gray-500">Deductions:</span><span>-{safeNumber(selectedInvoice.deduction_total).toFixed(2)}</span></div>}
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2"><span>Total:</span><span className="text-orange-600">{safeNumber(selectedInvoice.total_amount).toFixed(2)}</span></div>
                    <div className="text-right text-xs text-gray-400">VAT Registration No: VAT-REG-12345</div>
                  </div>
                </div>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600">{selectedInvoice.notes}</p></div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-400">Thank you for your business!</p>
                  <p className="text-xs text-gray-300">ITesho Construction Project Management</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;