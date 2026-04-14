import React, { useState, useEffect } from 'react';
import { getGroups, getBalances } from '../lib/api';
import { Skeleton, CardSkeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import EmptyState from '../components/EmptyState';
import { ArrowRightLeft, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const BalancesPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) fetchBalances(selectedGroup);
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const { data } = await getGroups();
      setGroups(data || []);
      if (data && data.length > 0) setSelectedGroup(data[0]._id);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async (groupId) => {
    if (!groupId) return; // guard: don't fetch without a group
    setBalancesLoading(true);
    try {
      const { data: balData } = await getBalances(groupId);
      setData(balData);
    } catch (err) {
      // Only toast if it's a real server error, not a 400 from missing groupId
      if (err.response?.status !== 400) {
        toast.error('Failed to load balances');
      }
      setData(null);
    } finally {
      setBalancesLoading(false);
    }
  };

  const currentGroup = groups.find(g => g._id === selectedGroup);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalOwed = data?.balances?.filter(b => b.status === 'owed').reduce((acc, b) => acc + Math.abs(b.balance), 0) || 0;
  const totalOwes = data?.balances?.filter(b => b.status === 'owes').reduce((acc, b) => acc + Math.abs(b.balance), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Balances</h1>
      </div>

      {/* Group Selector */}
      {groups.length > 1 && (
        <div className="relative max-w-xs">
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white font-bold text-text-primary cursor-pointer"
          >
            {groups.map(g => (
              <option key={g._id} value={g._id}>{g.name}</option>
            ))}
          </select>
          <ChevronDown size={20} className="absolute right-3 top-3.5 text-text-muted pointer-events-none" />
        </div>
      )}

      {balancesLoading ? (
        <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !data ? (
        <EmptyState icon="✨" title="No balances" description="Select a group to view balances." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6 border-l-4 border-success">
              <p className="text-sm font-bold text-text-secondary flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-success" /> Total owed to you
              </p>
              <div className="text-3xl font-black">
                <AmountBadge amount={totalOwed} currency={currentGroup?.currency} context="owed" />
              </div>
            </div>
            <div className="card p-6 border-l-4 border-danger">
              <p className="text-sm font-bold text-text-secondary flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-danger" /> Total you owe
              </p>
              <div className="text-3xl font-black">
                <AmountBadge amount={totalOwes} currency={currentGroup?.currency} context="owes" />
              </div>
            </div>
          </div>

          {data.settlements && data.settlements.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-text-primary">Suggested Settlements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.settlements.map((s, i) => (
                  <div key={i} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-text-primary">{s.from?.name}</div>
                        <ArrowRightLeft size={16} className="text-text-muted" />
                        <div className="font-bold text-text-primary">{s.to?.name}</div>
                      </div>
                      <div className="font-black text-lg">
                        <AmountBadge amount={s.amount} currency={currentGroup?.currency} context="neutral" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon="✨"
              title="All Settled Up!"
              description="Nobody owes anything in this group right now."
            />
          )}

          {/* Per member balances */}
          {data.balances && data.balances.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-4">Member Balances</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.balances.map((b, i) => (
                  <div key={i} className="card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">
                        {b.user?.name?.charAt(0)}
                      </div>
                      <span className="font-bold text-text-primary">{b.user?.name}</span>
                    </div>
                    <div className="text-sm font-bold text-text-secondary mb-1">
                      {b.status === 'owed' ? 'Gets back' : b.status === 'owes' ? 'Owes' : 'Settled'}
                    </div>
                    <div className="text-2xl font-black">
                      <AmountBadge amount={Math.abs(b.balance)} currency={currentGroup?.currency} context={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BalancesPage;
