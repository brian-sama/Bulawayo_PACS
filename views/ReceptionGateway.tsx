
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
            setPlans(sorted.filter((p: any) => p.status === 'SUBMITTED' || p.status === 'PRE_SCREENING'));
            setProformaPlans(sorted.filter((p: any) => ['PRELIMINARY_SUBMITTED', 'PROFORMA_ISSUED'].includes(p.status)));
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
                        <>
                            {/* ── PROFORMA QUEUE PANEL ─────────────────────────── */}
                            {queueTab === 'proforma' && (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="max-w-2xl mx-auto space-y-4">
                                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h2 className="text-xl font-black text-[#003366]">{selectedPlan.plan_id}</h2>
                                                    <p className="text-sm text-slate-500">{(selectedPlan as any).client_name} · {selectedPlan.category} · {selectedPlan.status}</p>
                                                </div>
                                                <StatusBadge status={selectedPlan.status} />
                                            </div>

                                            {selectedPlan.status === 'PRELIMINARY_SUBMITTED' && (
                                                <div className="space-y-3">
                                                    <p className="text-sm text-slate-600">This is a <strong>preliminary submission</strong>. Issue a proforma invoice for fee calculation.</p>
                                                    <button
                                                        onClick={() => setShowProformaGenerator(true)}
                                                        className="w-full py-3 bg-[#003366] text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-[#002244] transition shadow-lg"
                                                    >
                                                        📄 Issue Proforma Invoice
                                                    </button>
                                                </div>
                                            )}

                                            {selectedPlan.status === 'PROFORMA_ISSUED' && (
                                                <div className="space-y-3">
                                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                                                        <p className="font-bold mb-1">⏳ Awaiting Payment</p>
                                                        <p>Proforma issued. Once the applicant pays, record the receipt number to confirm payment.</p>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            // Load invoice ID from API
                                                            try {
                                                                const invoices = await api.getProformaInvoicesForPlan(selectedPlan.id);
                                                                const latest = invoices[0];
                                                                if (latest) {
                                                                    setInvoiceId(latest.id);
                                                                    setShowPaymentModal(true);
                                                                } else {
                                                                    alert('No proforma invoice found for this plan.');
                                                                }
                                                            } catch (e: any) {
                                                                alert(`Error: ${e.message}`);
                                                            }
                                                        }}
                                                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 transition shadow-lg"
                                                    >
                                                        ✓ Confirm Payment Received
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── DOC VERIFY PANEL ─────────────────────────────── */}
                            {queueTab === 'doc_verify' && (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="max-w-2xl mx-auto">
                                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-xl font-black text-[#003366]">{selectedPlan.plan_id}</h2>
                                                    <p className="text-sm text-slate-500">Payment confirmed — verify submitted documents</p>
                                                </div>
                                                <StatusBadge status={selectedPlan.status} />
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                                                <p className="font-bold mb-1">📋 Document Checklist</p>
                                                <p>Review all submitted documents in the system and mark them as verified once confirmed.</p>
                                            </div>
                                            <button
                                                onClick={() => api.submitToReview(selectedPlan.id).then(() => { alert('Plan submitted to Review Pool.'); loadPlans(); setSelectedPlan(null); }).catch((e: any) => alert(e.message))}
                                                className="w-full py-3 bg-[#003366] text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-[#002244] transition shadow-lg"
                                            >
                                                → Submit to Review Pool
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── PRE-SCREEN PANEL (existing tabs) ─────────────── */}
                            {queueTab === 'pre_screen' && (<>
                            {/* Workspace Header & Tabs */}
                            <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0 shadow-sm shrink-0">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedPlan.plan_id}</h2>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-mono">
                                                {selectedPlan.category}
                                            </span>
                                        </div>
                                        <p className="text-slate-600">{selectedPlan.stand_addr}</p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-slate-400 uppercase">Submitted By</p>
                                        <p className="font-medium text-slate-800">{selectedPlan.client_name}</p>
                                    </div>
                                </div>

                                {/* 2. Tabs */}
                                <div className="flex gap-6">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Overview & Documents
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('compliance')}
                                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'compliance' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Financial Compliance
                                        {!allChecksPassed && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                                {activeTab === 'overview' && (
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Plan Cards */}
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                    Properties
                                                </h3>
                                                <dl className="space-y-3 text-sm">
                                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                                        <dt className="text-slate-500">Stand Number</dt>
                                                        <dd className="font-medium text-slate-800">{selectedPlan.stand}</dd>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                                        <dt className="text-slate-500">Suburb</dt>
                                                        <dd className="font-medium text-slate-800">{selectedPlan.suburb || 'N/A'}</dd>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                                        <dt className="text-slate-500">Declared Area</dt>
                                                        <dd className="font-medium text-slate-800">{selectedPlan.declared_area} m²</dd>
                                                    </div>
                                                    <div className="flex justify-between pt-1">
                                                        <dt className="text-slate-500">Calculated Area</dt>
                                                        <dd className={`font-medium ${selectedPlan.calculated_area ? 'text-green-600' : 'text-slate-400'}`}>
                                                            {selectedPlan.calculated_area ? `${selectedPlan.calculated_area} m²` : 'Pending'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            {/* Documents */}
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                                    Attachments
                                                </h3>
                                                <ul className="space-y-3">
                                                    <li className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 group hover:border-blue-200 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-white p-1.5 rounded border border-slate-200 text-xs font-bold text-slate-500">PDF</div>
                                                            <span className="text-sm font-medium text-slate-700">Proof of Ownership</span>
                                                        </div>
                                                        <button
                                                            onClick={() => selectedPlan.title_deed ? window.open(selectedPlan.title_deed, '_blank') : alert("No document uploaded.")}
                                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                        >
                                                            View
                                                        </button>
                                                    </li>
                                                    <li className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 group hover:border-blue-200 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-white p-1.5 rounded border border-slate-200 text-xs font-bold text-slate-500">IMG</div>
                                                            <span className="text-sm font-medium text-slate-700">Receipt Scan</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowReceiptModal(true)}
                                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                        >
                                                            Preview
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'compliance' && (
                                    <div className="max-w-3xl mx-auto">
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    Review Checklist
                                                </h3>
                                                <span className="text-xs font-medium text-slate-500">Mandatory Checks</span>
                                            </div>

                                            <div className="divide-y divide-slate-100">
                                                {COMPLIANCE_CHECKS.map(check => (
                                                    <label key={check.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 cursor-pointer transition-colors">
                                                        <div className="relative flex items-start">
                                                            <input
                                                                type="checkbox"
                                                                className="h-5 w-5 rounded border-slate-300 text-[#003366] focus:ring-[#003366] mt-0.5"
                                                                checked={!!checklist[check.id]}
                                                                onChange={() => toggleCheck(check.id)}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className={`text-sm font-medium ${checklist[check.id] ? 'text-slate-900' : 'text-slate-600'}`}>
                                                                {check.label}
                                                            </span>
                                                            <p className="text-xs text-slate-400 mt-0.5">Verified against Promun/ERP</p>
                                                        </div>
                                                        {checklist[check.id] && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 animate-fade-in">
                                                                Verified
                                                            </span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm">
                                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <p>Ensure all penalties are cleared before proceeding. If lease arrears exist, check for a valid payment plan agreement.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 5. Sticky Footer (Context-Aware) */}
                            <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                                <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
                                    <button
                                        onClick={() => handlePreScreen(false)}
                                        className="px-6 py-2.5 bg-white text-red-600 border border-red-200 hover:border-red-300 hover:bg-red-50 rounded-lg font-bold text-sm transition-all shadow-sm"
                                    >
                                        Reject & Return
                                    </button>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Validation Status</p>
                                            <p className={`text-sm font-bold ${allChecksPassed ? 'text-green-600' : 'text-amber-500'}`}>
                                                {allChecksPassed ? 'Ready for Approval' : 'Pending Checks'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handlePreScreen(true)}
                                            disabled={!allChecksPassed || (selectedPlan.status !== 'PRE_SCREENING' && selectedPlan.status !== 'SUBMITTED')}
                                            className={`px-8 py-2.5 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all transform active:scale-95
                                            ${allChecksPassed && (selectedPlan.status === 'PRE_SCREENING' || selectedPlan.status === 'SUBMITTED')
                                                    ? 'bg-[#003366] text-white hover:bg-[#002244] hover:shadow-lg'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                                        >
                                            <span>Pass to Review</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>)}
                    </>
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
