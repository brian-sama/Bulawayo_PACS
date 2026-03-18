
import React, { useState } from 'react';
import * as api from '../services/api';
import { Plan } from '../types';

interface SubmissionWizardProps {
    onCancel: () => void;
    onSuccess: (plan: Plan) => void;
}

type SubmissionType = 'PRELIMINARY' | 'FINAL';

// ── Step labels per submission type ──────────────────────────────────────────
const FINAL_STEPS   = ['Property', 'Ownership', 'Development Context', 'Documents', 'Payment'];
const PRELIM_STEPS  = ['Property', 'Ownership', 'Development Context', 'Plan File'];

export const SubmissionWizard: React.FC<SubmissionWizardProps> = ({ onCancel, onSuccess }) => {

    // ── Global wizard state ────────────────────────────────────────────────
    // step 0 = submission type selector (not shown in progress bar)
    const [step,           setStep]           = useState(0);
    const [submissionType, setSubmissionType] = useState<SubmissionType | null>(null);
    const [loading,        setLoading]        = useState(false);

    // ── Form Data ──────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        property: {
            standNumber: '',
            suburb: '',
            category: 'RESIDENTIAL',
            standType: 'RESIDENTIAL_HIGH_DENSITY',
            developmentDescription: '',
        },
        ownership: {
            isApplicantOwner: true,          // true = owner, false = representative
            ownerFullName: '',               // name of legal owner (if representative)
            ownerContact: '',               // owner contact number
            powerOfAttorneyFile: null as File | null,
        },
        geometry: {
            declaredArea: '',
            shapes: [{ type: 'rectangle', dimensions: { length: 0, width: 0 } }] as any[],
        },
        documents: {
            architecturalPlanPdf: null as File | null,
            architecturalPlanDwg: null as File | null,
            titleDeedFile:        null as File | null,
            structuralCertificate: null as File | null,
        },
        payment: {
            receiptNumber:   '',
            receiptProofFile: null as File | null,
        },
        // Used for PRELIMINARY path only
        preliminary: {
            planFile: null as File | null,
        },
    });

    // ── Helpers ────────────────────────────────────────────────────────────
    const handleTextInput = (section: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: { ...(prev as any)[section], [field]: value }
        }));
    };

    const handleFileUpload = (section: string, field: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        setFormData(prev => ({
            ...prev,
            [section]: { ...(prev as any)[section], [field]: files[0] }
        }));
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => {
        if (step === 1) { setStep(0); setSubmissionType(null); }
        else setStep(s => s - 1);
    };

    const addShape = () => {
        setFormData(prev => ({
            ...prev,
            geometry: { ...prev.geometry, shapes: [...prev.geometry.shapes, { type: 'rectangle', dimensions: { length: 0, width: 0 } }] }
        }));
    };

    // ── FINAL submit ────────────────────────────────────────────────────────
    const handleFinalSubmit = async () => {
        setLoading(true);
        try {
            const payload = new FormData();
            payload.append('stand_number', formData.property.standNumber);
            payload.append('suburb',       formData.property.suburb);
            payload.append('category',     formData.property.category);
            payload.append('stand_type',   formData.property.standType);
            payload.append('development_description', formData.property.developmentDescription);
            payload.append('submission_type', 'FINAL');
            payload.append('is_owner',     String(formData.ownership.isApplicantOwner));
            payload.append('is_representative', String(!formData.ownership.isApplicantOwner));

            if (!formData.ownership.isApplicantOwner) {
                payload.append('represents_owner_name',    formData.ownership.ownerFullName);
                payload.append('represents_owner_contact', formData.ownership.ownerContact);
                if (formData.ownership.powerOfAttorneyFile)
                    payload.append('power_of_attorney', formData.ownership.powerOfAttorneyFile);
            }

            payload.append('declared_area', formData.geometry.declaredArea || '0');
            payload.append('shapes',        JSON.stringify(formData.geometry.shapes));

            if (formData.documents.titleDeedFile)
                payload.append('title_deed', formData.documents.titleDeedFile);
            if (formData.documents.structuralCertificate)
                payload.append('structural_cert', formData.documents.structuralCertificate);
            if (formData.documents.architecturalPlanPdf)
                payload.append('plan_file_0', formData.documents.architecturalPlanPdf);
            if (formData.documents.architecturalPlanDwg)
                payload.append('plan_file_1', formData.documents.architecturalPlanDwg);

            payload.append('receipt_number', formData.payment.receiptNumber);
            if (formData.payment.receiptProofFile)
                payload.append('receipt_scan', formData.payment.receiptProofFile);

            const plan = await api.apiFetch('/plans/', { method: 'POST', body: payload });
            await api.runAutoChecks(plan.id);
            onSuccess(plan);
        } catch (e) {
            console.error(e);
            alert('Error submitting plan. Please check inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── PRELIMINARY submit (2 steps: create plan draft → submit_preliminary) ──
    const handlePreliminarySubmit = async () => {
        if (!formData.preliminary.planFile) {
            alert('Please upload your plan PDF file.');
            return;
        }
        setLoading(true);
        try {
            // Step 1: create the plan record (draft)
            const initPayload = new FormData();
            initPayload.append('stand_number', formData.property.standNumber);
            initPayload.append('suburb',       formData.property.suburb);
            initPayload.append('category',     formData.property.category);
            initPayload.append('stand_type',   formData.property.standType);
            initPayload.append('development_description', formData.property.developmentDescription);
            initPayload.append('submission_type', 'PRELIMINARY');
            initPayload.append('is_owner',     String(formData.ownership.isApplicantOwner));
            initPayload.append('is_representative', String(!formData.ownership.isApplicantOwner));

            if (!formData.ownership.isApplicantOwner) {
                initPayload.append('represents_owner_name',    formData.ownership.ownerFullName);
                initPayload.append('represents_owner_contact', formData.ownership.ownerContact);
                if (formData.ownership.powerOfAttorneyFile)
                    initPayload.append('power_of_attorney', formData.ownership.powerOfAttorneyFile);
            }

            initPayload.append('declared_area', formData.geometry.declaredArea || '0');

            const plan = await api.apiFetch('/plans/', { method: 'POST', body: initPayload });

            // Step 2: submit as preliminary (attaches plan file + transitions status)
            const prelimPayload = new FormData();
            prelimPayload.append('plan_file', formData.preliminary.planFile);
            await api.apiFetch(`/plans/${plan.id}/submit_preliminary/`, {
                method: 'POST',
                body: prelimPayload
            });

            onSuccess(plan);
        } catch (e) {
            console.error(e);
            alert('Error submitting preliminary application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Determine step labels and max steps ─────────────────────────────────
    const steps = submissionType === 'FINAL' ? FINAL_STEPS : PRELIM_STEPS;
    const maxStep = steps.length; // steps start at 1 in this mode

    // ── STEP 0: Submission Type Selector ────────────────────────────────────
    if (step === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-[#003366] px-12 py-12 text-white relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight mb-2">New Plan Submission</h2>
                            <p className="text-blue-200/60 font-medium text-sm">Choose how you wish to submit your plans to the Bulawayo Building Inspectorate.</p>
                        </div>
                        <button onClick={onCancel} title="Close" className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                </div>

                <div className="p-12 space-y-8">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Select Submission Mode</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* PRELIMINARY */}
                            <div
                                onClick={() => { setSubmissionType('PRELIMINARY'); setStep(1); }}
                                className="group p-8 rounded-[2rem] border-2 border-slate-100 hover:border-amber-400 hover:shadow-xl cursor-pointer transition-all"
                            >
                                <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform">💡</div>
                                <h4 className="font-black text-slate-800 text-lg mb-2">Preliminary Submission</h4>
                                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                    Submit your plan drawings for <strong>fee estimation only</strong>. Reception will issue a proforma invoice. No plan number is assigned at this stage.
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1">
                                    <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Faster (fee calculation only)</li>
                                    <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Representative/consultant submissions</li>
                                    <li className="flex items-center gap-2"><span className="text-slate-300">○</span> No plan number assigned</li>
                                    <li className="flex items-center gap-2"><span className="text-slate-300">○</span> Must return after payment</li>
                                </ul>
                                <div className="mt-6 text-xs font-black text-amber-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                    Start Preliminary →
                                </div>
                            </div>

                            {/* FINAL */}
                            <div
                                onClick={() => { setSubmissionType('FINAL'); setStep(1); }}
                                className="group p-8 rounded-[2rem] border-2 border-slate-100 hover:border-[#003366] hover:shadow-xl cursor-pointer transition-all"
                            >
                                <div className="w-14 h-14 bg-[#003366]/5 text-[#003366] rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-110 group-hover:bg-[#003366] group-hover:text-white transition-all">📋</div>
                                <h4 className="font-black text-slate-800 text-lg mb-2">Final Submission</h4>
                                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                    Submit your <strong>complete, paid application</strong>. A plan number is assigned and the application enters the full departmental review process.
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1">
                                    <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Plan number issued immediately</li>
                                    <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full review process starts</li>
                                    <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Payment receipt required</li>
                                    <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All supporting documents required</li>
                                </ul>
                                <div className="mt-6 text-xs font-black text-[#003366] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                    Start Final Submission →
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4 items-start">
                        <span className="text-lg mt-0.5">ℹ️</span>
                        <p className="text-xs font-medium text-blue-800 leading-relaxed">
                            <strong>Not sure?</strong> Choose <em>Preliminary</em> first to get a fee quotation. After payment at the Cashier's Office, return here to complete your Final Submission.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── SHARED STEP WRAPPER ──────────────────────────────────────────────────
    const isPrelim = submissionType === 'PRELIMINARY';

    return (
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden max-w-4xl mx-auto font-interface">
            {/* Header */}
            <div className="bg-[#003366] px-12 py-12 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest ${isPrelim ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'}`}>
                                {isPrelim ? 'Preliminary' : 'Final Submission'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight mb-2">
                            {steps[step - 1]}
                        </h2>
                        <p className="text-blue-200/60 font-medium text-sm">Step {step} of {maxStep}</p>
                    </div>
                    <button onClick={onCancel} title="Close" className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-10 flex gap-3 relative z-10">
                    {steps.map((label, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-2">
                            <div className={`h-1.5 rounded-full transition-all duration-700 ${step > i ? 'bg-white' : 'bg-white/10'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${step === i + 1 ? 'text-white' : 'text-white/30'}`}>{label}</span>
                        </div>
                    ))}
                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            </div>

            <div className="p-12">
                {/* ── STEP 1: Property ───────────────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Property Details</h3>
                            <p className="text-sm font-medium text-slate-400">Identify the location and classification of development.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                                    <option value="Suburbs">Suburbs</option>
                                    <option value="Famona">Famona</option>
                                    <option value="Nkulumane">Nkulumane</option>
                                    <option value="Pumula">Pumula</option>
                                    <option value="Entumbane">Entumbane</option>
                                    <option value="Luveve">Luveve</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Stand Type</label>
                                <select
                                    title="Stand Type"
                                    value={formData.property.standType}
                                    onChange={e => handleTextInput('property', 'standType', e.target.value)}
                                    className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold text-slate-800 appearance-none"
                                >
                                    <option value="RESIDENTIAL_HIGH_DENSITY">Residential High Density</option>
                                    <option value="RESIDENTIAL_LOW_DENSITY">Residential Low Density</option>
                                    <option value="COMMERCIAL">Commercial</option>
                                    <option value="INDUSTRIAL">Industrial</option>
                                    <option value="INSTITUTIONAL">Institutional / Government</option>
                                    <option value="MIXED">Mixed Use</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Description of Development</label>
                            <textarea
                                placeholder="e.g. Church, Church Hall, Factory, New Residence, Shop, etc."
                                value={formData.property.developmentDescription}
                                onChange={e => handleTextInput('property', 'developmentDescription', e.target.value)}
                                rows={2}
                                className="w-full bg-[#F9FAFB] border border-slate-100 rounded-2xl p-5 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold text-slate-800 placeholder:text-slate-300"
                            />
                        </div>

                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex gap-4 items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shrink-0">ℹ️</div>
                            <p className="text-xs font-medium text-blue-800 leading-relaxed">
                                Ensure the stand number matches the <strong>Title Deed</strong> exactly to avoid technical rejection during automated GIS validation.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Ownership / Representative ───────────────────── */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Ownership Validation</h3>
                            <p className="text-sm font-medium text-slate-400">Confirm your legal relationship to the property.</p>
                        </div>

                        {/* Owner toggle */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div
                                onClick={() => handleTextInput('ownership', 'isApplicantOwner', true)}
                                className={`p-7 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center gap-5 ${formData.ownership.isApplicantOwner ? 'bg-[#003366] border-[#003366] text-white shadow-xl' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${formData.ownership.isApplicantOwner ? 'bg-white/10' : 'bg-slate-50'}`}>🏠</div>
                                <div>
                                    <h4 className="font-black text-base mb-0.5">I am the Owner</h4>
                                    <p className={`text-xs ${formData.ownership.isApplicantOwner ? 'text-blue-200' : 'text-slate-400'}`}>My profile matches the Title Deed.</p>
                                </div>
                                {formData.ownership.isApplicantOwner && <div className="ml-auto w-7 h-7 rounded-full bg-white flex items-center justify-center"><svg className="w-4 h-4 text-[#003366]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
                            </div>

                            <div
                                onClick={() => handleTextInput('ownership', 'isApplicantOwner', false)}
                                className={`p-7 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center gap-5 ${!formData.ownership.isApplicantOwner ? 'bg-amber-600 border-amber-600 text-white shadow-xl' : 'bg-white border-slate-100 hover:border-amber-200'}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${!formData.ownership.isApplicantOwner ? 'bg-white/10' : 'bg-amber-50'}`}>📑</div>
                                <div>
                                    <h4 className="font-black text-base mb-0.5">I am a Representative</h4>
                                    <p className={`text-xs ${!formData.ownership.isApplicantOwner ? 'text-amber-100' : 'text-slate-400'}`}>Architect, consultant or agent acting on behalf of the owner.</p>
                                </div>
                                {!formData.ownership.isApplicantOwner && <div className="ml-auto w-7 h-7 rounded-full bg-white flex items-center justify-center"><svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
                            </div>
                        </div>

                        {/* Representative extra fields */}
                        {!formData.ownership.isApplicantOwner && (
                            <div className="space-y-6 p-8 bg-amber-50 rounded-[2rem] border border-amber-200 animate-in zoom-in-95 duration-300">
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Representative Information</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="block text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Legal Owner's Full Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            placeholder="Full legal name as per Title Deed"
                                            value={formData.ownership.ownerFullName}
                                            onChange={e => handleTextInput('ownership', 'ownerFullName', e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-2xl p-4 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all font-bold text-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Owner's Contact Number</label>
                                        <input
                                            type="tel"
                                            placeholder="+263 77..."
                                            value={formData.ownership.ownerContact}
                                            onChange={e => handleTextInput('ownership', 'ownerContact', e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-2xl p-4 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all font-bold text-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Power of Attorney upload */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Power of Attorney / Authority Letter <span className="text-red-500">*</span></label>
                                    <div className="border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center hover:border-amber-500 hover:bg-white transition-all cursor-pointer group relative">
                                        <input
                                            title="Power of Attorney"
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={e => handleFileUpload('ownership', 'powerOfAttorneyFile', e.target.files)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">📜</div>
                                        <p className="font-black text-slate-700 text-xs uppercase tracking-widest">Upload Authorization Document</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase">PDF or Word · Max 10MB</p>
                                        {formData.ownership.powerOfAttorneyFile && (
                                            <div className="mt-3 text-[10px] font-black text-emerald-600 uppercase">✓ {formData.ownership.powerOfAttorneyFile.name}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 3: Development Context ──────────────────────────── */}
                {step === 3 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Development Context</h3>
                                <p className="text-sm font-medium text-slate-400">Specify the total building area and structural footprints.</p>
                            </div>
                            <button onClick={addShape} className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                                + Add Geometry
                            </button>
                        </div>

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
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 pointer-events-none text-xs tracking-widest">SQM</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">System will verify against attached PDF scale.</p>
                        </div>
                    </div>
                )}

                {/* ── STEP 4 (PRELIMINARY): Plan File upload ───────────────── */}
                {step === 4 && isPrelim && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Plan File</h3>
                            <p className="text-sm font-medium text-slate-400">Upload your architectural drawings for fee calculation. This is the only required document for a preliminary submission.</p>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group relative">
                            <input
                                title="Architectural Plan PDF"
                                type="file"
                                accept=".pdf"
                                onChange={e => handleFileUpload('preliminary', 'planFile', e.target.files)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 group-hover:scale-110 transition-transform shadow-xl">📄</div>
                            <p className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">Upload Architectural Drawings (PDF)</p>
                            <p className="text-xs text-slate-400 uppercase">Required for fee calculation · Max 50MB</p>
                            {formData.preliminary.planFile && (
                                <div className="mt-6 inline-flex items-center gap-3 bg-emerald-50 rounded-2xl border border-emerald-100 px-6 py-3">
                                    <span className="text-emerald-500 font-black text-lg">✓</span>
                                    <span className="text-[10px] font-black text-emerald-800 uppercase">{formData.preliminary.planFile.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4 items-start">
                            <span className="text-xl mt-0.5">⚠️</span>
                            <div className="text-xs text-amber-800 leading-relaxed">
                                <p className="font-bold mb-1">What happens next?</p>
                                <p>After submission, a receptionist will review your file and issue a <strong>proforma invoice</strong> with the applicable fees. You will be notified to make payment at the City Cashier's Office. Once payment is confirmed, you will complete a full final submission.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 4 (FINAL): Technical Documents ─────────────────── */}
                {step === 4 && !isPrelim && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Technical Dossier</h3>
                            <p className="text-sm font-medium text-slate-400">High-resolution PDF binaries required for departmental circulation.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { key: 'architecturalPlanPdf', label: 'Architectural Drawings (PDF)', accept: '.pdf', icon: '📄', color: 'blue' },
                                { key: 'architecturalPlanDwg', label: 'CAD Model (DWG / DXF)', accept: '.dwg,.dxf', icon: '📦', color: 'indigo' },
                                { key: 'titleDeedFile', label: 'Proof of Ownership / Title Deed', accept: '.pdf', icon: '📜', color: 'slate' },
                                { key: 'structuralCertificate', label: 'Structural Engineers Certificate (optional)', accept: '.pdf', icon: '🏗️', color: 'green' },
                            ].map(({ key, label, accept, icon, color }) => {
                                const file = (formData.documents as any)[key] as File | null;
                                return (
                                    <div key={key} className="flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 bg-[#F9FAFB] hover:bg-white transition-all cursor-pointer relative group">
                                        <input title={label} type="file" accept={accept} onChange={e => handleFileUpload('documents', key, e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className={`w-14 h-14 bg-${color}-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl group-hover:scale-110 transition-transform`}>{icon}</div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">{label}</h4>
                                            {file ? (
                                                <div className="mt-2 text-[9px] font-black text-emerald-600 uppercase">✓ {file.name}</div>
                                            ) : (
                                                <p className="text-[10px] font-medium text-slate-400 mt-1">Click to upload</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── STEP 5 (FINAL): Payment ──────────────────────────────── */}
                {step === 5 && !isPrelim && (
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
                                    accept=".pdf,image/*"
                                    onChange={e => handleFileUpload('payment', 'receiptProofFile', e.target.files)}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                />
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">💰</div>
                                    <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Attach Proof of Payment</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">PDF or image scan</p>
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

                {/* ── Navigation Controls ────────────────────────────────────── */}
                <div className="mt-16 flex justify-between gap-6">
                    <button
                        onClick={handleBack}
                        disabled={loading}
                        className="bg-slate-50 text-slate-400 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all disabled:opacity-50"
                    >
                        ← Back
                    </button>

                    {/* Determine if this is the last step */}
                    {step < maxStep ? (
                        <button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && !formData.property.standNumber) ||
                                (step === 2 && !formData.ownership.isApplicantOwner && !formData.ownership.ownerFullName)
                            }
                            className="bg-[#003366] text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_15px_30px_rgba(0,51,102,0.3)] hover:bg-[#002244] hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            Continue →
                        </button>
                    ) : isPrelim ? (
                        <button
                            onClick={handlePreliminarySubmit}
                            disabled={loading || !formData.preliminary.planFile}
                            className="bg-amber-600 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_15px_30px_rgba(217,119,6,0.3)] hover:bg-amber-700 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? '⏳ Submitting...' : '💡 Lodge Preliminary Application'}
                        </button>
                    ) : (
                        <button
                            onClick={handleFinalSubmit}
                            disabled={loading || !formData.payment.receiptNumber}
                            className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_15px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-700 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? '⏳ Lodging...' : '✅ Lodge Final Application'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
