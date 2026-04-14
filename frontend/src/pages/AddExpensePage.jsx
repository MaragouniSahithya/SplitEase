import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getGroups, createExpense } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Tag, FileText, IndianRupee, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'food', icon: '🍕', label: 'Food' },
  { id: 'transport', icon: '🚗', label: 'Transport' },
  { id: 'accommodation', icon: '🏨', label: 'Hotel' },
  { id: 'entertainment', icon: '🎫', label: 'Fun' },
  { id: 'shopping', icon: '🛍️', label: 'Shop' },
  { id: 'utilities', icon: '⚡', label: 'Bills' },
  { id: 'other', icon: '📝', label: 'Other' },
];

const SPLIT_MODES = [
  { id: 'equal', icon: '👥', label: 'Equal Split', desc: 'Split evenly among all members' },
  { id: 'only_me', icon: '👤', label: 'Only Me', desc: 'I owe the full amount' },
  { id: 'specific', icon: '🎯', label: 'Pick Members', desc: 'Split equally among selected members' },
  { id: 'exact', icon: '₹', label: 'Exact Amounts', desc: 'Specify exact amounts per person' },
  { id: 'percentage', icon: '%', label: 'Percentage', desc: 'Split by percentage' },
  { id: 'weighted', icon: '⚖️', label: 'Weighted', desc: 'Assign shares to members' },
];

const AddExpensePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedGroup = location.state?.groupId;

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [groupId, setGroupId] = useState(preselectedGroup || '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(user?._id || '');
  const [splitMode, setSplitMode] = useState('equal');
  const [note, setNote] = useState('');

  // Split specific data
  const [selectedMembers, setSelectedMembers] = useState([]); // for specific
  const [exactAmounts, setExactAmounts] = useState({}); // userId -> amount
  const [percentages, setPercentages] = useState({}); // userId -> percent
  const [sharesData, setSharesData] = useState({}); // userId -> { shares, label }

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await getGroups();
      setGroups(data);
      if (!groupId && data.length > 0) {
        setGroupId(data[0]._id);
      }
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const selectedGroup = groups.find(g => g._id === groupId);
  // Only accepted members can be in splits or pay
  const acceptedMembers = selectedGroup?.members?.filter(m => m.status === 'accepted') || [];

  // Initialize split data when group changes
  useEffect(() => {
    if (selectedGroup) {
      const members = acceptedMembers.map(m => m.user._id);
      setSelectedMembers(members);

      const exact = {};
      const pct = {};
      const sh = {};
      const equalShare = amount ? (parseFloat(amount) / members.length).toFixed(2) : '';
      const equalPct = (100 / members.length).toFixed(2);

      members.forEach(mId => {
        exact[mId] = equalShare;
        pct[mId] = equalPct;
        sh[mId] = { shares: 1, label: '' };
      });
      setExactAmounts(exact);
      setPercentages(pct);
      setSharesData(sh);
    }
  }, [selectedGroup, amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupId) return toast.error('Please select a group');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');

    let splits = [];
    const members = acceptedMembers;

    if (splitMode === 'specific') {
      if (selectedMembers.length === 0) return toast.error('Select at least one member');
      // Leave splits as []
    } else if (splitMode === 'exact') {
      let total = 0;
      splits = members.map(m => {
        const val = parseFloat(exactAmounts[m.user._id] || 0);
        total += val;
        return { userId: m.user._id, amount: val };
      });
      if (Math.abs(total - parseFloat(amount)) > 0.01) return toast.error('Exact amounts must sum up to total amount');
    } else if (splitMode === 'percentage') {
      let total = 0;
      splits = members.map(m => {
        const val = parseFloat(percentages[m.user._id] || 0);
        total += val;
        return { userId: m.user._id, amount: val };
      });
      if (Math.abs(total - 100) > 0.01) return toast.error('Percentages must sum up to 100%');
    } else if (splitMode === 'weighted') {
      splits = members.map(m => ({
        userId: m.user._id,
        shares: parseInt(sharesData[m.user._id]?.shares || 0, 10),
        label: sharesData[m.user._id]?.label || ''
      })).filter(s => s.shares > 0);
      if (splits.length === 0) return toast.error('Assign at least one share');
    }

    const payload = {
      groupId,          // backend expects 'groupId' not 'group'
      description,
      amount: parseFloat(amount),
      category,
      date,
      paidBy,
      splitMode,
      note: note || undefined
    };

    if (splitMode === 'specific') {
      payload.specificMemberIds = selectedMembers;
    } else if (['exact', 'percentage', 'weighted'].includes(splitMode)) {
      payload.splits = splits;
    }

    setSubmitting(true);
    try {
      await createExpense(payload);
      toast.success('Expense added!');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary-500" size={32} /></div>;

  const totalExact = Object.values(exactAmounts).reduce((a, b) => a + (parseFloat(b) || 0), 0);
  const totalPercent = Object.values(percentages).reduce((a, b) => a + (parseFloat(b) || 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 border border-slate-200 rounded-lg text-text-secondary hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-text-primary tracking-tight">Add Expense</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-100 pb-2">Basic Info</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-text-primary mb-1.5">Group</label>
                <select value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white">
                  <option value="" disabled>Select a group</option>
                  {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-text-primary mb-1.5">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-text-muted" size={20} />
                <input required type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner at Mario's" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 text-text-muted" size={20} />
                <input required type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-2xl font-black tabular-nums text-primary-600" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Category</label>
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {CATEGORIES.map(c => (
                  <button type="button" key={c.id} onClick={() => setCategory(c.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[80px] transition-all ${category === c.id ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className="text-2xl mb-1">{c.icon}</span>
                    <span className={`text-xs font-bold ${category === c.id ? 'text-primary-700' : 'text-text-secondary'}`}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Paid By</label>
              <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white">
                {acceptedMembers.map(m => (
                  <option key={m.user._id} value={m.user._id}>{m.user._id === user?._id ? 'You' : m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h3 className="font-bold text-lg border-b border-slate-100 pb-2">How to Split?</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SPLIT_MODES.map(mode => (
              <button type="button" key={mode.id} onClick={() => setSplitMode(mode.id)} className={`p-4 rounded-xl border text-left transition-all ${splitMode === mode.id ? 'border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="text-2xl mb-2">{mode.icon}</div>
                <div className={`font-bold text-sm ${splitMode === mode.id ? 'text-primary-700' : 'text-text-primary'}`}>{mode.label}</div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout">
            {splitMode === 'equal' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-slate-50 rounded-xl text-center text-sm font-bold text-text-secondary">
                Will be split equally among {acceptedMembers.length || 0} members.
              </motion.div>
            )}

            {splitMode === 'only_me' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-slate-50 rounded-xl text-center text-sm font-bold text-text-secondary">
                Only you will owe this amount.
              </motion.div>
            )}

            {splitMode === 'specific' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                {acceptedMembers.map(m => (
                  <label key={m.user._id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedMembers.includes(m.user._id)} onChange={(e) => {
                      if (e.target.checked) setSelectedMembers([...selectedMembers, m.user._id]);
                      else setSelectedMembers(selectedMembers.filter(id => id !== m.user._id));
                    }} className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500 accent-primary-500" />
                    <span className="font-bold text-sm">{m.user.name}</span>
                  </label>
                ))}
              </motion.div>
            )}

            {splitMode === 'exact' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                <div className={`text-right text-sm font-bold ${Math.abs(totalExact - parseFloat(amount || 0)) > 0.01 ? 'text-danger' : 'text-success'}`}>
                  Total: {totalExact.toFixed(2)} / {parseFloat(amount || 0).toFixed(2)}
                </div>
                {acceptedMembers.map(m => (
                  <div key={m.user._id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50">
                    <span className="font-bold text-sm">{m.user.name}</span>
                    <input type="number" step="0.01" value={exactAmounts[m.user._id] || ''} onChange={e => setExactAmounts({ ...exactAmounts, [m.user._id]: e.target.value })} className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-right font-bold tabular-nums" placeholder="0.00" />
                  </div>
                ))}
              </motion.div>
            )}

            {splitMode === 'percentage' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                <div className={`text-right text-sm font-bold ${Math.abs(totalPercent - 100) > 0.01 ? 'text-danger' : 'text-success'}`}>
                  Total: {totalPercent.toFixed(2)}%
                </div>
                {acceptedMembers.map(m => (
                  <div key={m.user._id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50">
                    <span className="font-bold text-sm">{m.user.name}</span>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.1" value={percentages[m.user._id] || ''} onChange={e => setPercentages({ ...percentages, [m.user._id]: e.target.value })} className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-right font-bold tabular-nums" placeholder="0" />
                      <span className="font-bold text-text-secondary">%</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {splitMode === 'weighted' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs mb-4">
                  <strong>Tip:</strong> Use shares if someone ate twice as much (give them 2 shares), or if they are covering for an absent friend. Add a label to explain.
                </div>
                {acceptedMembers.map(m => (
                  <div key={m.user._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 gap-3">
                    <span className="font-bold text-sm w-32">{m.user.name}</span>
                    <div className="flex-1 w-full">
                      <input type="text" value={sharesData[m.user._id]?.label || ''} onChange={e => setSharesData({ ...sharesData, [m.user._id]: { ...sharesData[m.user._id], label: e.target.value } })} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm placeholder:text-slate-400" placeholder="Label (e.g. covering Raj)" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setSharesData({ ...sharesData, [m.user._id]: { ...sharesData[m.user._id], shares: Math.max(0, sharesData[m.user._id].shares - 1) } })} className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold font-mono">-</button>
                      <span className="w-8 text-center font-bold">{sharesData[m.user._id]?.shares || 0}</span>
                      <button type="button" onClick={() => setSharesData({ ...sharesData, [m.user._id]: { ...sharesData[m.user._id], shares: sharesData[m.user._id].shares + 1 } })} className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold font-mono">+</button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="submit" disabled={submitting} className="w-full btn-primary py-4 rounded-xl text-xl font-black shadow-button hover:scale-[1.01] transition-transform flex justify-center items-center gap-2">
          {submitting ? <Loader2 className="animate-spin" /> : 'Save Expense'}
        </button>
      </form>
    </div>
  );
};

export default AddExpensePage;
