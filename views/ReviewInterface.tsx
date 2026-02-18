
import React, { useState, useEffect } from 'react';
import { Plan, PlanStatus, DepartmentComment } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { COLORS } from '../constants';
import { summarizePlanStatus, detectBuildingCodeFlags } from '../services/geminiService';

interface ReviewInterfaceProps {
  plan: Plan;
  onBack: () => void;
}

export const ReviewInterface: React.FC<ReviewInterfaceProps> = ({ plan, onBack }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'COMMENTS' | 'HISTORY'>('VIEW');
  const [comment, setComment] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAiData = async () => {
      setLoading(true);
      try {
        const summary = await summarizePlanStatus(JSON.stringify(plan.comments));
        setAiSummary(summary || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAiData();
  }, [plan]);

  const handleAddComment = async () => {
    if (!comment) return;
    setLoading(true);
    const newFlags = await detectBuildingCodeFlags(comment);
    setFlags([...flags, ...newFlags]);
    setComment('');
    setLoading(false);
    // In a real app, save comment to state/DB
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{plan.id}</h2>
            <p className="text-sm text-slate-500">{plan.propertyAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={plan.status} />
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-green-700 transition">
            Final Approval
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Plan Viewer Mockup */}
        <div className="w-2/3 bg-slate-100 border-r border-slate-200 relative overflow-auto p-4 flex items-center justify-center">
          <div className="bg-white shadow-2xl rounded p-8 w-[595px] h-[842px] relative">
             <div className="absolute top-8 left-8 border-4 border-slate-200 p-4 opacity-10 rotate-[-15deg] select-none">
                <h1 className="text-4xl font-bold">BCC OFFICIAL ARCHITECTURAL PLAN</h1>
             </div>
             <div className="w-full h-full border-2 border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
                <p className="font-mono text-xs mb-2">RENDER_VIEW_PORTAL_V4.3</p>
                <div className="w-4/5 h-1/2 bg-slate-50 border border-slate-200 rounded"></div>
                <div className="grid grid-cols-2 gap-4 w-4/5 mt-4">
                  <div className="h-20 bg-slate-50 border border-slate-200 rounded"></div>
                  <div className="h-20 bg-slate-50 border border-slate-200 rounded"></div>
                </div>
             </div>
          </div>
          
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <button className="bg-white p-2 rounded shadow border border-slate-200 hover:bg-slate-50 text-slate-700">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
            </button>
            <button className="bg-white p-2 rounded shadow border border-slate-200 hover:bg-slate-50 text-slate-700">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>

        {/* Right Side: Review Panel */}
        <div className="w-1/3 flex flex-col bg-white overflow-hidden">
          <div className="flex border-b border-slate-200">
             <button 
               onClick={() => setActiveTab('VIEW')}
               className={`flex-1 py-3 text-sm font-bold tracking-tight transition ${activeTab === 'VIEW' ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               Review Tools
             </button>
             <button 
               onClick={() => setActiveTab('COMMENTS')}
               className={`flex-1 py-3 text-sm font-bold tracking-tight transition ${activeTab === 'COMMENTS' ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               Comments ({plan.comments.length})
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'VIEW' && (
              <>
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">AI Intelligence Insights</h4>
                  {loading ? (
                    <div className="flex gap-2 animate-pulse">
                      <div className="h-4 w-4 bg-blue-200 rounded-full"></div>
                      <div className="h-4 flex-1 bg-slate-100 rounded"></div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-900 italic">
                      "{aiSummary || "No AI summary generated yet."}"
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Compliance Flags</h4>
                  <div className="space-y-3">
                    {flags.length === 0 && (
                      <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200 text-center">
                        No critical flags detected by AI system.
                      </div>
                    )}
                    {flags.map((flag, idx) => (
                      <div key={idx} className={`flex gap-3 p-3 rounded-lg border ${flag.type === 'ERROR' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                        <span className={`text-lg ${flag.type === 'ERROR' ? 'text-red-500' : 'text-amber-500'}`}>
                          {flag.type === 'ERROR' ? '⚠️' : 'ℹ️'}
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide opacity-60">{flag.department}</p>
                          <p className="text-sm font-medium">{flag.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Submit Your Review</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Action</label>
                      <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>Approve Department</option>
                        <option>Request Corrections</option>
                        <option>Reject Submission</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Note</label>
                      <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Type findings here..."
                        className="w-full h-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    <button 
                      onClick={handleAddComment}
                      disabled={loading || !comment}
                      className="w-full bg-[#003366] text-white py-2 rounded-lg font-bold text-sm hover:bg-[#002244] disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Submit & Sign Review'}
                    </button>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'COMMENTS' && (
              <div className="space-y-4">
                {plan.comments.map((c) => (
                  <div key={c.id} className="border-l-4 border-blue-800 pl-4 py-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-slate-800">{c.department}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase pt-1">
                      <span>By {c.author}</span>
                      <span>{c.timestamp}</span>
                    </div>
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
