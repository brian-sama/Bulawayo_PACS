import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { Plan, DepartmentReview } from '../types';

interface ReviewWorkspaceProps {
    planId: string;
    onClose: () => void;
    userRole: string; // 'DEPT_OFFICER' | 'DEPT_HEAD'
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({ planId, onClose, userRole }) => {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [statusDecision, setStatusDecision] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [commentError, setCommentError] = useState('');
    const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
    const [correctionsReason, setCorrectionsReason] = useState('');

    // ── Load plan & comments ──────────────────────────────────────────────

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const data = await api.getPlanDetail(planId);
                setPlan(data);

                // Fix: use highest version_number, not array index [0]
                const latestVersion = data.versions?.reduce(
                    (best: any, v: any) => (!best || v.version_number > best.version_number) ? v : best,
                    null
                );

                if (latestVersion?.id) {
                    // Fix: getComments was previously missing from api.ts — now added
                    const commentsData = await api.getComments(latestVersion.id);
                    setComments(commentsData);
                }
            } catch (error) {
                console.error('Failed to load plan details', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlan();
    }, [planId]);

    // Fix: select current version by highest version_number — not by array position
    const currentVersion = plan?.versions?.reduce(
        (best: any, v: any) => (!best || v.version_number > best.version_number) ? v : best,
        null
    ) ?? null;

    // ── PDF Preview ───────────────────────────────────────────────────────
    // Fix: use the authenticated /download/ endpoint instead of raw media URL,
    //      and always force the blob to application/pdf regardless of Content-Type header.

    const loadPreview = useCallback(async (signal: AbortSignal) => {
        setPreviewError('');
        setPreviewUrl('');

        if (!plan?.id) return;

        setPreviewLoading(true);
        let objectUrl: string | null = null;
        try {
            const token = api.getAccessToken();
            const downloadUrl = api.getPlanFileUrl(plan.id);

            const response = await fetch(downloadUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                signal,
            });

            if (!response.ok) {
                throw new Error(`Preview request failed (${response.status})`);
            }

            const blob = await response.blob();
            // Always construct as application/pdf regardless of server Content-Type
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            objectUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(objectUrl);
        } catch (error: any) {
            if (error?.name === 'AbortError') return;
            console.error('Failed to preview plan file', error);
            setPreviewError('Unable to load the plan preview. The file may not exist or you lack access.');
        } finally {
            setPreviewLoading(false);
        }

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [plan?.id]);

    useEffect(() => {
        const controller = new AbortController();
        let cleanup: (() => void) | undefined;
        loadPreview(controller.signal).then(c => { cleanup = c; });
        return () => {
            controller.abort();
            cleanup?.();
        };
    }, [loadPreview]);

    // ── Find the correct department review ───────────────────────────────
    // Fix: match by the current user's department ID, not "first pending review"

