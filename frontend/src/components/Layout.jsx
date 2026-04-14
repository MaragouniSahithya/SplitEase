import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Plus, PieChart, User, LogOut, X } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

const MobileBottomNav = () => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-slate-100 pb-safe z-40">
      <div className="flex justify-between items-center h-16 px-2">
        <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center justify-center w-1/5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`}>
          <Home size={24} className="mb-1" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>
        <NavLink to="/groups" className={({ isActive }) => `flex flex-col items-center justify-center w-1/5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`}>
          <Users size={24} className="mb-1" />
          <span className="text-[10px] font-medium">Groups</span>
        </NavLink>
        
        <div className="w-1/5 flex justify-center mt-[-24px]">
          <NavLink to="/expenses/add" className="bg-primary-500 rounded-full p-4 text-white shadow-button transform hover:scale-105 transition-transform">
            <Plus size={28} />
          </NavLink>
        </div>

        <NavLink to="/balances" className={({ isActive }) => `flex flex-col items-center justify-center w-1/5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`}>
          <PieChart size={24} className="mb-1" />
          <span className="text-[10px] font-medium">Balances</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center justify-center w-1/5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`}>
          <User size={24} className="mb-1" />
          <span className="text-[10px] font-medium">Profile</span>
        </NavLink>
      </div>
    </div>
  );
};

const MobileMenuDrawer = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-card z-50 flex flex-col md:hidden shadow-2xl"
          >
            <div className="p-4 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-primary-600 flex items-center gap-2">
                <span className="bg-primary-500 text-white rounded-md p-1">
                  <PieChart size={18} />
                </span>
                SplitEase
              </h2>
              <button onClick={onClose} className="p-2 text-text-secondary">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `p-3 rounded-xl font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-slate-50'}`}>Dashboard</NavLink>
              <NavLink to="/groups" onClick={onClose} className={({ isActive }) => `p-3 rounded-xl font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-slate-50'}`}>Groups</NavLink>
              <NavLink to="/expenses" onClick={onClose} className={({ isActive }) => `p-3 rounded-xl font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-slate-50'}`}>Expenses</NavLink>
              <NavLink to="/balances" onClick={onClose} className={({ isActive }) => `p-3 rounded-xl font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-slate-50'}`}>Balances</NavLink>
              <NavLink to="/invitations" onClick={onClose} className={({ isActive }) => `p-3 rounded-xl font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-slate-50'}`}>Invitations</NavLink>
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left p-3 rounded-xl font-medium text-danger hover:bg-red-50 flex items-center gap-2">
                <LogOut size={20} /> Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth">
          <div className="max-w-6xl mx-auto w-full p-4 md:p-8">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
      </div>
      <MobileMenuDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </div>
  );
};

export default Layout;
