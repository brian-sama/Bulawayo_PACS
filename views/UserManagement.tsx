import React, { useState, useEffect } from 'react';
import { ApiUser, ApiDepartment, getUsers, createUser, updateUser, deleteUser, getDepartments } from '../services/api';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [departments, setDepartments] = useState<ApiDepartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ApiUser | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'STAFF',
        department: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, deptsData] = await Promise.all([getUsers(), getDepartments()]);
            setUsers(usersData);
            setDepartments(deptsData);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (user?: ApiUser) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                password: '', // Don't show existing password
                role: user.role,
                department: user.department?.toString() || '',
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                full_name: '',
                password: '',
                role: 'STAFF',
                department: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (editingUser) {
                // Remove password if empty (don't change it)
                const submissionData = { ...formData };
                if (!submissionData.password) delete (submissionData as any).password;
                await updateUser(editingUser.id, submissionData);
            } else {
                await createUser(formData);
            }
            fetchData();
            handleCloseModal();
        } catch (err: any) {
            setError(err.message || 'Action failed');
        }
    };

    const handleDeactivate = async (id: number) => {
        if (!window.confirm('Are you sure you want to deactivate this user?')) return;
        try {
            await deleteUser(id);
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Deactivation failed');
        }
    };

    if (loading && users.length === 0) {
        return <div className="p-8 text-center text-slate-500">Loading user management...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                    <p className="text-slate-500 text-sm">Manage staff accounts and permissions</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#003366] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#002a54] transition shadow-md"
                >
                    Add Staff Member
                </button>
            </div>

            {error && !isModalOpen && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{u.full_name}</p>
                                    <p className="text-xs text-slate-400">{u.email}</p>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">{u.username}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm">{u.department_name || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${u.is_active ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                        {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => handleOpenModal(u)}
                                        className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                                    >
                                        Edit
                                    </button>
                                    {u.is_active && (
                                        <button
                                            onClick={() => handleDeactivate(u.id)}
                                            className="text-red-600 hover:text-red-800 font-bold text-sm"
                                        >
                                            Deactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 bg-[#003366] text-white">
                            <h3 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Add Staff Member'}</h3>
                            <p className="text-white/60 text-sm">Fill in the details below</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        title="Full Name"
                                        placeholder="Full Name"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Username</label>
                                    <input
                                        type="text"
                                        placeholder="(auto-generated if empty)"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    title="Email Address"
                                    placeholder="Enter email address"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    title="Password"
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Role</label>
                                    <select
                                        title="Role"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="STAFF">Staff</option>
                                        <option value="RECEPTION">Reception</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="EXECUTIVE">Executive</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Department</label>
                                    <select
                                        title="Department"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-[#002a54] transition shadow-md"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
