
import React, { useState, useEffect } from 'react';
import { Plan, UserProfile } from '../types';
import * as api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ProformaGenerator, ProformaInvoiceView } from './ProformaInvoice';

interface ReceptionGatewayProps {
    user: UserProfile;
}

type QueueTab = 'pre_screen' | 'proforma' | 'doc_verify';

// Static compliance checklist
const COMPLIANCE_CHECKS = [
    { id: 'rates', label: 'Property Rates & Water Account (Good Standing)', active: true },
    { id: 'lease', label: 'Lease Arrears (Current or N/A)', active: true },
    { id: 'fees',  label: 'Plan Submission/Scrutiny Fee (Receipt Verified)', active: true },
    { id: 'penalties', label: 'Regularisation Penalties (If applicable)', active: true },
];

export const ReceptionGateway: React.FC<ReceptionGatewayProps> = ({ user }) => {
    const [plans,          setPlans]          = useState<Plan[]>([]);
    const [proformaPlans,  setProformaPlans]  = useState<Plan[]>([]);
    const [docVerifyPlans, setDocVerifyPlans] = useState<Plan[]>([]);
    const [loading,        setLoading]        = useState(false);
    const [selectedPlan,   setSelectedPlan]   = useState<Plan | null>(null);
    const [checklist,      setChecklist]      = useState<Record<string, boolean>>({});
    const [queueTab,       setQueueTab]       = useState<QueueTab>('pre_screen');

    // UI State
    const [sidebarOpen,          setSidebarOpen]          = useState(true);
    const [activeTab,            setActiveTab]            = useState<'overview' | 'compliance'>('overview');
    const [showReceiptModal,      setShowReceiptModal]     = useState(false);
    const [showRejectModal,       setShowRejectModal]      = useState(false);
    const [rejectReason,         setRejectReason]         = useState('');
    const [showProformaGenerator, setShowProformaGenerator] = useState(false);
    const [showPaymentModal,      setShowPaymentModal]    = useState(false);
    const [receiptNumber,        setReceiptNumber]        = useState('');
    const [paymentDate,          setPaymentDate]          = useState('');
    const [invoiceId,            setInvoiceId]            = useState<number | null>(null);
    const [proformaSubmitting,   setProformaSubmitting]   = useState(false);
    const [viewProforma,         setViewProforma]         = useState<any | null>(null);

    useEffect(() => {
        setLoading(true);
        loadPlans();
    }, []);

    const loadPlans = () => {
        api.getPlans().then(data => {
            // Sort by latest first (created_at descending)
            const sorted = [...data].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setPlans(sorted.filter((p: any) => ['SUBMITTED', 'PRE_SCREENING', 'PRELIMINARY_SUBMITTED'].includes(p.status)));
            setProformaPlans(sorted.filter((p: any) => p.status === 'PROFORMA_ISSUED'));
            setDocVerifyPlans(sorted.filter((p: any) => p.status === 'PAID'));
            setLoading(false);
        });
    };

    const handlePreScreen = async (approved: boolean) => {
        if (!selectedPlan) return;
        try {
            if (approved) {
                await api.submitToReview(selectedPlan.id);
                alert(`Plan ${selectedPlan.plan_id} has been passed to the Review Pool.`);
            } else {
                if (rejectReason.trim().length < 10) {
                    alert('Rejection reason must be at least 10 characters.');
                    return;
                }
                await api.rejectPreScreen(selectedPlan.id, rejectReason);
                alert(`Plan ${selectedPlan.plan_id} returned for corrections.`);
                setShowRejectModal(false);
                setRejectReason('');
            }
            setSelectedPlan(null);
            setChecklist({});
            setActiveTab('overview');
            loadPlans();
        } catch (error: any) {
            console.error('Action failed:', error);
            alert(`Operation Failed: ${error.message || 'Check console'}`);
        }
    };

    const handleIssueProforma = async (lineItems: any[], payload: { notes: string; reception_contacts: string; rates_comment: string }) => {
        if (!selectedPlan) return;
        setProformaSubmitting(true);
        try {
            const invoice = await api.createProformaInvoice(selectedPlan.id, lineItems, payload);
            setViewProforma(invoice);
            setShowProformaGenerator(false);
            loadPlans();
        } catch (e: any) {
            alert(`Error issuing proforma: ${e.message}`);
        } finally {
            setProformaSubmitting(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!invoiceId || !receiptNumber.trim() || !paymentDate) {
            alert('Receipt number and payment date are required.');
            return;
        }
        setProformaSubmitting(true);
        try {
            await api.confirmPayment(invoiceId, {
                receipt_number: receiptNumber,
                payment_date:   paymentDate,
            });
            alert('Payment confirmed! Plan advanced to document verification.');
            setShowPaymentModal(false);
            setReceiptNumber('');
            setPaymentDate('');
            setInvoiceId(null);
            setSelectedPlan(null);
            loadPlans();
        } catch (e: any) {
            alert(`Error confirming payment: ${e.message}`);
        } finally {
            setProformaSubmitting(false);
        }
    };

    const toggleCheck = (id: string) => {
        setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const allChecksPassed = COMPLIANCE_CHECKS.every(c => checklist[c.id]);

    // Active queue list for the sidebar
    const activePlans = queueTab === 'pre_screen' ? plans
                      : queueTab === 'proforma'   ? proformaPlans
                      : docVerifyPlans;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center bg-white border-b border-slate-200 px-4 py-3 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title="Toggle Sidebar"
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 leading-tight">Reception Gateway</h1>
                        <p className="text-xs text-slate-500">Validation Workspace</p>
                    </div>
                </div>
                {/* Queue Tabs */}
                <nav className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    {(['pre_screen', 'proforma', 'doc_verify'] as QueueTab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => { setQueueTab(t); setSelectedPlan(null); }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                queueTab === t ? 'bg-white text-[#003366] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {t === 'pre_screen' ? `Pre-Screen (${plans.length})` :
                             t === 'proforma'   ? `Proforma (${proformaPlans.length})` :
                                                 `Doc Verify (${docVerifyPlans.length})`}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'w-full md:w-80 border-r' : 'w-0 border-r-0'} bg-white border-slate-200 overflow-y-auto transition-all duration-300 absolute md:relative z-10 h-full shadow-lg md:shadow-none`}>
                    <div className="sticky top-0 bg-slate-50/95 backdrop-blur px-4 py-2 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {queueTab === 'pre_screen' ? 'Pre-Screening Queue' :
                         queueTab === 'proforma'   ? 'Proforma / Payment Queue' : 'Document Verification'}
                    </div>
                    <div>
                        {loading ? (
                            <p className="p-4 text-slate-400 text-sm">Loading queue...</p>
                        ) : activePlans.length === 0 ? (
                            <p className="p-8 text-center text-slate-400 text-sm">No pending plans.</p>
                        ) : (
                            activePlans.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => {
                                        setSelectedPlan(plan);
                                        setChecklist({});
                                        setActiveTab('overview');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors group relative
                                        ${selectedPlan?.id === plan.id ? 'bg-blue-50 border-l-4 border-l-[#003366]' : 'border-l-4 border-l-transparent text-slate-600'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold text-sm ${selectedPlan?.id === plan.id ? 'text-[#003366]' : 'text-slate-700'}`}>{plan.plan_id}</span>
                                        <StatusBadge status={plan.status} />
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1 truncate">{(plan as any).stand_addr || ''}</p>
                                    <p className="text-xs text-slate-400 truncate">{(plan as any).client_name || ''}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
                    {selectedPlan ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Unified Workspace Header */}
                            <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0 shadow-sm shrink-0">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedPlan.plan_id}</h2>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-mono">
                                                {selectedPlan.category}
                                            </span>
                                            <StatusBadge status={selectedPlan.status} />
                                        </div>
                                        <p className="text-slate-600 font-medium">{selectedPlan.stand_addr}</p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Submitted By</p>
                                        <p className="font-bold text-[#003366] text-lg">{(selectedPlan as any).client_name}</p>
                                    </div>
                                </div>

                                {/* Common Tabs */}
                                <div className="flex gap-8">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`pb-4 text-sm font-bold border-b-2 transition-all uppercase tracking-wider ${activeTab === 'overview' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Overview & Documents
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('compliance')}
                                        className={`pb-4 text-sm font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-2 ${activeTab === 'compliance' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Financial Compliance
                                        {!allChecksPassed && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Workspace Content */}
                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                                {activeTab === 'overview' && (
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        {/* Contextual Status Alerts */}
                                        {selectedPlan.status === 'PRELIMINARY_SUBMITTED' && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-blue-800 shadow-sm animate-fade-in">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl shrink-0">📄</div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-tight mb-1">Preliminary Submission Recieved</p>
                                                    <p className="text-sm opacity-80 leading-relaxed italic">Review the floor plans and location details below. Once satisfied, perform the compliance check and issue a proforma invoice.</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedPlan.status === 'PROFORMA_ISSUED' && (
                                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4 text-amber-800 shadow-sm animate-fade-in">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl shrink-0">⌛</div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-tight mb-1">Awaiting Fee Payment</p>
                                                    <p className="text-sm opacity-80 leading-relaxed italic">The applicant has received their proforma. Verify the physical receipt before confirming payment.</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedPlan.status === 'PAID' && (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4 text-emerald-800 shadow-sm animate-fade-in">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl shrink-0">✅</div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-tight mb-1">Payment Verified</p>
                                                    <p className="text-sm opacity-80 leading-relaxed italic">Scrutiny fees have been cleared. Finalize document verification before pushing to the review pool.</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Property Info */}
                                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                                <h3 className="font-black text-[#003366] mb-4 flex items-center gap-3 uppercase text-xs tracking-[0.2em]">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                    Property Details
                                                </h3>
                                                <dl className="space-y-4">
                                                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                                        <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stand #</dt>
                                                        <dd className="font-bold text-slate-800">{selectedPlan.stand}</dd>
                                                    </div>
                                                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                                        <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suburb</dt>
                                                        <dd className="font-bold text-slate-800">{selectedPlan.suburb || 'Central District'}</dd>
                                                    </div>
                                                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                                        <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Declared Area</dt>
                                                        <dd className="font-bold text-[#003366]">{selectedPlan.declared_area} m²</dd>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-1">
                                                        <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calculated Area</dt>
                                                        <dd className={`font-bold ${selectedPlan.calculated_area ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                            {selectedPlan.calculated_area ? `${selectedPlan.calculated_area} m²` : 'TBD'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            {/* Documents List */}
                                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                                <h3 className="font-black text-[#003366] mb-4 flex items-center gap-3 uppercase text-xs tracking-[0.2em]">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                                    Submission Files
                                                </h3>
                                                <div className="space-y-3">
                                                    {(selectedPlan as any).plans_url ? (
                                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-[#003366]/30 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-[#003366] text-white p-2 rounded-lg text-[10px] font-black uppercase">Plan</div>
                                                                <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">Architectural Drawings</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => window.open((selectedPlan as any).plans_url, '_blank')}
                                                                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-[#003366] uppercase hover:bg-slate-50 transition shadow-sm"
                                                            >
                                                                Open File
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-400 text-center italic">
                                                            No drawings uploaded
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-[#003366]/30 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-blue-600 text-white p-2 rounded-lg text-[10px] font-black uppercase">Deed</div>
                                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">Ownership Docs</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => selectedPlan.title_deed ? window.open(selectedPlan.title_deed, '_blank') : alert("No ownership document uploaded.")}
                                                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-[#003366] uppercase hover:bg-slate-50 transition shadow-sm"
                                                        >
                                                            Open File
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'compliance' && (
                                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                                            <div className="bg-[#003366] px-8 py-5 flex justify-between items-center">
                                                <h3 className="font-black text-white flex items-center gap-3 uppercase text-sm tracking-[0.2em]">
                                                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    Compliance Checklist
                                                </h3>
                                                <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white/70 uppercase">Financial Audit</div>
                                            </div>

                                            <div className="divide-y divide-slate-100">
                                                {COMPLIANCE_CHECKS.map(check => (
                                                    <label key={check.id} className="flex items-start gap-5 p-6 hover:bg-slate-50 cursor-pointer transition-all group">
                                                        <div className="relative flex items-center h-6">
                                                            <input
                                                                type="checkbox"
                                                                className="h-6 w-6 rounded-lg border-slate-300 text-[#003366] focus:ring-[#003366] transition cursor-pointer"
                                                                checked={!!checklist[check.id]}
                                                                onChange={() => toggleCheck(check.id)}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className={`text-base font-bold ${checklist[check.id] ? 'text-slate-900 line-through opacity-50' : 'text-slate-700'}`}>
                                                                {check.label}
                                                            </span>
                                                            <p className="text-xs text-slate-400 mt-1 font-medium italic">Checked against Promun Municipal ERP</p>
                                                        </div>
                                                        {checklist[check.id] && (
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-scale-in">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4 text-amber-800">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl shrink-0">💡</div>
                                            <p className="text-sm font-bold leading-relaxed italic opacity-80">
                                                All financial checks are mandatory for BCC accounting compliance. If arrears are identified, use the "Reject & Return" function to notify the applicant of their balance.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Unified Sticky Footer (Action Center) */}
                            <div className="bg-white border-t border-slate-200 p-6 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        className="w-full sm:w-auto px-8 py-3 bg-white text-red-600 border-2 border-red-100 hover:border-red-600 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                                    >
                                        Reject Submission
                                    </button>

                                    <div className="flex items-center gap-6 w-full sm:w-auto">
                                        <div className="hidden md:block text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Stage</p>
                                            <p className="text-sm font-black text-[#003366] uppercase">{queueTab.replace('_', ' ')}</p>
                                        </div>

                                        {/* Status Contextual Action */}
                                        {selectedPlan.status === 'PRELIMINARY_SUBMITTED' ? (
                                            <button
                                                onClick={() => setShowProformaGenerator(true)}
                                                disabled={!allChecksPassed}
                                                className={`flex-1 sm:flex-none px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95
                                                    ${allChecksPassed ? 'bg-[#003366] text-white hover:bg-black hover:translate-y-[-2px]' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                                            >
                                                <span>Issue Proforma</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                            </button>
                                        ) : selectedPlan.status === 'PROFORMA_ISSUED' ? (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const invoices = await api.getProformaInvoicesForPlan(selectedPlan.id);
                                                        const latest = invoices[0];
                                                        if (latest) {
                                                            setInvoiceId(latest.id);
                                                            setShowPaymentModal(true);
                                                        } else {
                                                            alert('No invoice found.');
                                                        }
                                                    } catch (e: any) { alert(e.message); }
                                                }}
                                                className="flex-1 sm:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition transform active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <span>Confirm Payment</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                            </button>
                                        ) : selectedPlan.status === 'PAID' ? (
                                            <button
                                                onClick={() => api.submitToReview(selectedPlan.id).then(() => { alert('Verified! Moved to review pool.'); loadPlans(); setSelectedPlan(null); }).catch(e => alert(e.message))}
                                                className="flex-1 sm:flex-none px-10 py-4 bg-[#003366] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition transform active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <span>Verified → Start Review</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handlePreScreen(true)}
                                                disabled={!allChecksPassed}
                                                className={`flex-1 sm:flex-none px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95
                                                    ${allChecksPassed ? 'bg-[#003366] text-white hover:bg-black hover:translate-y-[-2px]' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                                            >
                                                <span>Pass Pre-Screen</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-600 mb-2">Ready to Validate</h3>
                            <p className="text-sm max-w-xs text-center">Select a pending submission from the queue on the left to begin the validation process.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Document Modal Overlay */}
            {showReceiptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800">Receipt Verification</h3>
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                title="Close"
                            >
                                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex items-center justify-center">
                            {selectedPlan.receipt_scan ? (
                                <img
                                    src={selectedPlan.receipt_scan}
                                    alt="Receipt"
                                    className="max-w-full shadow-2xl border border-slate-300"
                                    onError={(e) => {
                                        e.currentTarget.src = "";
                                        e.currentTarget.alt = "Error loading document. Might be a PDF.";
                                    }}
                                />
                            ) : (
                                <div className="bg-white p-2 shadow-lg max-w-full">
                                    <div className="w-[600px] h-[800px] bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400">
                                        [No Receipt Scan Available]
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="px-6 py-2 bg-[#003366] text-white rounded-lg font-bold text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Return for Corrections</h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">Please provide a clear reason why this application is being returned to the applicant.</p>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="E.g. Incomplete documentation, rates balance outstanding..."
                                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition"
                            />
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 text-slate-500 font-bold">Cancel</button>
                            <button
                                onClick={() => handlePreScreen(false)}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-200 active:transform active:scale-95 transition"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Confirmation Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6 bg-[#003366] text-white">
                            <h3 className="font-bold text-lg">Confirm Payment</h3>
                            <p className="text-blue-200 text-xs">Verify the physical receipt before proceeding.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="receipt-number" className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Receipt Number</label>
                                <input
                                    id="receipt-number"
                                    type="text"
                                    value={receiptNumber}
                                    onChange={e => setReceiptNumber(e.target.value)}
                                    placeholder="Enter physical receipt number"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition font-mono"
                                />
                            </div>
                            <div>
                                <label htmlFor="payment-date" className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Payment Date</label>
                                <input
                                    id="payment-date"
                                    type="date"
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 text-slate-500 font-bold">Cancel</button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={proformaSubmitting}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-200 disabled:opacity-50 transition"
                            >
                                {proformaSubmitting ? 'Confirming...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proforma View Overlay */}
            {viewProforma && (
                <ProformaInvoiceView invoice={viewProforma} onClose={() => setViewProforma(null)} />
            )}

            {/* Proforma Generator Overlay */}
            {showProformaGenerator && selectedPlan && (
                <ProformaGenerator
                    plan={selectedPlan}
                    submitting={proformaSubmitting}
                    onClose={() => setShowProformaGenerator(false)}
                    onSubmit={handleIssueProforma}
                />
            )}
        </div>
    );
};
