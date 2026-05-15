import React, { useEffect, useMemo, useState } from 'react';
import { DepartmentComment, DepartmentReview, Plan } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import * as api from '../services/api';
import {
  getWorkflowProfile,
  isPreliminaryGatekeeper,
  ReviewVote,
  WorkflowProfile,
} from './workflowProfiles';

interface ReviewInterfaceProps {
  plan: Plan;
  onBack: () => void;
  user: any;
}

const PlanPin: React.FC<{ x: number; y: number; children: React.ReactNode; className?: string }> = ({
  x,
  y,
  children,
  className,
}) => (
  <div className={className} style={{ left: `${x}%`, top: `${y}%` }}>
    {children}
  </div>
);

const formatDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString();
};

const displayStatus = (value?: string | null) => (value ? value.replace(/_/g, ' ') : 'PENDING');

const departmentMatchesUser = (review: DepartmentReview, user: any) =>
  review.department === user?.department || review.department_name === user?.department_name;

const getPreferredReview = (reviews: DepartmentReview[], user: any, status: string) => {
  const matches = reviews.filter(review => departmentMatchesUser(review, user));
  const preferredStage = status === 'PRELIMINARY_SUBMITTED' && isPreliminaryGatekeeper(user?.department_name)
    ? 'PRELIMINARY'
    : 'TECHNICAL';

  return matches.find(review => review.review_stage === preferredStage) || matches[0] || null;
};

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <div className="mt-1 text-sm font-bold text-slate-700 leading-snug">{value || 'Not recorded'}</div>
  </div>
);

const Checklist: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="space-y-2">
    {items.map(item => (
      <div key={item} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
        <span className="mt-1 h-2 w-2 rounded-full bg-[#003366]" />
        <span className="text-xs font-semibold leading-relaxed text-slate-600">{item}</span>
      </div>
    ))}
  </div>
);

const DocumentButton: React.FC<{ label: string; available: boolean; onClick?: () => void }> = ({ label, available, onClick }) => (
  <button
    type="button"
    onClick={available ? onClick : undefined}
    disabled={!available}
    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
      available
        ? 'border-slate-200 bg-white text-slate-700 hover:border-[#003366] hover:text-[#003366]'
        : 'border-slate-100 bg-slate-50 text-slate-300'
    }`}
  >
    <span>{label}</span>
    <span className="text-[10px] uppercase tracking-widest">{available ? 'Open' : 'Missing'}</span>
  </button>
);

const ContextPanel: React.FC<{
  plan: Plan;
  profile: WorkflowProfile;
  activeReview: DepartmentReview | null;
  openAttachment: (attachment: 'title-deed' | 'power-of-attorney' | 'structural-cert' | 'receipt-scan') => void;
}> = ({ plan, profile, activeReview, openAttachment }) => {
  const variance = Math.abs(Number(plan.calculated_area || 0) - Number(plan.declared_area || 0));
  const declared = Number(plan.declared_area || 0);
  const variancePercent = declared > 0 ? Math.round((variance / declared) * 100) : 0;
  const invoices = (plan as any).proforma_invoices || [];
  const submittedDocuments = (plan as any).submitted_documents || [];

  if (profile.kind === 'OWNERSHIP') {
    return (
      <div className="space-y-4">
        <DetailRow label="Applicant" value={plan.client_name} />
        <DetailRow label="Recorded Owner" value={(plan as any).owner_name || plan.client_name} />
        <DetailRow label="Representative" value={(plan as any).is_representative ? (plan as any).represents_owner_name : 'No'} />
        <div className="space-y-2 pt-2">
          <DocumentButton label="Title deed" available={Boolean(plan.title_deed)} onClick={() => openAttachment('title-deed')} />
          <DocumentButton label="Power of attorney" available={Boolean(plan.power_of_attorney)} onClick={() => openAttachment('power-of-attorney')} />
        </div>
      </div>
    );
  }

  if (profile.kind === 'LEASE') {
    return (
      <div className="space-y-4">
        <DetailRow label="Stand" value={plan.stand_addr} />
        <DetailRow label="Land Use" value={plan.category} />
        <DetailRow label="Development Scope" value={plan.development_description} />
        <DetailRow label="Current Review" value={displayStatus(activeReview?.officer_status)} />
        <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-700">
          Confirm expiry, conditions, and council land record alignment before approving the lease position.
        </div>
      </div>
    );
  }

  if (profile.kind === 'EVALUATION') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Area Check</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-700/70">Declared</p>
              <p className="text-lg font-black text-slate-800">{plan.declared_area || 0} sqm</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-700/70">Calculated</p>
              <p className="text-lg font-black text-slate-800">{plan.calculated_area || 0} sqm</p>
            </div>
          </div>
          <p className={`mt-3 text-xs font-black ${variancePercent > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
            {variancePercent}% variance from declared area
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tariff Basis</p>
          <p className="mt-2 text-sm font-bold text-slate-700">{plan.stand_type || plan.category}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            Apply the active BCC schedule for stand type, building size, development scope, and plan category.
          </p>
        </div>
      </div>
    );
  }

  if (profile.kind === 'FINANCIAL') {
    return (
      <div className="space-y-4">
        <DetailRow label="Client" value={plan.client_name} />
        <DetailRow label="Receipt Upload" value={plan.receipt_scan ? 'Receipt uploaded' : 'No receipt uploaded'} />
        <DetailRow label="Invoices" value={`${invoices.length} proforma record(s)`} />
        <DetailRow label="Submitted Documents" value={`${submittedDocuments.length} supporting document(s)`} />
        <div className="space-y-2">
          <DocumentButton label="Receipt evidence" available={Boolean(plan.receipt_scan)} onClick={() => openAttachment('receipt-scan')} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DetailRow label="Department Focus" value={profile.stageLabel} />
      <DetailRow label="Development Scope" value={plan.development_description} />
      <DetailRow label="Declared Area" value={`${plan.declared_area || 0} sqm`} />
      <DetailRow label="Calculated Area" value={`${plan.calculated_area || 0} sqm`} />
      <div className="space-y-2 pt-2">
        <DocumentButton label="Structural certificate" available={Boolean(plan.structural_cert)} onClick={() => openAttachment('structural-cert')} />
        <DocumentButton label="Receipt evidence" available={Boolean(plan.receipt_scan)} onClick={() => openAttachment('receipt-scan')} />
      </div>
    </div>
  );
};

