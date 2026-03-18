
import React, { useState } from 'react';
import { Plan, PlanStatus, UserProfile } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import * as api from '../services/api';

interface PlanDetailsProps {
    plan: Plan;
    user: UserProfile | null;
    onBack: () => void;
}

export const PlanDetails: React.FC<PlanDetailsProps> = ({ plan, onBack }) => {
    const [isResubmitting, setIsResubmitting] = useState(false);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resubmitting, setResubmitting] = useState(false);

    const handleSubmitResubmission = async () => {
        if (!selectedFile) return;
        setResubmitting(true);
        try {
            await api.resubmitPlan(plan.id, selectedFile, "Client resubmission Version 2");
            alert("Plan resubmitted successfully!");
            setIsResubmitting(false);
            onBack(); // Return to dashboard
        } catch (error) {
            console.error(error);
            alert("Failed to resubmit plan.");
        } finally {
            setResubmitting(false);
        }
    };

    const steps = [
        { id: 'RECEPTION', label: 'Reception Validation', status: 'COMPLETE' },
        { id: 'POOL', label: 'Technical Circulation', status: plan.status === 'REVIEW_POOL' || plan.status === 'IN_REVIEW' ? 'ACTIVE' : (plan.status === 'APPROVED' ? 'COMPLETE' : 'PENDING') },
        { id: 'FINAL', label: 'Final Sign-off', status: plan.status === 'APPROVED' ? 'COMPLETE' : (plan.status === 'FINAL_APPROVAL' ? 'ACTIVE' : 'PENDING') }
    ];

    const departmentReviews = (plan as any).department_reviews || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    title="Go back to dashboard"
                    className="p-3 bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 transition shadow-sm group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-[#003366] transition-colors" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                </button>
                <div>
                    <h1 className="text-2xl font-black text-[#003366] uppercase truncate max-w-xl">{plan.stand_addr}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plan.plan_id}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                        <StatusBadge status={plan.status} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Journey Timeline */}
                <div className="lg:col-span-2 space-y-6 text-slate-600">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" /></svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Application Progress</h3>

                        <div className="flex justify-between items-start relative px-4">
                            {/* Connector Line */}
                            <div className="absolute top-5 left-12 right-12 h-[2px] bg-slate-100 -z-0"></div>

                            {steps.map((step, idx) => (
                                <div key={step.id} className="flex flex-col items-center gap-4 relative z-10 w-32">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-colors duration-500 ${step.status === 'COMPLETE' ? 'bg-green-500 text-white' :
                                        step.status === 'ACTIVE' ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {step.status === 'COMPLETE' ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        ) : <span className="text-xs font-black">{idx + 1}</span>}
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${step.status === 'ACTIVE' ? 'text-blue-600' : 'text-slate-500'}`}>{step.label}</p>
                                        <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">
                                            {step.status === 'COMPLETE' ? 'Validated' : step.status === 'ACTIVE' ? 'In Progress' : 'Pending'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Query Loop / Comments Section */}
                    {plan.status === 'CORRECTIONS_REQUIRED' && (
                        <div className="bg-amber-50 rounded-3xl border border-amber-200 p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-amber-800 font-extrabold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    Action Needed: Council Feedback
                                </h3>
                                <div className="text-[10px] font-bold text-amber-600 uppercase bg-amber-100 px-3 py-1 rounded-full border border-amber-200">Action Required</div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-amber-700 leading-relaxed font-medium">BCC Department Officers have noted issues that prevent approval. Please address the following and upload Version 2 below.</p>
                                {departmentReviews.filter((r: any) => r.comment).map((r: any) => (
                                    <div key={r.id} className="bg-white/80 rounded-2xl p-6 border border-amber-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded uppercase">{r.department_name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(r.last_updated).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium italic">"{r.comment}"</p>
                                    </div>
                                ))}
                            </div>

                            {/* Resubmission UI */}
                            {!isResubmitting ? (
                                <button
                                    onClick={() => setIsResubmitting(true)}
                                    className="w-full bg-amber-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-amber-900/20 hover:bg-amber-700 transition"
                                >
                                    Respond & Upload Revised Plans
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="p-12 border-2 border-dashed border-amber-300 rounded-3xl flex flex-col items-center justify-center bg-white/50">
                                        <div className="text-3xl mb-4">📂</div>
                                        <p className="text-sm font-black text-[#003366] uppercase tracking-widest">{selectedFile ? selectedFile.name : 'Select Revised Version 2'}</p>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            title="Upload revised plan version"
                                            className="mt-4 text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setIsResubmitting(false); setSelectedFile(null); }} className="flex-1 p-4 bg-slate-200 rounded-2xl font-black text-slate-500">Cancel</button>
                                        <button
                                            onClick={handleSubmitResubmission}
                                            disabled={!selectedFile || resubmitting}
                                            className="flex-2 p-4 bg-green-600 text-white rounded-2xl font-black shadow-lg disabled:opacity-50"
                                        >
                                            {resubmitting ? 'Submitting...' : 'Submit Resubmission'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Document Center section for Approved Plans */}
                    {plan.status === 'APPROVED' && (
                        <div className="bg-blue-50/50 rounded-3xl border border-blue-100 p-8 space-y-6">
                            <h3 className="text-blue-900 font-extrabold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Official Council Documents
                            </h3>
                            <div className="bg-white rounded-2xl p-4 border border-blue-100 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-black">PDF</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-700 uppercase">Certified Building Plan</p>
                                        <p className="text-[10px] font-bold text-slate-400">SIGNED & QR-VERIFIED</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => (plan as any).sealed_document ? window.open((plan as any).sealed_document, '_blank') : alert("Document not ready.")}
                                    className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-black transition"
                                >
                                    Download Official Copy
                                </button>
                            </div>
                            <div className="p-4 bg-blue-100/30 rounded-2xl">
                                <p className="text-[10px] text-blue-700 font-bold leading-relaxed italic">Important: You must notify the Bulawayo Building Inspectorate at least 24 hours before commencing any trenching or foundation work as per BCC By-laws Section 12.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Details</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                                <span className="text-xs font-black text-slate-700 uppercase">{plan.category}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Stand No.</span>
                                <span className="text-xs font-black text-slate-700 uppercase">{plan.stand_addr.split(' (')[0]}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Area</span>
                                <span className="text-xs font-black text-slate-700 uppercase">{plan.declared_area || 0} sqm</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                        <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 border-dashed mb-4 group cursor-help">
                            <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-500 transition-colors uppercase">Property Location Map</span>
                        </div>
                        <p className="text-[8px] text-slate-400 uppercase font-black">Stand verified within BCC City Boundaries</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
