import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Receipt, PieChart, Send, CreditCard, User, LogOut, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, pendingInvites, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Groups', path: '/groups', icon: <Users size={20} /> },
    { name: 'Expenses', path: '/expenses', icon: <Receipt size={20} /> },
    { name: 'Balances', path: '/balances', icon: <PieChart size={20} /> },
    { name: 'Settlements', path: '/settlements', icon: <ArrowRightLeft size={20} /> },
    { name: 'Budget', path: '/budget', icon: <CreditCard size={20} /> },
    { name: 'Invitations', path: '/invitations', icon: <Send size={20} />, badge: pendingInvites },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-card border-r border-slate-100 h-screen sticky top-0">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-black text-primary-600 tracking-tight flex items-center gap-2">
          <span className="bg-primary-500 text-white rounded-lg p-1">
            <PieChart size={24} />
          </span>
          SplitEase
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`
            }
          >
            {item.icon}
            {item.name}
            {item.badge > 0 && (
              <span className="ml-auto bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full inline-block">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`
            }
          >
            <User size={18} /> Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-sm font-medium text-text-secondary hover:bg-red-50 hover:text-danger transition-all"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
