import React, { useState } from 'react';
import { UserProfile, UserRole, UserType } from '../types';
import * as api from '../services/api';

interface LoginViewProps {
    onLogin: (user: UserProfile) => void;
    onBack?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = (props) => {
    const { onLogin, onBack } = props;
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form States
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [regData, setRegData] = useState({
        full_name: '',
        email: '',
        phone: '',
        id_number: '',
        user_type: 'OWNER' as UserType,
        professional_reg_no: '',
        password: ''
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const apiUser = await api.login(loginData.username, loginData.password);
            onLogin(apiUser);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.apiFetch('/auth/register/', {
                method: 'POST',
                body: JSON.stringify(regData)
            });
            alert("Account created! Please sign in.");
            setMode('LOGIN');
            setLoginData({ username: regData.email, password: regData.password });
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 relative">
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-[#003366] font-bold text-xs uppercase tracking-widest transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to Home
                </button>
            )}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-500">
                <div className="p-8 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-[#003366] rounded-2xl flex items-center justify-center shadow-lg mb-4">
                            <img src="/logo.png" alt="BCC Logo" className="w-full h-full object-cover rounded-2xl" />
                        </div>
                        <h1 className="text-2xl font-black text-[#003366]">{mode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h1>
                        <p className="text-slate-400 text-sm">{mode === 'LOGIN' ? 'Sign in to manage your plans' : 'Register to start your plan submission'}</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 italic animate-pulse">
                            {error}
                        </div>
                    )}

                    {mode === 'LOGIN' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Username or Email"
                                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                value={loginData.username}
                                onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                value={loginData.password}
                                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                                required
                            />
                            <button className="w-full p-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:translate-y-[-1px] transition duration-200">
                                {loading ? 'Checking...' : 'Sign In'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Full Name"
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={regData.full_name}
                                onChange={e => setRegData({ ...regData, full_name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={regData.email}
                                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Phone Number"
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={regData.phone}
                                    onChange={e => setRegData({ ...regData, phone: e.target.value })}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="ID Number"
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={regData.id_number}
                                onChange={e => setRegData({ ...regData, id_number: e.target.value })}
                                required
                            />
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Account Type</label>
                                <select
                                    title="Account Type"
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none"
                                    value={regData.user_type}
                                    onChange={e => setRegData({ ...regData, user_type: e.target.value as UserType })}
                                >
                                    <option value="OWNER">Property Owner</option>
                                    <option value="PROFESSIONAL">Architecture/Engineering Professional</option>
                                </select>
                            </div>

                            {regData.user_type === 'PROFESSIONAL' && (
                                <input
                                    type="text"
                                    placeholder="Professional Registration Number"
                                    className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={regData.professional_reg_no}
                                    onChange={e => setRegData({ ...regData, professional_reg_no: e.target.value })}
                                    required
                                />
                            )}

                            <input
                                type="password"
                                placeholder="Create Password"
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={regData.password}
                                onChange={e => setRegData({ ...regData, password: e.target.value })}
                                required
                            />
                            <button className="w-full p-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition">
                                {loading ? 'Registering...' : 'Create My Account'}
                            </button>
                        </form>
                    )}

                    <div className="pt-4 text-center border-t border-slate-100">
                        <button
                            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                            className="text-xs font-bold text-[#003366] uppercase tracking-widest hover:underline"
                        >
                            {mode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
                        </button>
                    </div>
                </div>
            </div>
            <p className="mt-8 text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">Bulawayo City Council © 2026</p>
        </div>
    );
};
