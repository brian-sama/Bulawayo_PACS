import React, { useState, useEffect } from 'react';
import { UserProfile, Notification } from '../types';
import * as api from '../services/api';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const firstName = (user.full_name || user.username || 'User').split(' ')[0];

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      // Only keep the 20 most recent
      setNotifications(data.slice(0, 20));
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 10000); // poll every 10s
    return () => clearInterval(intervalId);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark notifications read', e);
    }
  };

  const handleNotificationClick = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-10 box-border">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003366] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search plans or properties..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-[1rem] text-sm font-medium focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-3 rounded-xl transition-all duration-300 group ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            title="View Alerts"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white group-hover:scale-110 transition-transform">
                    {unreadCount}
                </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 py-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="px-6 py-2 border-b border-slate-50 flex justify-between items-center mb-2">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Alerts</h3>
                {unreadCount > 0 && (
                   <span className="text-[10px] bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-black">{unreadCount} New</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto px-2">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">No notifications yet.</div>
                ) : (
                    notifications.map(n => (
                        <div 
                            key={n.id} 
                            onClick={() => handleNotificationClick(n.id)}
                            className={`p-4 rounded-2xl cursor-pointer transition-colors group mb-1 ${n.is_read ? 'bg-transparent hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                        >
                            <p className={`text-xs font-bold group-hover:text-blue-600 leading-snug ${n.is_read ? 'text-slate-600' : 'text-slate-800'}`}>
                                {n.message}
                            </p>
                            <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${n.is_read ? 'text-slate-400' : 'text-blue-500'}`}>
                                {new Date(n.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                        </div>
                    ))
                )}
              </div>
              
              {notifications.length > 0 && unreadCount > 0 && (
                  <div className="px-6 pt-4 text-center border-t border-slate-50 mt-2">
                    <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-[0.2em] w-full py-3 bg-blue-50 rounded-xl transition-colors"
                    >
                        Mark All as Read
                    </button>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-4 pl-8 border-l border-slate-100 h-10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-[#003366] leading-none mb-1">Welcome, {firstName}</p>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Bulawayo PACS Network</p>
          </div>

          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] border border-slate-100 flex items-center justify-center text-[#003366] font-black transition-all group-hover:shadow-md group-hover:border-blue-200">
              {(user.full_name || user.username || '?').charAt(0)}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
            title="Secure Sign Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

