
import React, { useState, useEffect } from 'react';
import { Plan, PlanStatus, DepartmentComment, Flag } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { COLORS } from '../constants';
import * as api from '../services/api';

interface ReviewInterfaceProps {
  plan: Plan;
  onBack: () => void;
  user: any;
}

const PlanPin: React.FC<{ x: number, y: number, children: React.ReactNode, className?: string }> = ({ x, y, children, className }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.left = `${x}%`;
      ref.current.style.top = `${y}%`;
    }
  }, [x, y]);
  return <div ref={ref} className={className}>{children}</div>;
};

export const ReviewInterface: React.FC<ReviewInterfaceProps> = ({ plan, onBack, user }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'COMMENTS'>('VIEW');
  const [comment, setComment] = useState('');
  const [vote, setVote] = useState<'APPROVED' | 'CORRECTIONS_REQUIRED' | 'REJECTED'>('APPROVED');
  const [pin, setPin] = useState<{ x: number, y: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [localComments, setLocalComments] = useState<DepartmentComment[]>([]);

  useEffect(() => {
    // In real app, fetch latest comments for the current plan version
    if (plan.id) {
      api.getPlanDetail(plan.id).then(data => {
        // Handle nested comments if available
      });
    }
  }, [plan.id]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPin({ x, y });
    setActiveTab('VIEW');
  };

  const handleSubmitReview = async () => {
    if (!comment) return;
    setLoading(true);
    try {
      const currentVersionId = 1; // Needs to be dynamic
      const res = await api.addComment(
        currentVersionId,
        user.department || 1,
        comment,
        vote,
        pin?.x,
        pin?.y
      );
      // Update local UI
      setLocalComments([...localComments, res]);
      setComment('');
      setPin(null);
    } catch (e) {
      console.error(e);
      alert("Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden">
      {/* 1. Top Navigation Bar (The Context Header) */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Go back"
            title="Go back"
            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="sr-only">Go back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#003366] rounded flex items-center justify-center text-white font-bold text-xs">BCC</div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-none">{plan.plan_id}</h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-wider">Plan ID</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <StatusBadge status={plan.status} />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Status</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{user.full_name}</p>
              <p className="text-[10px] text-slate-500 font-medium">{user.role}</p>
            </div>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <button onClick={onBack} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition shadow-sm">
            Return to Queue
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. Left Sidebar (Information & Tool Palette) */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Property Data</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Stand Number</label>
                <p className="text-sm font-bold text-slate-700">{plan.stand_addr.split('—')[0] || 'N/A'}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Address / Suburb</label>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">{plan.stand_addr}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">{plan.category}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Area Verification</h3>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-medium text-slate-500">Declared</span>
                <span className="text-xs font-bold text-slate-700">{plan.declared_area} m²</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-medium text-slate-500">Calculated</span>
                <span className={`text-xs font-bold ${Math.abs((plan.calculated_area || 0) - (plan.declared_area || 0)) > (plan.declared_area || 0) * 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                  {plan.calculated_area} m²
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className={`text-[10px] font-bold text-center ${Math.abs((plan.calculated_area || 0) - (plan.declared_area || 0)) > (plan.declared_area || 0) * 0.05 ? 'text-red-500' : 'text-green-500'}`}>
                  {Math.abs((plan.calculated_area || 0) - (plan.declared_area || 0)) > (plan.declared_area || 0) * 0.05 ? '⚠️ AREA MISMATCH DETECTED' : '✅ AREA WITHIN TOLERANCE'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Markup Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                aria-label="Add comment pin"
                title="Add comment pin"
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition ${pin ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="text-lg">📍</span> Pin
                <span className="sr-only">Add comment pin</span>
              </button>
              <button
                aria-label="Measure tool"
                title="Measure tool"
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition opacity-50 cursor-not-allowed"
              >
                <span className="text-lg">📏</span> Ruler
                <span className="sr-only">Measure tool</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white mt-auto rounded-b-xl">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Version Controller</label>
            <select
              aria-label="Select plan version"
              title="Select plan version"
              className="w-full bg-slate-800 border-none rounded p-2 text-xs font-bold outline-none ring-1 ring-white/10"
            >
              <option>Version 1 (Initial)</option>
              <option disabled>Version 2 (Not available)</option>
            </select>
          </div>
        </div>

        {/* 3. Center Canvas (The Document Viewer Engine) */}
        <div className="flex-1 bg-slate-200 relative overflow-auto p-8 flex justify-center">
          <div
            className="bg-white shadow-2xl relative cursor-crosshair min-w-[800px] aspect-[1/1.41] origin-top scale-100"
            onClick={handleCanvasClick}
          >
            {/* PDF Mock Content */}
            <div className="w-full h-full p-12 border border-slate-300 pointer-events-none select-none">
              <div className="border-[12px] border-slate-100 w-full h-full flex flex-col p-8 opacity-40">
                <h1 className="text-5xl font-black text-slate-200 text-center mb-12">ARCHITECTURAL DRAWING</h1>
                <div className="flex-1 border-4 border-slate-100 border-dashed rounded-3xl flex items-center justify-center">
                  <p className="text-9xl font-bold text-slate-100">PLAN</p>
                </div>
              </div>
            </div>

            {/* Pin Overlays */}
            {pin && (
              <PlanPin
                x={pin.x}
                y={pin.y}
                className="absolute animate-bounce -translate-x-1/2 -translate-y-full"
              >
                <div className="text-3xl filter drop-shadow-md">📍</div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded -mt-8 whitespace-nowrap shadow-lg">New Comment</div>
              </PlanPin>
            )}

            {/* Existing Pins */}
            {localComments.filter(c => c.pdf_pin_x).map(c => (
              <PlanPin
                key={c.id}
                x={c.pdf_pin_x || 0}
                y={c.pdf_pin_y || 0}
                className="absolute group -translate-x-1/2 -translate-y-full"
              >
                <div className={`text-2xl filter drop-shadow-sm cursor-help ${c.status_vote === 'REJECTED' ? 'brightness-75' : ''}`}>📍</div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-xl w-48 mb-2 z-30">
                  <p className="font-bold border-b border-white/20 pb-1 mb-1">{c.department}</p>
                  <p className="opacity-90">{c.text}</p>
                </div>
              </PlanPin>
            ))}
          </div>
        </div>

        {/* 4. Right Sidebar (Concurrent Collaboration & Sign-off) */}
        <div className="w-84 bg-white border-l border-slate-200 flex flex-col shadow-sm">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('VIEW')}
              className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-widest transition ${activeTab === 'VIEW' ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Decision
            </button>
            <button
              onClick={() => setActiveTab('COMMENTS')}
              className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-widest transition ${activeTab === 'COMMENTS' ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Round Table
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'VIEW' ? (
              <div className="p-6 space-y-6">
                <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Your Submission</h4>
                  <p className="text-lg font-bold leading-tight">Complete Technical Review</p>
                </div>

                <section className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verdict</label>
                    <select
                      aria-label="Select review verdict"
                      title="Select review verdict"
                      value={vote}
                      onChange={(e: any) => setVote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="APPROVED">Approve (No Conditions)</option>
                      <option value="CORRECTIONS_REQUIRED">Approve with Conditions</option>
                      <option value="REJECTED">Reject / Revoke</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Technical Remarks</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Enter your detailed findings here..."
                      className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    disabled={loading || !comment}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Sign & Submit to Head'}
                  </button>
                </section>
              </div>
            ) : (
              <div className="p-4 space-y-4 bg-slate-50 min-h-full">
                {localComments.length === 0 && (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest leading-relaxed">No shared comments<br />on this version yet</p>
                  </div>
                )}
                {localComments.map((c) => (
                  <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{c.department}</p>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{c.author_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${c.status_vote === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {c.status_vote}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">"{c.text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
