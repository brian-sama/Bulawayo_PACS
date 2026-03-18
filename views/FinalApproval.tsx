import React, { useState, useEffect } from 'react';
import { Plan, UserProfile } from '../types';
import * as api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface FinalApprovalProps {
    user: UserProfile;
}

// Status colours for department review decision cells
const reviewStatusColor = (s: string) => {
    if (!s || s === 'PENDING') return 'text-slate-400';
    if (s.includes('APPROVED') || s.includes('CONFIRMED')) return 'text-emerald-600';
    if (s.includes('REJECTED')) return 'text-red-600';
    if (s.includes('CORRECTIONS')) return 'text-amber-600';
    return 'text-slate-500';
};

const reviewStatusLabel = (s: string) => {
    if (!s || s === 'PENDING') return '⏳ Pending';
    if (s === 'OFFICER_APPROVED')    return '✓ Officer Approved';
    if (s === 'OFFICER_CORRECTIONS') return '⚠ Corrections';
    if (s === 'OFFICER_REJECTED')    return '✕ Officer Rejected';
    if (s === 'HEAD_CONFIRMED')      return '✓✓ Head Confirmed';
    if (s === 'HEAD_REJECTED')       return '✕✕ Head Rejected';
    return s.replace(/_/g, ' ');
};

export const FinalApproval: React.FC<FinalApprovalProps> = ({ user }) => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [planDetail, setPlanDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await api.getPlans();
            setPlans(data.filter((p: any) => p.status === 'AWAITING_FINAL_DECISION'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPlans(); }, []);

    // Load full plan detail (with nested department_reviews) on selection
    useEffect(() => {
        if (!selectedPlan) { setPlanDetail(null); return; }
        setDetailLoading(true);
        api.getPlanDetail(selectedPlan.id)
            .then(setPlanDetail)
            .catch(console.error)
            .finally(() => setDetailLoading(false));
    }, [selectedPlan?.id]);

    // ── Approve via PDF seal ──────────────────────────────────────────────

    const handleSeal = async () => {
        if (!selectedPlan || !password) return;
        if (notes.trim().length < 5) {
            alert('Please enter final remarks (at least 5 characters).');
            return;
        }
        setSubmitting(true);
        try {
            await api.approveFinal(selectedPlan.id, password, notes);
            alert('Plan sealed and digitally signed!');
            setSelectedPlan(null);
            setPlanDetail(null);
            setPassword('');
            setNotes('');
            loadPlans();
        } catch (e: any) {
            alert(`Error sealing plan: ${e.message ?? 'Invalid password or state error.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Reject (FinalDecision) ────────────────────────────────────────────

    const handleReject = async () => {
        if (rejectReason.trim().length < 10) {
            alert('A rejection reason of at least 10 characters is required.');
            return;
        }
        setSubmitting(true);
        try {
            await api.submitFinalDecision(selectedPlan.id, 'REJECTED', rejectReason);
            alert('Rejection recorded. Applicant notified.');
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedPlan(null);
            setPlanDetail(null);
            loadPlans();
        } catch (e: any) {
            alert(`Error: ${e.message ?? 'Unknown error.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Department review summary ─────────────────────────────────────────

    const reviews: any[] = planDetail?.department_reviews ?? [];
    const concerns = reviews.filter(
        r => r.officer_status === 'OFFICER_CORRECTIONS' ||
             r.officer_status === 'OFFICER_REJECTED'   ||
             r.head_status    === 'HEAD_REJECTED'
    );

    return (
        <div className="flex h-full gap-6">

            {/* Left: Queue */}
            <div className="w-[40%] space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Final Approval Queue</h2>
                    <span className="px-3 py-1 rounded-full bg-[#003366] text-white text-xs font-bold">
                        {plans.length} awaiting
                    </span>
                </div>

                {loading ? (
                    <p className="text-sm text-slate-400 animate-pulse">Loading queue...</p>
                ) : plans.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                        <div className="text-4xl mb-3">🔏</div>
                        <p className="font-medium">No plans awaiting final decision.</p>
                    </div>
                ) : (
                    plans.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPlan(p)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedPlan?.id === p.id
                                    ? 'border-[#003366] bg-blue-50 shadow-md'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-slate-800">{p.plan_id}</h3>
                                <StatusBadge status={p.status} />
                            </div>
                            {p.plan_number && (
                                <p className="text-xs font-mono font-bold text-[#003366] mb-1">{p.plan_number}</p>
                            )}
                            <p className="text-xs text-slate-500">{p.stand_addr ?? p.suburb}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{p.client_name} · {p.category}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Right: Detail */}
            <div className="flex-1">
                {selectedPlan ? (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-full overflow-hidden">

                        {/* Header */}
                        <div className="border-b border-slate-100 p-6 bg-[#F9FAFB]">
                            <h3 className="text-xl font-black text-[#003366] uppercase tracking-tight">Executive Seal</h3>
                            <p className="text-slate-500 text-sm mt-1">
                                Reviewing consolidated department findings for <strong>{selectedPlan.plan_id}</strong>
                                {selectedPlan.plan_number && <span className="ml-2 font-mono text-[#003366]">{selectedPlan.plan_number}</span>}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* ── Departmental Decisions Panel ───────────────────── */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                    Departmental Decisions
                                </h4>
                                {detailLoading ? (
                                    <p className="text-sm text-slate-400 animate-pulse">Loading reviews...</p>
                                ) : reviews.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No department reviews recorded.</p>
                                ) : (
                                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider">
                                                <tr>
                                                    <th className="text-left px-4 py-2 font-bold">Department</th>
                                                    <th className="text-left px-4 py-2 font-bold">Officer</th>
                                                    <th className="text-left px-4 py-2 font-bold">Head</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reviews.map((r: any) => (
                                                    <tr key={r.id}>
                                                        <td className="px-4 py-3 font-bold text-slate-700">
                                                            {r.department_name}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`font-bold ${reviewStatusColor(r.officer_status)}`}>
                                                                {reviewStatusLabel(r.officer_status)}
                                                            </span>
                                                            {r.officer_comment && (
                                                                <p className="text-slate-400 mt-0.5 leading-tight">{r.officer_comment}</p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`font-bold ${reviewStatusColor(r.head_status)}`}>
                                                                {reviewStatusLabel(r.head_status)}
                                                            </span>
                                                            {r.head_comment && (
                                                                <p className="text-slate-400 mt-0.5 leading-tight">{r.head_comment}</p>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ── Consolidated Concerns ──────────────────────────── */}
                            {concerns.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">
                                        ⚠ Consolidated Concerns ({concerns.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {concerns.map((r: any) => (
                                            <div key={r.id} className="text-xs">
                                                <span className="font-bold text-amber-800">{r.department_name}:</span>{' '}
                                                <span className="text-amber-700">{r.officer_comment || r.head_comment || 'No comment provided.'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Signing Form ───────────────────────────────────── */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        Final Remarks <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                        placeholder="Enter official approval remarks (required, min 5 characters)..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        Secondary Signature Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex-1 py-3 border-2 border-red-200 text-red-600 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-red-50 transition-all"
                            >
                                ✕ Reject
                            </button>
                            <button
                                onClick={handleSeal}
                                disabled={submitting || !password || notes.trim().length < 5}
                                className="flex-[2] py-3 bg-[#003366] text-white rounded-xl font-black text-sm uppercase tracking-wide shadow-lg hover:bg-[#002244] disabled:opacity-50 transition-all"
                            >
                                {submitting ? 'Sealing...' : '🔏 Apply Official Seal'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-12 text-center">
                        <div>
                            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">🔏</div>
                            <h3 className="font-bold text-slate-400">Select a plan to review and apply the executive seal.</h3>
                        </div>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Final Rejection</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                This is irreversible. Provide a clear reason for the applicant.
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">
                                Rejection Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Provide a detailed rejection reason (minimum 10 characters)..."
                                rows={5}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 resize-none transition-all"
                            />
                            {rejectReason.length > 0 && rejectReason.length < 10 && (
                                <p className="text-xs font-bold text-red-500 mt-1">
                                    {10 - rejectReason.length} more character(s) required
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-black text-slate-500 hover:border-slate-300 transition-all"
                            >Cancel</button>
                            <button
                                onClick={handleReject}
                                disabled={submitting || rejectReason.trim().length < 10}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 disabled:opacity-50 transition-all"
                            >
                                {submitting ? 'Submitting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