export const ReviewInterface: React.FC<ReviewInterfaceProps> = ({ plan: initialPlan, onBack, user }) => {
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [activeTab, setActiveTab] = useState<'DECISION' | 'COMMENTS'>('DECISION');
  const [comment, setComment] = useState('');
  const [vote, setVote] = useState<ReviewVote>('APPROVED');
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localComments, setLocalComments] = useState<DepartmentComment[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [availableVersions, setAvailableVersions] = useState<any[]>([]);
  const [userReviewId, setUserReviewId] = useState<number | null>(null);
  const [activeReview, setActiveReview] = useState<DepartmentReview | null>(null);
  const [amountPayable, setAmountPayable] = useState<number | string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  const profile = useMemo(() => getWorkflowProfile(user?.department_name), [user?.department_name]);
  const verdicts = user?.role === 'DEPT_HEAD'
    ? [
        { value: 'APPROVED' as ReviewVote, label: 'Confirm Department Decision', description: 'Accept the officer recommendation.' },
        { value: 'REJECTED' as ReviewVote, label: 'Reject Department Decision', description: 'Return a binding department rejection.' },
      ]
    : profile.verdicts;

  useEffect(() => {
    refreshPlan();
  }, [initialPlan.id, user?.department]);

  useEffect(() => {
    let objectUrl = '';
    let isMounted = true;
    setPreviewLoading(true);
    setPreviewUrl(null);

    api.openAuthenticatedPdf(api.getPlanFileUrl(plan.id))
      .then(url => {
        objectUrl = url;
        if (isMounted) setPreviewUrl(url);
      })
      .catch(() => {
        if (isMounted) setPreviewUrl(null);
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [plan.id, currentVersionId]);

  const refreshPlan = async () => {
    if (!initialPlan.id) return;
    try {
      const data = await api.getPlanDetail(initialPlan.id);
      setPlan(data);

      if (data.versions && data.versions.length > 0) {
        const latest = data.versions[0];
        setCurrentVersionId(latest.id);
        setAvailableVersions(data.versions);
        try {
          const comments = await api.getComments(latest.id);
          setLocalComments(comments);
        } catch {
          setLocalComments([]);
        }
      } else {
        setCurrentVersionId(null);
        setAvailableVersions([]);
        setLocalComments([]);
      }

      const myReview = getPreferredReview(data.department_reviews || [], user, data.status);
      setActiveReview(myReview);
      setUserReviewId(myReview?.id || null);
      setAmountPayable(myReview?.amount_payable ?? '');
    } catch (error) {
      console.error('Failed to load plan details:', error);
    }
  };

  const openAttachment = async (attachment: 'title-deed' | 'power-of-attorney' | 'structural-cert' | 'receipt-scan') => {
    try {
      const objectUrl = await api.openAuthenticatedPdf(api.getPlanAttachmentUrl(plan.id, attachment));
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      alert(error.message || 'Unable to open the document.');
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPin({ x, y });
    setPinMode(false);
    setActiveTab('DECISION');
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      alert('Please enter review remarks before submitting.');
      return;
    }

    if (!userReviewId) {
      alert('No active review assignment was found for your department.');
      return;
    }

    if (profile.requiresAmount && vote === 'APPROVED' && (!amountPayable || Number(amountPayable) <= 0)) {
      alert('Evaluation must set a valid amount payable before approval.');
      return;
    }

    setLoading(true);
    try {
      const role = user.role === 'DEPT_HEAD' ? 'HEAD' : 'OFFICER';
      const backendVote = vote === 'CORRECTIONS_REQUIRED' ? 'CORRECTIONS' : vote;
      await api.evaluateReview(
        userReviewId,
        role,
        backendVote,
        comment.trim(),
        profile.requiresAmount ? Number(amountPayable) : undefined,
      );

      if (pin && currentVersionId) {
        await api.addComment({
          plan_version: currentVersionId,
          department: user.department || 1,
          text: comment.trim(),
          status_vote: vote,
          pdf_pin_x: pin.x,
          pdf_pin_y: pin.y,
        });
      }

      alert('Review submitted successfully.');
      setComment('');
      setPin(null);
      refreshPlan();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const existingPins = localComments.filter(c => c.pdf_pin_x !== undefined && c.pdf_pin_x !== null);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100">
      <div className="z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Go back"
            title="Go back"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="truncate text-base font-black text-[#003366]">{profile.title}</h2>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${profile.softAccent}`}>
                {profile.stageLabel}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {plan.plan_id} {plan.plan_number ? `| ${plan.plan_number}` : ''} | {plan.stand_addr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusBadge status={plan.status} />
          <div className="hidden text-right md:block">
            <p className="text-xs font-black text-slate-800">{user.full_name}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{user.department_name || user.role}</p>
          </div>
          <button onClick={onBack} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-black">
            Queue
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[320px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          <div className={`p-5 ${profile.accent}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">Department Focus</p>
            <p className="mt-3 text-sm font-bold leading-relaxed">{profile.focus}</p>
          </div>

          <div className="space-y-6 p-5">
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Property Data</h3>
              <DetailRow label="Stand Number" value={(plan as any).stand_number || plan.stand_addr?.split(',')[0]} />
              <DetailRow label="Category" value={plan.category} />
              <DetailRow label="Stand Type" value={plan.stand_type || 'Not recorded'} />
              <DetailRow label="Submitted" value={formatDate(plan.submitted_at || plan.created_at)} />
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Workspace Context</h3>
              <ContextPanel plan={plan} profile={profile} activeReview={activeReview} openAttachment={openAttachment} />
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Checklist</h3>
              <Checklist items={profile.checklists} />
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Review State</h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="Officer" value={displayStatus(activeReview?.officer_status)} />
                  <DetailRow label="Head" value={displayStatus(activeReview?.head_status)} />
                </div>
              </div>
            </section>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden bg-slate-200">
          <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPinMode(value => !value)}
                title="Add comment pin"
                className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-widest transition ${
                  pinMode ? 'border-[#003366] bg-[#003366] text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-[#003366]'
                }`}
              >
                {pinMode ? 'Pin Active' : 'Add Pin'}
              </button>
              <button type="button" onClick={() => setZoom(value => Math.max(0.75, value - 0.1))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600">
                -
              </button>
              <span className="w-14 text-center text-xs font-black text-slate-500">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom(value => Math.min(1.35, value + 0.1))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600">
                +
              </button>
            </div>

            <select
              title="Select plan version"
              value={currentVersionId || ''}
              onChange={event => setCurrentVersionId(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"
            >
              {availableVersions.map(version => (
                <option key={version.id} value={version.id}>
                  Version {version.version_number} ({formatDate(version.created_at || version.uploaded_at)})
                </option>
              ))}
              {availableVersions.length === 0 && <option>No versions found</option>}
            </select>
          </div>

          <div className="flex-1 overflow-auto p-8">
            <div
              className={`relative mx-auto min-h-[900px] w-[760px] origin-top bg-white shadow-2xl transition ${pinMode ? 'cursor-cell ring-4 ring-blue-400' : 'cursor-default'}`}
              style={{ transform: `scale(${zoom})` }}
              onClick={handleCanvasClick}
            >
              {previewLoading ? (
                <div className="flex h-[980px] items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400">
                  Loading document preview
                </div>
              ) : previewUrl ? (
                <iframe title="Plan document preview" src={previewUrl} className="h-[980px] w-full border-0" />
              ) : (
                <div className="h-[980px] border border-slate-300 p-12">
                  <div className="flex h-full flex-col border-[12px] border-slate-100 p-8 opacity-50">
                    <h1 className="mb-12 text-center text-4xl font-black text-slate-300">ARCHITECTURAL DRAWING</h1>
                    <div className="flex flex-1 items-center justify-center rounded-lg border-4 border-dashed border-slate-200">
                      <p className="text-7xl font-black text-slate-100">PLAN</p>
                    </div>
                  </div>
                </div>
              )}

              {pin && (
                <PlanPin x={pin.x} y={pin.y} className="absolute -translate-x-1/2 -translate-y-full">
                  <div className="rounded-full bg-blue-600 px-2 py-1 text-xs font-black text-white shadow-lg">New</div>
                </PlanPin>
              )}

              {existingPins.map(c => (
                <PlanPin key={c.id} x={c.pdf_pin_x || 0} y={c.pdf_pin_y || 0} className="group absolute -translate-x-1/2 -translate-y-full">
                  <div className="h-5 w-5 rounded-full border-2 border-white bg-red-600 shadow" />
                  <div className="absolute bottom-full left-1/2 z-30 mb-2 hidden w-52 -translate-x-1/2 rounded-lg bg-slate-900 p-3 text-white shadow-xl group-hover:block">
                    <p className="border-b border-white/20 pb-1 text-[10px] font-black uppercase tracking-widest">{c.department || (c as any).department_name}</p>
                    <p className="mt-2 text-xs leading-relaxed">{c.text}</p>
                  </div>
                </PlanPin>
              ))}
            </div>
          </div>
        </main>

        <aside className="w-[380px] shrink-0 overflow-hidden border-l border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('DECISION')}
              className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition ${activeTab === 'DECISION' ? 'border-b-2 border-[#003366] bg-blue-50/40 text-[#003366]' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Decision
            </button>
            <button
              onClick={() => setActiveTab('COMMENTS')}
              className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition ${activeTab === 'COMMENTS' ? 'border-b-2 border-[#003366] bg-blue-50/40 text-[#003366]' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Comments
            </button>
          </div>

          <div className="h-full overflow-y-auto">
            {activeTab === 'DECISION' ? (
              <div className="space-y-5 p-5 pb-24">
                <div className={`rounded-lg p-4 ${profile.accent}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">Your Submission</p>
                  <p className="mt-2 text-lg font-black">{profile.actionTitle}</p>
                </div>

                <section className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Verdict</p>
                  <div className="space-y-2">
                    {verdicts.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVote(option.value)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          vote === option.value ? 'border-[#003366] bg-blue-50 text-[#003366]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-sm font-black">{option.label}</p>
                        <p className="mt-1 text-xs font-medium leading-relaxed opacity-75">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </section>

                {profile.requiresAmount && (
                  <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-800">Amount Payable</label>
                    <input
                      type="number"
                      value={amountPayable}
                      onChange={event => setAmountPayable(event.target.value)}
                      placeholder="Enter calculated fee"
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="mt-2 text-[10px] font-bold leading-relaxed text-amber-700">
                      This amount is used by Reception to generate the proforma invoice.
                    </p>
                  </section>
                )}

                <section className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{profile.remarksLabel}</label>
                  <textarea
                    value={comment}
                    onChange={event => setComment(event.target.value)}
                    placeholder="Enter detailed findings, conditions, or correction notes."
                    className="h-40 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {pin && <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">This remark will be pinned to the drawing.</p>}
                </section>

                <button
                  onClick={handleSubmitReview}
                  disabled={loading || !comment.trim()}
                  className="flex w-full items-center justify-center rounded-lg bg-slate-900 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : user?.role === 'DEPT_HEAD' ? 'Submit Head Decision' : 'Submit Review'}
                </button>
              </div>
            ) : (
              <div className="min-h-full space-y-4 bg-slate-50 p-4 pb-24">
                {localComments.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">No shared comments on this version yet</p>
                  </div>
                )}
                {localComments.map(c => (
                  <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-800">{c.department || (c as any).department_name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.author_name}</p>
                      </div>
                      <span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${c.status_vote === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {displayStatus(c.status_vote)}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-slate-600">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