    const reviewRecord: DepartmentReview | null = (() => {
        if (!plan?.department_reviews) return null;
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userDeptId = storedUser?.department;
            if (userDeptId) {
                return plan.department_reviews.find(
                    (r: any) => r.department === userDeptId
                ) ?? null;
            }
        } catch { /* ignore parse errors */ }
        // Fallback: first pending review
        return plan.department_reviews.find(
            (r: any) => r.officer_status === 'PENDING' || r.head_status === 'PENDING'
        ) ?? null;
    })();

    // ── Validation helpers ────────────────────────────────────────────────

    const needsComment = (decision: string) =>
        ['OFFICER_REJECTED', 'OFFICER_CORRECTIONS', 'HEAD_REJECTED'].includes(decision);

    const validateForm = () => {
        if (!statusDecision) {
            alert('Please select an evaluation decision.');
            return false;
        }
        if (needsComment(statusDecision) && newComment.trim().length < 10) {
            setCommentError('A reason of at least 10 characters is required for rejection or correction requests.');
            return false;
        }
        setCommentError('');
        return true;
    };

    // ── Submit review ─────────────────────────────────────────────────────

    const handleSubmitReview = async () => {
        if (!validateForm()) return;

        if (!reviewRecord) {
            alert('No pending review record found for this plan in your department.');
            return;
        }

        setSubmitting(true);
        try {
            const role = userRole === 'DEPT_HEAD' ? 'HEAD' : 'OFFICER';
            const decisionMap: Record<string, string> = {
                OFFICER_APPROVED:    'APPROVED',
                OFFICER_REJECTED:    'REJECTED',
                OFFICER_CORRECTIONS: 'CORRECTIONS',
                HEAD_CONFIRMED:      'APPROVED',
                HEAD_REJECTED:       'REJECTED',
            };
            await api.evaluateReview(
                reviewRecord.id,
                role,
                decisionMap[statusDecision] ?? statusDecision,
                newComment
            );
            alert('Review submitted successfully.');
            onClose();
        } catch (error: any) {
            console.error('Failed to submit review', error);
            alert(`Error submitting review: ${error.message ?? 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Request corrections modal ─────────────────────────────────────────

    const handleRequestCorrections = async () => {
        if (correctionsReason.trim().length < 10) {
            alert('Please provide a correction reason of at least 10 characters.');
            return;
        }
        if (!reviewRecord) {
            alert('No review record found for your department.');
            return;
        }
        setSubmitting(true);
        try {
            await api.evaluateReview(reviewRecord.id, 'OFFICER', 'CORRECTIONS', correctionsReason);
            alert('Corrections request submitted successfully.');
            setShowCorrectionsModal(false);
            onClose();
        } catch (error: any) {
            alert(`Error: ${error.message ?? 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-500 font-medium">Loading Workspace...</div>;
    if (!plan)   return <div className="p-10 text-center text-red-500 font-medium">Plan not found.</div>;

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex overflow-hidden">

            {/* ── 70% Left Panel — PDF Viewer ───────────────────────────── */}
            <div className="w-[70%] bg-slate-800 flex flex-col relative border-r border-slate-700">
                {/* Toolbar */}
                <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10 border-b border-slate-700">
                    <div className="flex items-center gap-4 text-white">
                        <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors" title="Close workspace">
                            <span className="text-xl">←</span>
                        </button>
                        <div>
                            <h1 className="font-bold text-sm tracking-wide">
                                {plan.plan_id}{plan.plan_number ? ` — ${plan.plan_number}` : ''} · Version {currentVersion?.version_number ?? '–'}
                            </h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{plan.category}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {previewUrl && (
                            <a
                                href={previewUrl}
                                download={`${plan.plan_id}_v${currentVersion?.version_number}.pdf`}
                                className="text-[10px] font-bold text-blue-400 uppercase tracking-wider hover:text-blue-300 transition-colors"
                            >
                                ↓ Download
                            </a>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                            plan.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                            plan.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                        }`}>
                            {plan.status?.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>

                {/* PDF Preview Area */}
                <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden pt-14 text-slate-400">
                    {previewLoading ? (
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm font-medium">Loading plan preview...</p>
                        </div>
                    ) : previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-none"
                            title={`Plan ${plan.plan_id} PDF Preview`}
                        />
                    ) : previewError ? (
                        <div className="text-center p-8 max-w-sm">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-red-400 text-2xl">⚠</div>
                            <p className="text-sm font-medium text-slate-600">{previewError}</p>
                        </div>
                    ) : (
                        <p className="text-sm font-medium">No plan file available for this version.</p>
                    )}
                </div>
            </div>

            {/* ── 30% Right Panel — Comments & Evaluation ──────────────── */}
            <div className="w-[30%] bg-white flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 bg-[#F9FAFB]">
                    <h2 className="text-lg font-black text-[#003366] uppercase tracking-wide">Review &amp; Evaluate</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">Submit your official departmental verdict.</p>
                    {reviewRecord && (
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                            Dept: {(reviewRecord as any).department_name ?? '–'}
                        </p>
                    )}
                </div>

                {/* Comment Thread */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                            <p className="text-sm font-medium text-slate-400">No comments on this version yet.</p>
                        </div>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                        {c.department_name} · {c.author_name}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.text}</p>
                                {c.status_vote && (
                                    <span className={`text-[9px] font-black uppercase tracking-wider mt-2 inline-block px-2 py-0.5 rounded-full ${
                                        c.status_vote === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                        c.status_vote === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>{c.status_vote}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Evaluation Form */}
                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div className="space-y-4">
                        <textarea
                            placeholder={needsComment(statusDecision)
                                ? 'Required: Provide a reason for your decision (min 10 chars)...'
                                : 'Add official notes or conditions (optional)...'}
                            value={newComment}
                            onChange={e => { setNewComment(e.target.value); if (commentError) setCommentError(''); }}
                            className={`w-full h-28 bg-[#F9FAFB] border rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none transition-all resize-none ${
                                commentError
                                    ? 'border-red-400 focus:ring-4 focus:ring-red-50/50'
                                    : 'border-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50'
                            }`}
                        />
                        {commentError && (
                            <p className="text-xs font-bold text-red-500 -mt-2">{commentError}</p>
                        )}

                        {/* Decision Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            {userRole === 'DEPT_OFFICER' && (
                                <>
                                    <button
                                        onClick={() => setStatusDecision('OFFICER_APPROVED')}
                                        className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${statusDecision === 'OFFICER_APPROVED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                    >✓ Approve</button>
                                    <button
                                        onClick={() => setStatusDecision('OFFICER_REJECTED')}
                                        className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${statusDecision === 'OFFICER_REJECTED' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                    >✕ Reject</button>
                                    {/* Fix: "Request Corrections" replaces the removed "Proceed with Corrections" */}
                                    <button
                                        onClick={() => { setStatusDecision(''); setShowCorrectionsModal(true); }}
                                        className="col-span-2 p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all border-amber-200 text-amber-700 hover:border-amber-400 bg-amber-50"
                                    >⚠ Request Corrections</button>
                                </>
                            )}
                            {userRole === 'DEPT_HEAD' && (
                                <>
                                    <button
                                        onClick={() => setStatusDecision('HEAD_CONFIRMED')}
                                        className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${statusDecision === 'HEAD_CONFIRMED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                    >✓ Confirm Approval</button>
                                    <button
                                        onClick={() => setStatusDecision('HEAD_REJECTED')}
                                        className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${statusDecision === 'HEAD_REJECTED' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                    >✕ Reject</button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting || !statusDecision}
                            className="w-full bg-[#003366] text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#002244] shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                        >
                            {submitting
                                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                                : 'Submit Official Verdict'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Request Corrections Modal ─────────────────────────────── */}
            {showCorrectionsModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Request Corrections</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Describe what the applicant must correct before re-submission.
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">
                                Correction Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={correctionsReason}
                                onChange={e => setCorrectionsReason(e.target.value)}
                                placeholder="Describe the specific corrections required (minimum 10 characters)..."
                                rows={5}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 resize-none transition-all"
                            />
                            {correctionsReason.length > 0 && correctionsReason.length < 10 && (
                                <p className="text-xs font-bold text-red-500 mt-1">
                                    {10 - correctionsReason.length} more character(s) required
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowCorrectionsModal(false); setCorrectionsReason(''); }}
                                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-black text-slate-500 hover:border-slate-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestCorrections}
                                disabled={submitting || correctionsReason.trim().length < 10}
                                className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600 disabled:opacity-50 transition-all"
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
