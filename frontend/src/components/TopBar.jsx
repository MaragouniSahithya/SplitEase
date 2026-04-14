import React from 'react';
import { Menu, Bell, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const TopBar = ({ onMenuClick }) => {
  const { pendingInvites } = useAuth();

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-slate-100 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 text-text-secondary hover:bg-slate-100 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-black text-primary-600 tracking-tight flex items-center gap-1.5">
          <span className="bg-primary-500 text-white rounded-md p-1">
            <PieChart size={18} />
          </span>
          SplitEase
        </h1>
      </div>
      
      <Link to="/invitations" className="p-2 text-text-secondary relative hover:bg-slate-100 rounded-lg transition-colors">
        <Bell size={24} />
        {pendingInvites > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white"></span>
        )}
      </Link>
    </div>
  );
};

export default TopBar;
