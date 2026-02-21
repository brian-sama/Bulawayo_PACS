
import React, { useState, useEffect } from 'react';
import { Plan, UserProfile } from '../types';
import * as api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface FinalApprovalProps {
    user: UserProfile;
}

export const FinalApproval: React.FC<FinalApprovalProps> = ({ user }) => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        setLoading(true);
        api.getPlans().then(data => {
            setPlans(data.filter(p => p.status === 'REVIEW_POOL' || p.status === 'IN_REVIEW')); // Simplified filter
            setLoading(false);
        });
    }, []);

    const handleSeal = async () => {
        if (!selectedPlan || !password) return;
        setLoading(true);
        try {
            await api.approveFinal(selectedPlan.id, password, notes);
            alert("Plan Sealed and Digitally Signed!");
            setSelectedPlan(null);
            setPassword('');
            setNotes('');
            // Refresh list
        } catch (e) {
            alert("Error sealing plan. Check password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full gap-6">
            <div className="w-1/2 space-y-4">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Final Approval Queue</h2>
                {plans.map(p => (
                    <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPlan?.id === p.id ? 'border-[#003366] bg-blue-50' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-800">{p.plan_id}</h3>
                            <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{p.stand_addr}</p>
                    </div>
                ))}
            </div>

            <div className="w-1/2">
                {selectedPlan ? (
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col h-full">
                        <div className="border-b border-slate-100 pb-6 mb-6">
                            <h3 className="text-2xl font-black text-[#003366] mb-2 uppercase tracking-tight">Executive Seal</h3>
                            <p className="text-slate-500 text-sm">Reviewing consolidated department findings for <strong>{selectedPlan.plan_id}</strong></p>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Department Summary</h4>
                                <div className="space-y-2">
                                    {/* Summary items */}
                                    <div className="flex justify-between text-xs font-bold text-green-600">
                                        <span>Fire Safety</span>
                                        <span>✅ APPROVED</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-green-600">
                                        <span>Engineering</span>
                                        <span>✅ APPROVED</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-blue-600">
                                        <span>Health & Enviro</span>
                                        <span>✅ APPROVED (COND)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Final Remarks</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter official approval notes..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Secondary Signature Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSeal}
                            disabled={loading || !password}
                            className="mt-8 w-full bg-[#003366] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-100 hover:bg-black transition disabled:opacity-50"
                        >
                            {loading ? 'Cryptographic Sealing...' : 'Apply Official Seal'}
                        </button>
                    </div>
                ) : (
                    <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-12 text-center">
                        <div>
                            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-300 mb-4 text-3xl">🔏</div>
                            <h3 className="font-bold text-slate-400">Select a plan from the queue to review and apply the executive seal.</h3>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
