
import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { StatusBadge } from '../components/StatusBadge';
import { Plan } from '../types';
import { SubmissionWizard } from './SubmissionWizard';
import { ClientResponseView } from './ClientResponseView';
import * as api from '../services/api';
import { usePolling } from '../hooks/usePolling';

interface ClientDashboardProps {
  onViewPlan: (plan: Plan) => void;
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${progress}%`;
    }
  }, [progress]);
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div
        ref={ref}
        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
      />
    </div>
  );
};

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onViewPlan }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingPlan, setRespondingPlan] = useState<Plan | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [viewingInvoicePlan, setViewingInvoicePlan] = useState<Plan | null>(null);
  const [invoiceBlobUrl, setInvoiceBlobUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

    const loadPlans = async () => {
        try {
            const data = await api.getPlans();
            const sorted = [...data].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setPlans(sorted);
        } catch (error) {
            console.error("Failed to load plans:", error);
        } finally {
            setLoading(false);
        }
    };

    usePolling(loadPlans, 10000);

  // Status Summary Logic
  const drafts = plans.filter(p => p.status === 'DRAFT').length;
  const actionRequired = plans.filter(p => p.status === 'CORRECTIONS_REQUIRED' || p.status === 'PROFORMA_ISSUED').length;
  const approved = plans.filter(p => p.status === 'APPROVED').length;
  const proformaPlans = plans.filter(p => p.status === 'PROFORMA_ISSUED');

  const handleViewInvoice = async (plan: Plan) => {
    setInvoiceLoading(true);
    setViewingInvoice(null);
    setViewingInvoicePlan(plan);
    setInvoiceBlobUrl(null);
    try {
      const invoices = await api.getProformaInvoicesForPlan(plan.id);
      const latest = invoices[0];
      if (!latest) { alert('No invoice found for this plan.'); setInvoiceLoading(false); return; }
      setViewingInvoice(latest);

      // Fetch PDF as blob so we bypass X-Frame-Options
      const token = api.getAccessToken();
      const res = await fetch(`/api/proforma-invoices/${latest.id}/download/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        setInvoiceBlobUrl(URL.createObjectURL(pdfBlob));
      }
    } catch (e: any) {
      alert(`Error loading invoice: ${e.message}`);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoice = () => {
    if (invoiceBlobUrl) URL.revokeObjectURL(invoiceBlobUrl);
    setViewingInvoice(null);
    setViewingInvoicePlan(null);
    setInvoiceBlobUrl(null);
  };

  const filteredPlans = filter
    ? plans.filter(p => {
      if (filter === 'DRAFT') return p.status === 'DRAFT';
      if (filter === 'ACTION') return p.status === 'CORRECTIONS_REQUIRED' || p.status === 'PROFORMA_ISSUED';
      if (filter === 'APPROVED') return p.status === 'APPROVED';
      return true;
    })
    : plans;
  if (showWizard) {
    return (
      <SubmissionWizard
        onCancel={() => setShowWizard(false)}
        onSuccess={() => {
          setShowWizard(false);
          loadPlans();
        }}
      />
    );
  }

  if (respondingPlan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ClientResponseView
          plan={respondingPlan}
          onCancel={() => setRespondingPlan(null)}
          onSuccess={() => {
            setRespondingPlan(null);
            loadPlans();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ── PROFORMA ALERT BANNER ─────────────────────────────────────── */}
      {proformaPlans.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 shadow-md animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white text-2xl shrink-0 shadow-lg">
              🧾
            </div>
            <div className="flex-1">
              <p className="font-black text-amber-900 text-sm uppercase tracking-widest mb-1">Payment Required</p>
              <p className="text-xs text-amber-800 font-medium leading-relaxed mb-4">
                A proforma invoice has been issued for {proformaPlans.length === 1 ? 'your application' : `${proformaPlans.length} applications`}. Please pay the indicated fees at the <strong>City Cashier's Office</strong> to proceed.
              </p>
              <div className="space-y-2">
                {proformaPlans.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-2xl border border-amber-200 px-5 py-3 shadow-sm">
                    <div>
                      <span className="text-xs font-black text-slate-700 uppercase">{p.plan_id}</span>
                      <span className="text-[10px] text-slate-400 ml-2">· {p.stand_addr}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleViewInvoice(p.id); }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      View Invoice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICE MODAL ───────────────────────────────────── */}
      {(viewingInvoice || invoiceLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center p-6 bg-[#003366] text-white">
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm">Proforma Invoice</h3>
                {viewingInvoice && <p className="text-xs text-blue-200 mt-0.5">#{viewingInvoice.invoice_number}</p>}
              </div>
              <button title="Close" onClick={closeInvoice} className="p-2 hover:bg-white/10 rounded-xl transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {invoiceLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-10 w-10 border-4 border-amber-400 border-t-transparent rounded-full"/>
              </div>
            ) : viewingInvoice && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Amount due */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#003366]/5 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total (ZWL)</p>
                    <p className="text-2xl font-black text-[#003366]">{Number(viewingInvoice.total_zwl ?? 0).toLocaleString('en-ZW', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total (USD)</p>
                    <p className="text-2xl font-black text-amber-600">{Number(viewingInvoice.total_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Cost breakdown */}
                {viewingInvoice.line_items?.length > 0 && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee Breakdown</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="text-left px-4 py-2 font-black text-slate-400 uppercase tracking-wider">Description</th>
                          <th className="text-right px-4 py-2 font-black text-slate-400 uppercase tracking-wider">ZWL</th>
                          <th className="text-right px-4 py-2 font-black text-slate-400 uppercase tracking-wider">USD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {viewingInvoice.line_items.map((item: any, idx: number) => (
                          <tr key={idx} className={item.is_rates_payment ? 'bg-amber-50/60' : ''}>
                            <td className="px-4 py-2.5 text-slate-700 font-medium">
                              {item.label}
                              {item.is_rates_payment && <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase">Rates</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-600">{Number(item.amount_zwl || 0).toLocaleString('en-ZW', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-600">{Number(item.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Payment methods */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="bg-slate-700 px-4 py-2.5">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Accepted Payment Methods</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {[
                      { icon: '🏦', name: 'City Cashier\'s Office', detail: 'P.O. Box 709, Bulawayo — Cash, RTGS, Swipe' },
                      { icon: '📱', name: 'EcoCash', detail: 'Dial *151# · Merchant: BCC Building · Quote invoice #' },
                      { icon: '💳', name: 'ZIPIT / FCA Transfer', detail: 'Transfer to BCC Treasury — Quote invoice number' },
                      { icon: '🌍', name: 'Mukuru / WorldRemit', detail: 'USD cross-border payments accepted' },
                    ].map(m => (
                      <div key={m.name} className="flex items-start gap-3 px-4 py-3">
                        <span className="text-xl mt-0.5">{m.icon}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{m.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {viewingInvoice.notes && !viewingInvoice.notes.startsWith('__REQUIRED_DOCS__') && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">{viewingInvoice.notes.replace(/^__REQUIRED_DOCS__:\[.*?\]\n\n/, '')}</p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-1">

                  {/* Primary: submit docs after payment */}
                  <button
                    onClick={() => { closeInvoice(); if (viewingInvoicePlan) setRespondingPlan(viewingInvoicePlan); }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    I've Paid — Submit Documents Now
                  </button>

                  <div className="flex gap-3">
                    {invoiceBlobUrl && (
                      <>
                        <button
                          onClick={() => window.open(invoiceBlobUrl, '_blank')}
                          className="flex-1 py-3 bg-[#003366] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-lg flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          View PDF
                        </button>
                        <a
                          href={invoiceBlobUrl}
                          download={`proforma-${viewingInvoice?.invoice_number ?? 'invoice'}.pdf`}
                          className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition shadow-lg flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          Download
                        </a>
                      </>
                    )}
                    <button
                      onClick={closeInvoice}
                      className="py-3 px-5 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-400 hover:bg-slate-50 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-[#003366] tracking-tight">My Building Plans</h1>
          <p className="text-sm font-medium mt-1 text-slate-500">Easily manage your applications.</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="relative z-10 bg-[#003366] text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-black transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 group text-sm"
        >
          <span className="text-lg group-hover:rotate-90 transition-transform duration-300">+</span>
          Start New Application
        </button>
      </div>

      {/* 2. Interactive KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'DRAFT' ? null : 'DRAFT')}
          className={`text-left transition-all duration-300 p-6 rounded-3xl border flex flex-col group ${filter === 'DRAFT' ? 'bg-[#003366] border-[#003366] shadow-lg text-white scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md text-slate-800'}`}        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors ${filter === 'DRAFT' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <span className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${filter === 'DRAFT' ? 'text-blue-200' : 'text-slate-400'}`}>Not Submitted</span>
          <span className="text-3xl font-black tabular-nums tracking-tighter">{drafts}</span>
        </button>

        <button
          onClick={() => setFilter(filter === 'ACTION' ? null : 'ACTION')}
          className={`text-left transition-all duration-300 p-6 rounded-3xl border flex flex-col group ${filter === 'ACTION' ? 'bg-amber-600 border-amber-600 shadow-lg text-white scale-[1.02]' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-md text-slate-800'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors ${filter === 'ACTION' ? 'bg-white/10 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${filter === 'ACTION' ? 'text-amber-200' : 'text-slate-400'}`}>Needs Attention</span>
          <span className="text-3xl font-black tabular-nums tracking-tighter">{actionRequired}</span>
        </button>

        <button
          onClick={() => setFilter(filter === 'APPROVED' ? null : 'APPROVED')}
          className={`text-left transition-all duration-300 p-6 rounded-3xl border flex flex-col group ${filter === 'APPROVED' ? 'bg-green-600 border-green-600 shadow-lg text-white scale-[1.02]' : 'bg-white border-slate-100 hover:border-green-200 hover:shadow-md text-slate-800'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors ${filter === 'APPROVED' ? 'bg-white/10 text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${filter === 'APPROVED' ? 'text-green-200' : 'text-slate-400'}`}>Approved Plans</span>
          <span className="text-3xl font-black tabular-nums tracking-tighter">{approved}</span>
        </button>
      </div>

      {/* 3. The Interactive Data Grid / List */}
      <div>
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-xl font-black text-[#003366] flex items-center gap-3">
            {filter ? `Filtered Applications (${filter})` : 'My Recent Applications'}
            <span className="font-medium text-slate-300 text-sm">/ {filteredPlans.length} Total</span>
          </h2>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest border-b-2 border-blue-600/20 pb-0.5"
            >
              Clear Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className={`group bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-500 flex flex-col
                  ${plan.status === 'PROFORMA_ISSUED' ? 'border-amber-300 ring-2 ring-amber-200' : 'border-slate-100 cursor-pointer hover:translate-y-[-4px]'}`}
                onClick={() => {
                  if (plan.status !== 'PROFORMA_ISSUED') onViewPlan(plan);
                }}
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-slate-50 px-3 py-1 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      #{plan.plan_id.split('-').pop()}
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>

                  <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors uppercase leading-tight">
                    {plan.stand_addr.split(',')[0]}
                    <span className="block text-xs font-medium text-slate-400 capitalize mt-1 italic">{plan.stand_addr.split(',')[1] || 'Main District'}</span>
                  </h3>

                  <div className="flex items-center gap-2 mb-8 mt-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">{plan.category}</span>
                    <div className="h-1 w-1 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Submission v1</span>
                  </div>

                  {/* Micro-Stepper Visual */}
                  <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-2">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Process flow</span>
                      <span className="text-[11px] font-black text-slate-800 tracking-tighter">{plan.progress ?? 0}%</span>
                    </div>
                    <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-[#003366] rounded-full transition-all duration-1000" style={{ width: `${plan.progress ?? 0}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.05em]">
                      <span className={plan.progress >= 20 ? 'text-blue-600' : ''}>Reception</span>
                      <span className={plan.progress >= 60 ? 'text-blue-600' : ''}>Review</span>
                      <span className={plan.progress >= 90 ? 'text-blue-600' : ''}>Seal</span>
                    </div>
                  </div>
                </div>

                {/* Card footer — two actions for PROFORMA, single arrow otherwise */}
                {plan.status === 'PROFORMA_ISSUED' ? (
                  <div className="px-5 py-4 bg-amber-50/60 border-t border-amber-100 flex gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleViewInvoice(plan); }}
                      className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-white border border-amber-200 rounded-xl hover:bg-amber-50 transition"
                    >
                      🧾 View Invoice
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setRespondingPlan(plan); }}
                      className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm"
                    >
                      ✓ Submit Docs
                    </button>
                  </div>
                ) : (
                  <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center group-hover:bg-slate-50/80 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Last Update</span>
                      <span className="text-xs font-black text-slate-600 leading-none">{plan.lastUpdate}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-[#003366] group-hover:text-white group-hover:border-[#003366] transition-all shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredPlans.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="text-4xl mb-3 opacity-20 flex justify-center text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest">No plans found in this category</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium italic">Try clearing your filters or starting a new application.</p>
                <button
                  onClick={() => setFilter(null)}
                  className="mt-6 text-blue-600 font-black text-xs uppercase tracking-widest"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
