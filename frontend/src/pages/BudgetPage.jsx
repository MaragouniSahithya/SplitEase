import React, { useState, useEffect } from 'react';
import { getGroups, getBudgetProgress, setBudget } from '../lib/api';
import { Skeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import EmptyState from '../components/EmptyState';
import { PieChart, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BudgetPage = () => {
  const [groups, setGroups] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await getGroups();
      const budgetGroups = (data || []).filter(g => g.budget?.totalLimit);
      setGroups(budgetGroups);

      if (budgetGroups.length > 0) {
        setLoadingProgress(true);
        const results = await Promise.allSettled(
          budgetGroups.map(g => getBudgetProgress(g._id))
        );
        const map = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            map[budgetGroups[i]._id] = r.value.data;
          }
        });
        setProgressMap(map);
        setLoadingProgress(false);
      }
    } catch {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
          <PieChart size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Budgets</h1>
          <p className="text-sm text-text-secondary">Track group spending against your limits</p>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-6 max-w-4xl">
          {groups.map(group => {
            const progress = progressMap[group._id];
            const limit = group.budget.totalLimit;
            const spent = progress?.progress?.totalSpent ?? 0;
            const percentage = Math.min(100, Math.max(0, (spent / limit) * 100));
            const remaining = limit - spent;
            const alertLevel = progress?.progress?.alertLevel || 'ok';

            let statusColor = 'bg-success';
            let trackColor = 'bg-emerald-100';
            let textColor = 'text-success';

            if (percentage > 90 || alertLevel === 'over_budget') {
              statusColor = 'bg-danger';
              trackColor = 'bg-red-100';
              textColor = 'text-danger';
            } else if (percentage > 75 || alertLevel === 'warning') {
              statusColor = 'bg-warning';
              trackColor = 'bg-orange-100';
              textColor = 'text-warning';
            }

            return (
              <div key={group._id} className="card p-6">
                <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{group.name}</h3>
                    <p className="text-sm text-text-secondary flex items-center gap-2 mt-1">
                      {(percentage > 90 || alertLevel === 'over_budget') && (
                        <AlertTriangle size={14} className="text-danger" />
                      )}
                      {progress?.progress?.message || (percentage > 90 ? 'Nearing or exceeded limit' : 'On track')}
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm">
                      <span className="font-bold text-text-secondary">Limit: </span>
                      <span className="font-black text-text-primary">
                        <AmountBadge amount={limit} currency={group.currency} context="neutral" />
                      </span>
                    </div>
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm capitalize">
                      <span className="font-bold text-text-secondary">Period: </span>
                      <span className="font-black text-text-primary">{group.budget.period || 'trip'}</span>
                    </div>
                  </div>
                </div>

                {/* Main progress bar */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm font-bold">
                    <span className={textColor}>{percentage.toFixed(1)}% Used</span>
                    <span className="text-text-secondary">
                      <AmountBadge amount={spent} currency={group.currency} context="neutral" /> spent
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full overflow-hidden bg-slate-200">
                    <div
                      className="h-full transition-all duration-1000 rounded-full"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: percentage > 90 || alertLevel === 'over_budget' ? 'var(--danger, #ef4444)'
                                        : percentage > 75 || alertLevel === 'warning' ? 'var(--warning, #f97316)'
                                        : 'var(--success, #22c55e)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium text-text-muted">
                    <span>0</span>
                    <span className="font-bold">
                      Remaining: <AmountBadge amount={Math.max(0, remaining)} currency={group.currency} context="neutral" />
                    </span>
                    <span>{group.currency} {limit.toLocaleString()}</span>
                  </div>
                </div>

                {/* Per-category breakdown */}
                {loadingProgress ? (
                  <Skeleton className="h-16 w-full" />
                ) : progress?.categoryProgress?.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-text-secondary mb-3 uppercase tracking-wide">By Category</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {progress.categoryProgress.map((cat, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-text-primary capitalize">{cat.category}</span>
                            <AmountBadge amount={cat.spent} currency={group.currency} context="neutral" />
                          </div>
                          {cat.limit && (
                            <>
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, cat.pct || 0)}%`,
                                    backgroundColor: cat.status === 'over' ? '#ef4444'
                                                    : cat.status === 'warning' ? '#f97316'
                                                    : '#22c55e'
                                  }}
                                />
                              </div>
                              <p className="text-xs text-text-muted mt-1">{cat.pct?.toFixed(1)}% of {group.currency} {cat.limit}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Projection */}
                {progress?.projection && (
                  <div className={`mt-4 p-3 rounded-xl border text-sm ${progress.projection.onTrack ? 'bg-emerald-50 border-emerald-100 text-success' : 'bg-red-50 border-red-100 text-danger'}`}>
                    <TrendingUp size={14} className="inline mr-2" />
                    <strong>Projection:</strong> At current pace, projected total is{' '}
                    <AmountBadge amount={progress.projection.projectedTotal} currency={group.currency} context="neutral" />.{' '}
                    {progress.projection.onTrack ? 'On track ✅' : `Overrun by ${group.currency} ${progress.projection.projectedOverrun?.toFixed(0)} ⚠️`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="📊"
          title="No Active Budgets"
          description="None of your groups currently have a budget set. Open a group → Settings tab to add one."
        />
      )}
    </div>
  );
};

export default BudgetPage;
