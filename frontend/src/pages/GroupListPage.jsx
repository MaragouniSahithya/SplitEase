import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Loader2, ArrowRight, X } from 'lucide-react';
import { getGroups, createGroup } from '../lib/api';
import { Skeleton, CardSkeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

const GroupListPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', description: '', currency: 'INR' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await getGroups();
      setGroups(data || []);
    } catch (err) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data } = await createGroup(formData);
      toast.success('Group created!');
      navigate(`/groups/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Your Groups</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary py-2.5 px-6 rounded-xl flex items-center gap-2 font-bold shadow-button hover:-translate-y-0.5 transition-transform w-full sm:w-auto justify-center">
          <Plus size={20} /> Create Group
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link key={group._id} to={`/groups/${group._id}`} className="card p-6 flex flex-col h-full group/card hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-text-primary group-hover/card:text-primary-600 transition-colors line-clamp-1">{group.name}</h3>
                  <p className="text-text-secondary text-sm mt-1 line-clamp-2">{group.description || 'No description'}</p>
                </div>
                <div className="shrink-0 flex -space-x-2 overflow-hidden px-2">
                  {(group.members || []).slice(0, 3).map((member, i) => (
                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {member.user?.name?.charAt(0) || 'U'}
                    </div>
                  ))}
                  {(group.members?.length || 0) > 3 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 text-text-secondary flex items-center justify-center text-xs font-bold shrink-0">
                      +{(group.members.length - 3)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-bold text-text-muted mb-1">Total Expenses</p>
                    <AmountBadge amount={group.totalExpenses || 0} currency={group.currency} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-text-muted mb-1">Your Balance</p>
                    {/* Assuming we get myBalance per group from backend, fallback to 0 */}
                    <AmountBadge amount={Math.abs(group.myBalance || 0)} currency={group.currency} context={group.myBalance > 0 ? 'owed' : group.myBalance < 0 ? 'owes' : 'neutral'} />
                  </div>
                </div>

                {group.budget && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-text-secondary">Budget limit</span>
                      <span className="text-primary-600">{group.currency} {group.budget.totalLimit}</span>
                    </div>
                    {/* UI placeholder for proportion */}
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 w-[45%]"></div>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 flex justify-end text-primary-600 font-bold text-sm items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  View Group <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon="👥" 
          title="No groups yet" 
          description="Create a group to start splitting expenses with friends, family, or roommates."
          action={{ label: "Create Group", onClick: () => setIsModalOpen(true) }}
        />
      )}

      {/* Slide-over modal for Create Group */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-sm w-full flex">
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="h-full w-full bg-card shadow-2xl flex flex-col">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-xl font-bold text-text-primary">Create Group</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:bg-slate-200 p-2 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Group Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" placeholder="e.g. Goa Trip 2026" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Description</label>
                    <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" placeholder="Optional details..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Currency</label>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white">
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                  
                  <div className="pt-6">
                    <button type="submit" disabled={isCreating} className="w-full btn-primary py-3.5 rounded-xl text-lg flex items-center justify-center gap-2">
                      {isCreating ? <Loader2 className="animate-spin" /> : 'Create Group'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupListPage;
