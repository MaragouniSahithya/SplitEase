import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, getBalances, recordSettlement, settleAll } from '../lib/api';
import { Skeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { ArrowRightLeft, CheckCircle, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SettlementsPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [balancesData, setBalancesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [settling, setSettling] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

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
      // Fix: setData to setBalancesData
      setBalancesData(balData);
    } catch (err) {
      // Only toast if it's a real server error, not a 400 from missing groupId
      if (err.response?.status !== 400) {
        toast.error('Failed to load balances');
      }
      setBalancesData(null);
    } finally {
      setBalancesLoading(false);
    }
  };

  const handleSettle = async (settlement, idx) => {
    if (settling !== null) return;
    setSettling(idx);
    try {
      await recordSettlement(selectedGroup, {
        payeeId: settlement.to._id,
        amount: settlement.amount,
        note: `Settlement payment`
      });
      toast.success(`Settlement of ${settlement.amount} recorded!`);
      fetchBalances(selectedGroup);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSettling(null);
    }
  };

  const handleSettleAll = () => {
    if (!selectedGroup) return;
    setConfirmModal({
      title: 'Settle All Debts',
      message: 'This will mark all unpaid expenses in this group as settled. This cannot be undone.',
      confirmLabel: 'Settle All',
      confirmStyle: 'primary',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await settleAll(selectedGroup);
          toast.success('All debts settled!');
          fetchBalances(selectedGroup);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to settle all');
        }
      }
    });
  };

  const currentGroup = groups.find(g => g._id === selectedGroup);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Settlements</h1>
          <p className="text-text-secondary text-sm mt-1">Record payments and clear your debts</p>
        </div>
        {balancesData?.settlements?.length > 0 && (
          <button
            onClick={handleSettleAll}
            className="btn-primary py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <CheckCircle size={18} /> Settle All
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="🤝" title="No Groups" description="Join or create a group to track settlements." />
      ) : (
        <>
          {/* Group Selector */}
          <div className="relative">
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

          {balancesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !balancesData ? null : (
            <div className="space-y-6">
              {/* Who owes whom */}
              <div className="card p-6">
                <h2 className="text-lg font-bold text-text-primary mb-4">How to Settle Up</h2>
                {balancesData.settlements && balancesData.settlements.length > 0 ? (
                  <div className="space-y-3">
                    {balancesData.settlements.map((s, i) => (
                      <div key={i} className="flex flex-col sm:flex-row justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-text-primary">{s.from?.name}</div>
                          <ArrowRightLeft size={16} className="text-text-muted" />
                          <div className="font-bold text-text-primary">{s.to?.name}</div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="font-black text-lg">
                            <AmountBadge amount={s.amount} currency={currentGroup?.currency} context="neutral" />
                          </div>
                          <button
                            onClick={() => handleSettle(s, i)}
                            disabled={settling === i}
                            className="bg-success text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:brightness-105 shadow-sm flex items-center gap-2 disabled:opacity-50"
                          >
                            {settling === i ? <Loader2 size={14} className="animate-spin" /> : null}
                            Record
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-emerald-50 rounded-xl text-success font-bold">
                    🎉 All settled up in {currentGroup?.name}!
                  </div>
                )}
              </div>

              {/* Individual balances */}
              {balancesData.balances && (
                <div>
                  <h2 className="text-lg font-bold text-text-primary mb-4">Individual Balances</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {balancesData.balances.map((b, i) => (
                      <div key={i} className="card p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                            {b.user?.name?.charAt(0) || 'U'}
                          </div>
                          <span className="font-bold text-text-primary">{b.user?.name}</span>
                        </div>
                        <div className="text-sm font-bold text-text-secondary mb-1">
                          {b.status === 'owed' ? 'Gets back' : b.status === 'owes' ? 'Owes' : 'Settled'}
                        </div>
                        <div className="text-xl font-black">
                          <AmountBadge amount={Math.abs(b.balance)} currency={currentGroup?.currency} context={b.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmStyle={confirmModal.confirmStyle || 'danger'}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default SettlementsPage;
