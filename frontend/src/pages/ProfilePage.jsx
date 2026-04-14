import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, LogOut, Shield } from 'lucide-react';
import { updateProfile } from '../lib/api';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      const { data } = await updateProfile({ name: nameVal });
      updateUser(data.user);
      toast.success('Name updated!');
      setEditing(false);
    } catch { 
      toast.error('Failed to update'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-text-primary tracking-tight mb-8">Your Profile</h1>

      <div className="card p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-32 h-32 bg-primary-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-5xl font-black text-primary-700">
            {user?.name?.charAt(0) || 'U'}
          </div>

          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-black text-text-primary mb-2">{user?.name}</h2>
            <div className="flex flex-col gap-2 text-text-secondary">
              <span className="flex items-center justify-center md:justify-start gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit mx-auto md:mx-0">
                <Mail size={16} /> {user?.email}
              </span>
              <span className="flex items-center justify-center md:justify-start gap-2 bg-emerald-50 text-success px-3 py-1.5 rounded-lg border border-emerald-100 w-fit mx-auto md:mx-0">
                <Shield size={16} /> Verified Account
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold flex justify-between items-center">
          Preferences
          <button onClick={() => setEditing(!editing)} className="text-sm text-primary-600 font-bold hover:underline">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">Display Name</label>
              <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary-500" />
            </div>
            <button onClick={handleSaveName} disabled={saving}
              className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm">
              {saving ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        ) : (
          <div className="p-6 text-sm text-text-secondary">
            Click Edit to update your display name.
          </div>
        )}
      </div>

      <button onClick={handleLogout} className="w-full card p-4 flex items-center justify-center gap-2 text-danger font-bold hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
        <LogOut size={20} /> Log Out
      </button>
    </div>
  );
};

export default ProfilePage;
