import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { usePolling } from '../hooks/usePolling';

interface Department {
    id: number;
    name: string;
    code?: string;
}

interface WorkflowMapping {
    id: number;
    category: string;
    department: number;
    department_name: string;
}

const CATEGORY_LABELS: Record<string, { title: string; desc: string; icon: string; color: string }> = {
    RESIDENTIAL: {
        title: 'Residential Plans',
        desc: 'Single & multi-family housing, residential additions, and cottage development.',
        icon: '🏡',
        color: 'from-blue-500/20 to-indigo-500/10 text-indigo-700 border-indigo-100',
    },
    COMMERCIAL: {
        title: 'Commercial Plans',
        desc: 'Retail outlets, office parks, commercial buildings, and shopping centers.',
        icon: '🏢',
        color: 'from-amber-500/20 to-orange-500/10 text-orange-700 border-orange-100',
    },
    INDUSTRIAL: {
        title: 'Industrial Plans',
        desc: 'Manufacturing plants, factories, heavy warehouses, and processing depots.',
        icon: '🏭',
        color: 'from-red-500/20 to-rose-500/10 text-rose-700 border-rose-100',
    },
    MIXED: {
        title: 'Mixed-Use Plans',
        desc: 'Integrated developments combining residential residential quarters with retail spaces.',
        icon: '🏙️',
        color: 'from-purple-500/20 to-fuchsia-500/10 text-fuchsia-700 border-fuchsia-100',
    },
};

export const WorkflowConfig: React.FC = () => {
    const [mappings, setMappings] = useState<WorkflowMapping[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Track which category currently has the "Add Department" dropdown open
    const [openAddDropdown, setOpenAddDropdown] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<{ id: number; category: string; deptName: string } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const loadData = async () => {
        try {
            const [fetchedMappings, fetchedDepts] = await Promise.all([
                api.getWorkflowMappings(),
                api.getDepartments(),
            ]);
            setMappings(fetchedMappings);
            setDepartments(fetchedDepts);
        } catch (err) {
            console.error('Failed to load workflow configuration data:', err);
            showToast('Error loading workflow configuration', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    usePolling(loadData, 12000); // Keep synced with database periodically

    const handleAddMapping = async (category: string, departmentId: number) => {
        if (!departmentId) return;
        const key = `${category}-${departmentId}`;
        setActionLoading(key);
        setOpenAddDropdown(null);
        try {
            // Check if mapping already exists
            const existing = mappings.find(m => m.category === category && m.department === departmentId);
            if (existing) {
                showToast('Department is already mapped to this category', 'error');
                return;
            }

            await api.createWorkflowMapping(category, departmentId);
            await loadData();
            const deptName = departments.find(d => d.id === departmentId)?.name || 'Department';
            showToast(`Successfully routed ${category} plans to ${deptName}`);
        } catch (err) {
            console.error(err);
            showToast('Failed to add workflow mapping', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMapping = async () => {
        if (!confirmRemove) return;
        const { id: mappingId, category, deptName } = confirmRemove;
        setConfirmRemove(null);
        const key = `remove-${mappingId}`;
        setActionLoading(key);
        try {
            await api.deleteWorkflowMapping(mappingId);
            await loadData();
            showToast(`Removed review routing to ${deptName} for ${category} plans`);
        } catch (err) {
            console.error(err);
            showToast('Failed to remove workflow mapping', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-16 rounded-3xl border border-slate-100 shadow-sm text-center animate-pulse">
                <div className="w-12 h-12 border-4 border-t-[#003366] border-slate-200 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading Workflow Engine Configurations...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* 🔔 Premium Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border transition-all transform animate-in slide-in-from-top-4 duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
                    <p className="text-[11px] font-black uppercase tracking-wider">{toast.message}</p>
                </div>
            )}

            {/* ⚙️ Core Configuration Board */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.keys(CATEGORY_LABELS).map((categoryKey) => {
                    const labelMeta = CATEGORY_LABELS[categoryKey];
                    const activeMappingsForCategory = mappings.filter(m => m.category === categoryKey);
                    
                    // Filter out departments that are already assigned to this category
                    const availableDepartments = departments.filter(
                        d => !activeMappingsForCategory.some(m => m.department === d.id)
                    );

                    return (
                        <div 
                            key={categoryKey} 
                            className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-500 overflow-hidden flex flex-col justify-between group"
                        >
                            {/* Card Header with Category Gradient */}
                            <div className="p-6 pb-4">
                                <div className="flex gap-4 items-start">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${labelMeta.color} flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                                        {labelMeta.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">{labelMeta.title}</h3>
                                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black tracking-widest uppercase">ID: {categoryKey}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-4">{labelMeta.desc}</p>
                            </div>

                            {/* Active Mapped Departments */}
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-b border-slate-100/50 flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Mandatory Technical Reviewers</span>
                                <div className="space-y-2">
                                    {activeMappingsForCategory.map((mapping) => (
                                        <div 
                                            key={mapping.id} 
                                            className="bg-white p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                                <span className="text-[11px] font-black text-slate-700 tracking-tight">{mapping.department_name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmRemove({ id: mapping.id, category: categoryKey, deptName: mapping.department_name })}
                                                disabled={actionLoading !== null}
                                                className="px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                            >
                                                {actionLoading === `remove-${mapping.id}` ? 'Removing...' : 'REMOVE'}
                                            </button>
                                        </div>
                                    ))}
                                    {activeMappingsForCategory.length === 0 && (
                                        <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No mandatory departments assigned</p>
                                            <p className="text-[9px] text-slate-300 mt-1">This category will bypass standard technical review pools.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Action Controller */}
                            <div className="p-6 bg-white relative">
                                {openAddDropdown === categoryKey ? (
                                    <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                                        <label className="text-[9px] font-black text-[#003366] uppercase tracking-widest block">Select Department to Map</label>
                                        <div className="flex gap-2">
                                            <select
                                                onChange={(e) => handleAddMapping(categoryKey, Number(e.target.value))}
                                                defaultValue=""
                                                title={`Select department for ${categoryKey}`}
                                                aria-label={`Select department to map to ${categoryKey}`}
                                                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-widest p-3 rounded-xl focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                                            >
                                                <option value="" disabled>-- Select Division --</option>
                                                {availableDepartments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setOpenAddDropdown(null)}
                                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setOpenAddDropdown(categoryKey)}
                                        disabled={actionLoading !== null}
                                        className="w-full py-4.5 bg-[#003366] text-white hover:bg-blue-700 disabled:bg-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>➕</span>
                                        <span>Add Mandatory Reviewer</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Remove confirmation modal */}
            {confirmRemove && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Remove Mapping?</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                This will stop routing <strong>{confirmRemove.category}</strong> plans to{' '}
                                <strong>{confirmRemove.deptName}</strong>. All plans currently in review are unaffected.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmRemove(null)}
                                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-black text-slate-500 hover:border-slate-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveMapping}
                                className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition-all"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
