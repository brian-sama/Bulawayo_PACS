
import React, { useState } from 'react';
import * as api from '../services/api';
import { Plan } from '../types';

interface SubmissionWizardProps {
    onCancel: () => void;
    onSuccess: (plan: Plan) => void;
}

export const SubmissionWizard: React.FC<SubmissionWizardProps> = ({ onCancel, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State (Single Source of Truth)
    const [formData, setFormData] = useState({
        property: {
            standNumber: "",
            suburb: "",
            category: "RESIDENTIAL",
        },
        ownership: {
            isApplicantOwner: true,
            ownerFullName: "",
            powerOfAttorneyFile: null as File | null,
        },
        geometry: {
            declaredArea: "",
            shapes: [{ type: 'rectangle', dimensions: { length: 0, width: 0 } }] as any[],
        },
        documents: {
            architecturalPlans: [] as File[],
            titleDeedFile: null as File | null,
            structuralCertificate: null as File | null,
        },
        payment: {
            receiptNumber: "",
            receiptProofFile: null as File | null,
        }
    });

    const handleTextInput = (stepKey: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [stepKey]: {
                ...(prev as any)[stepKey],
                [field]: value
            }
        }));
    };

    const handleFileUpload = (stepKey: string, field: string, fileList: FileList | null) => {
        if (!fileList) return;
        setFormData(prev => ({
            ...prev,
            [stepKey]: {
                ...(prev as any)[stepKey],
                [field]: field === 'architecturalPlans' ? Array.from(fileList) : fileList[0]
            }
        }));
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = new FormData();

            payload.append('stand_number', formData.property.standNumber);
            payload.append('suburb', formData.property.suburb);
            payload.append('category', formData.property.category);
            payload.append('is_owner', String(formData.ownership.isApplicantOwner));

            if (!formData.ownership.isApplicantOwner) {
                payload.append('owner_name', formData.ownership.ownerFullName);
                if (formData.ownership.powerOfAttorneyFile) {
                    payload.append('power_of_attorney', formData.ownership.powerOfAttorneyFile);
                }
            }

            payload.append('declared_area', formData.geometry.declaredArea || "0");
            payload.append('shapes', JSON.stringify(formData.geometry.shapes));

            if (formData.documents.titleDeedFile) {
                payload.append('title_deed', formData.documents.titleDeedFile);
            }
            if (formData.documents.structuralCertificate) {
                payload.append('structural_cert', formData.documents.structuralCertificate);
            }
            formData.documents.architecturalPlans.forEach((file, i) => {
                payload.append(`plan_file_${i}`, file);
            });

            payload.append('receipt_number', formData.payment.receiptNumber);
            if (formData.payment.receiptProofFile) {
                payload.append('receipt_scan', formData.payment.receiptProofFile);
            }

            const response = await api.apiFetch('/plans/', {
                method: 'POST',
                body: payload
            });

            await api.runAutoChecks(response.id);
            onSuccess(response);
        } catch (e) {
            console.error(e);
            alert("Error submitting plan. Please check inputs and try again.");
        } finally {
            setLoading(false);
        }
    };

    const addShape = () => {
        setFormData({
            ...formData,
            geometry: {
                ...formData.geometry,
                shapes: [...formData.geometry.shapes, { type: 'rectangle', dimensions: { length: 0, width: 0 } }]
            }
        });
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden max-w-4xl mx-auto font-interface animate-in fade-in zoom-in-95 duration-500">
            {/* Header Content */}
            <div className="bg-[#003366] px-12 py-12 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2">New Plan Submission</h2>
                        <p className="text-blue-200/60 font-medium text-sm">Follow the 5-step process to lodge your architectural submission.</p>
                    </div>
                    <button onClick={onCancel} title="Close Wizard" className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Visual Progress Stepper */}
                <div className="mt-10 flex gap-3 relative z-10">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex-1 flex flex-col gap-2">
                            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'bg-white' : 'bg-white/10'}`}></div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${step === i ? 'text-white' : 'text-white/30'}`}>Step {i}</span>
                        </div>
                    ))}
                </div>

                {/* Abstract decoration */}
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <div className="p-12">
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Property Details</h3>
                            <p className="text-sm font-medium text-slate-400">Identify the location and classification of development.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Stand Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 5432-SUB / Byo-2026-X"
                                    value={formData.property.standNumber}
                                    onChange={e => handleTextInput('property', 'standNumber', e.target.value)}
                                    className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold text-slate-800 placeholder:text-slate-300"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Select Suburb</label>
                                <select
                                    title="Select Suburb"
                                    value={formData.property.suburb}
                                    onChange={e => handleTextInput('property', 'suburb', e.target.value)}
                                    className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold text-slate-800 appearance-none"
                                >
                                    <option value="">Choose District...</option>
                                    <option value="Khumalo">Khumalo</option>
                                    <option value="Cowdray Park">Cowdray Park</option>
                                    <option value="Belmont">Belmont</option>
                                    <option value="Hillside">Hillside</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex gap-4 items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">ℹ️</div>
                            <p className="text-xs font-medium text-blue-800 leading-relaxed">Ensure the stand number matches the Title Deed exactly to avoid technical rejection during automated GIS validation.</p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Ownership Validation</h3>
                            <p className="text-sm font-medium text-slate-400">Confirm you have the legal right to submit plans for this stand.</p>
                        </div>

                        <div
                            onClick={() => handleTextInput('ownership', 'isApplicantOwner', !formData.ownership.isApplicantOwner)}
                            className={`p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center gap-6 group ${formData.ownership.isApplicantOwner ? 'bg-[#003366] border-[#003366] text-white shadow-xl' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${formData.ownership.isApplicantOwner ? 'bg-white/10 text-white' : 'bg-slate-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors'}`}>
                                🏠
                            </div>
                            <div>
                                <h4 className="font-black text-lg mb-1 leading-none">I am the Registered Owner</h4>
                                <p className={`text-xs font-medium ${formData.ownership.isApplicantOwner ? 'text-blue-200' : 'text-slate-400'}`}>My profile details match the property Title Deed.</p>
                            </div>
                            <div className={`ml-auto w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${formData.ownership.isApplicantOwner ? 'bg-white border-white' : 'border-slate-200 group-hover:border-blue-400'}`}>
                                {formData.ownership.isApplicantOwner && <svg className="w-5 h-5 text-[#003366]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                        </div>

                        {!formData.ownership.isApplicantOwner && (
                            <div className="space-y-8 p-10 bg-[#F9FAFB] rounded-[2.5rem] border border-slate-100 animate-in zoom-in-95 duration-300">
                                <div className="space-y-3">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Legal Owner's Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Full legal name as per Title Deed"
                                        value={formData.ownership.ownerFullName}
                                        onChange={e => handleTextInput('ownership', 'ownerFullName', e.target.value)}
                                        className="w-full bg-white border border-slate-100 rounded-2xl p-5 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold text-slate-800"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Authorization Link (PDF)</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center hover:border-blue-400 hover:bg-white transition-all cursor-pointer group relative">
                                        <input
                                            title="Power of Attorney"
                                            type="file"
                                            onChange={e => handleFileUpload('ownership', 'powerOfAttorneyFile', e.target.files)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform">📄</div>
                                        <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Upload Power of Attorney</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Max 10MB • Required for consultants</p>
                                        {formData.ownership.powerOfAttorneyFile && (
                                            <div className="mt-4 text-[10px] font-black text-emerald-600 uppercase">✓ {formData.ownership.powerOfAttorneyFile.name}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Development Context</h3>
                                <p className="text-sm font-medium text-slate-400">Specify the total building area and structural footprints.</p>
                            </div>
                            <button onClick={addShape} className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                + Add Geometry
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Gross Floor Area (GFA)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.geometry.declaredArea}
                                        onChange={e => handleTextInput('geometry', 'declaredArea', e.target.value)}
                                        className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-black text-2xl text-[#003366] pr-16"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 pointer-events-none uppercase text-xs tracking-widest">SQM</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">System will verify against attached PDF scale.</p>
                            </div>

                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed flex items-center justify-center text-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Automated Zoning Check<br />Ready for Step 4</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Technical Dossier</h3>
                            <p className="text-sm font-medium text-slate-400">High-resolution PDF binaries required for departmental circulation.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 bg-[#F9FAFB] hover:bg-white transition-all cursor-pointer relative group">
                                <input
                                    title="Architectural Plans"
                                    type="file"
                                    multiple
                                    onChange={e => handleFileUpload('documents', 'architecturalPlans', e.target.files)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl group-hover:scale-110 transition-transform">📂</div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Architectural Drawings</h4>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">Submit full set of floor plans, sections, and elevations.</p>
                                    {formData.documents.architecturalPlans.length > 0 && (
                                        <div className="mt-3 flex gap-2">
                                            <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">{formData.documents.architecturalPlans.length} Files Selected</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-blue-200">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 bg-[#F9FAFB] hover:bg-white transition-all cursor-pointer relative group">
                                <input
                                    title="Title Deed"
                                    type="file"
                                    onChange={e => handleFileUpload('documents', 'titleDeedFile', e.target.files)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl group-hover:scale-110 transition-transform">📜</div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Proof of Ownership</h4>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">Certified copy of Title Deed or registered Lease Agreement.</p>
                                    {formData.documents.titleDeedFile && (
                                        <div className="mt-3 text-[9px] font-black text-emerald-600 uppercase">✓ {formData.documents.titleDeedFile.name}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Fee Settlement</h3>
                            <p className="text-sm font-medium text-slate-400">Validate the administrative submission fee to initiate review.</p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">BCC Treasury Receipt #</label>
                                <input
                                    type="text"
                                    placeholder="e.g. BYO-PAY-992381"
                                    value={formData.payment.receiptNumber}
                                    onChange={e => handleTextInput('payment', 'receiptNumber', e.target.value)}
                                    className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-mono font-black text-xl text-blue-600 tracking-wider"
                                />
                            </div>

                            <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-[#F9FAFB] text-center relative group overflow-hidden">
                                <input
                                    title="Receipt Proof"
                                    type="file"
                                    onChange={e => handleFileUpload('payment', 'receiptProofFile', e.target.files)}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                />
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">💰</div>
                                    <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Attach Proof of Payment</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Instant verification via Treasury API</p>
                                    {formData.payment.receiptProofFile && (
                                        <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 inline-flex items-center gap-3">
                                            <span className="text-emerald-600 text-lg">✅</span>
                                            <span className="text-[10px] font-black text-emerald-800 uppercase">{formData.payment.receiptProofFile.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Controls */}
                <div className="mt-16 flex justify-between gap-6">
                    {step > 1 ? (
                        <button
                            onClick={handleBack}
                            disabled={loading}
                            className="bg-slate-50 text-slate-400 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all disabled:opacity-50"
                        >
                            Previous Step
                        </button>
                    ) : <div />}

                    {step < 5 ? (
                        <button
                            onClick={handleNext}
                            className="bg-[#003366] text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_15px_30px_rgba(0,51,102,0.3)] hover:bg-[#002244] hover:shadow-[0_10px_20px_rgba(0,51,102,0.4)] hover:translate-y-[-2px] active:translate-y-0 transition-all"
                        >
                            Continue Submission
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.payment.receiptNumber}
                            className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_15px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-700 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? (
                                <span className="flex items-center gap-3">
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    LODGING APPLICATION...
                                </span>
                            ) : 'Lodge My Final Application'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
