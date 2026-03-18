import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Plan } from '../types';

interface ClientResponseViewProps {
    plan: Plan;
    onSuccess: () => void;
    onCancel: () => void;
}

const REQUIRED_DOCS = [
    { label: 'Proforma Invoice (Receipt)', type: 'RECEIPT' },
    { label: 'Clear Rates Balance (BCC Contacts)', type: 'RATES' },
    { label: 'Re-uploaded Plan (if modified)', type: 'PLAN' },
    { label: 'Engineer Certificate', type: 'ENG_CERT' },
    { label: 'Agreement of Sale / Lease Agreement', type: 'OWNERSHIP' },
    { label: 'Title Deeds', type: 'DEED' },
    { label: 'Architect Registration Certificate', type: 'ARCH_CERT' },
    { label: 'Engineer’s Structural Drawings', type: 'ENG_DRAWINGS' },
    { label: 'Letter from Neighbor', type: 'NEIGHBOR' },
];

export const ClientResponseView: React.FC<ClientResponseViewProps> = ({ plan, onSuccess, onCancel }) => {
    const [description, setDescription] = useState(plan.development_description || '');
    const [uploads, setUploads] = useState<Record<string, File | null>>({});
    const [loading, setLoading] = useState(false);
    const [submittedDocs, setSubmittedDocs] = useState<any[]>([]);

    useEffect(() => {
        api.getSubmittedDocuments(plan.id).then(setSubmittedDocs);
    }, [plan.id]);

    const handleFileChange = (label: string, file: File | null) => {
        setUploads(prev => ({ ...prev, [label]: file }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Update description if changed
            if (description !== plan.development_description) {
                await api.updatePlan(plan.id, { development_description: description });
            }

            // Upload files
            for (const [label, file] of Object.entries(uploads)) {
                if (file) {
                    await api.uploadSubmittedDocument(plan.id, file, label);
                }
            }

            // Transition status (assuming there's an endpoint or it happens automatically)
            // For now, just notifying success
            alert('Response submitted successfully! Reception will verify your documents.');
            onSuccess();
        } catch (e: any) {
            alert(`Error submitting response: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const isDocUploaded = (label: string) => {
        return submittedDocs.some(d => d.label === label) || !!uploads[label];
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden max-w-4xl mx-auto font-interface">
            <div className="bg-[#003366] px-12 py-10 text-white flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-black tracking-tight mb-2">Complete Your Application</h2>
                    <p className="text-blue-200/60 font-medium text-sm">{plan.plan_id} · {plan.stand_addr}</p>
                </div>
                <button onClick={onCancel} title="Close" className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">✕</button>
            </div>

            <div className="p-12 space-y-10">
                {/* Description */}
                <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Description of Development</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g. Church, Church Hall, Factory, New Residence, Shop, etc."
                        rows={3}
                        className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold text-slate-800"
                    />
                </div>

                {/* Document List */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Required Documentation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {REQUIRED_DOCS.map(doc => (
                            <div key={doc.label} className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${isDocUploaded(doc.label) ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                                <div className="flex-1">
                                    <p className={`text-xs font-black uppercase tracking-tight ${isDocUploaded(doc.label) ? 'text-emerald-700' : 'text-slate-700'}`}>{doc.label}</p>
                                    {uploads[doc.label] && <p className="text-[9px] text-emerald-600 font-bold mt-1 truncate">Ready: {uploads[doc.label]?.name}</p>}
                                </div>
                                <div className="relative">
                                    <input
                                        type="file"
                                        onChange={e => handleFileChange(doc.label, e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        title={doc.label}
                                    />
                                    <button className={`p-2 rounded-lg transition-all ${isDocUploaded(doc.label) ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {isDocUploaded(doc.label) ? '✓' : '+'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 pt-6">
                    <button onClick={onCancel} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Submitting...' : 'Submit Complete Dossier'}
                    </button>
                </div>
            </div>
        </div>
    );
};
