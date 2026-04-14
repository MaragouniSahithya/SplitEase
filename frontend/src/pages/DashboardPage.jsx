import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroups, getExpenses } from '../lib/api';
import { Skeleton, CardSkeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Receipt, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user, pendingInvites } = useAuth();
  const [data, setData] = useState({ groups: [], expenses: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsRes, expensesRes] = await Promise.all([
          getGroups(),
          getExpenses({ view: 'all_groups', limit: 5 })
        ]);
        setData({
          groups: groupsRes.data || [],
          expenses: expensesRes.data?.expenses || []
        });
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Compute real stats from expense data
  const monthSpend = data.expenses
    .filter(e => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, e) => acc + e.amount, 0);

  const StatCard = ({ title, value, icon, type, isCount }) => (
    <div className="card p-5 border-l-4" style={{ borderLeftColor: type === 'positive' ? 'var(--success)' : type === 'negative' ? 'var(--danger)' : 'var(--primary-500)' }}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-bold text-text-secondary">{title}</p>
        <div className={`p-2 rounded-lg ${type === 'positive' ? 'bg-emerald-50 text-success' : type === 'negative' ? 'bg-red-50 text-danger' : 'bg-primary-50 text-primary-500'}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-black tabular-nums">
        {isCount ? value : <AmountBadge amount={value} context={type === 'positive' ? 'owed' : type === 'negative' ? 'owes' : 'neutral'} />}
      </h3>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left wide column */}
      <div className="lg:col-span-2 space-y-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-gradient-to-r from-primary-50 to-white border border-primary-100">
          <p className="text-text-secondary font-medium mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-3xl font-black text-primary-600 tracking-tight">{getGreeting()}, {user?.name?.split(' ')[0]} ☀️</h1>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Your groups" value={data.groups.length} icon={<Users size={20} />} type="neutral" isCount />
          <StatCard title="Total expenses" value={data.expenses.length} icon={<Receipt size={20} />} type="neutral" isCount />
          <StatCard title="This month" value={monthSpend} icon={<Receipt size={20} />} type="neutral" />
        </div>

        {/* Recent Expenses */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Clock size={20} className="text-primary-500" /> Recent Expenses</h2>
            <Link to="/expenses" className="text-sm font-bold text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : data.expenses.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {data.expenses.map((expense) => (
                <div key={expense._id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl">
                      {expense.category === 'food' ? '🍕' : expense.category === 'transport' ? '🚗' : '🛒'}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary">{expense.description}</p>
                      <p className="text-xs font-medium text-text-secondary">
                        {expense.group?.name} • Paid by {expense.paidBy?._id === user?._id ? 'you' : expense.paidBy?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black"><AmountBadge amount={expense.amount} currency={expense.group?.currency} /></p>
                    <p className="text-xs text-text-muted">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-text-secondary">No recent expenses found.</div>
          )}
        </div>

        {/* Groups */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Users size={20} className="text-primary-500" /> Your Groups</h2>
            <Link to="/groups" className="text-sm font-bold text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
          ) : data.groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.groups.slice(0, 4).map(group => (
                <Link key={group._id} to={`/groups/${group._id}`} className="card p-5 group hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-text-primary group-hover:text-primary-600 transition-colors">{group.name}</h3>
                      <p className="text-xs text-text-muted">{group.members?.filter(m => m.status === 'accepted').length || 0} members • {group.currency}</p>
                    </div>
                  </div>
                  {group.budget && group.budget.totalLimit && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-text-secondary">Budget</span>
                        <span className="text-primary-600">
                          {group.currency} {group.budget.totalLimit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500"
                          style={{ width: `${Math.min(100, ((group.totalExpenses || 0) / group.budget.totalLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-text-secondary">
              You aren't in any groups yet. <Link to="/groups" className="text-primary-600 font-bold">Create one</Link>
            </div>
          )}
        </div>
      </div>

      {/* Right narrow column */}
      <div className="space-y-6">
        {pendingInvites > 0 && (
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card p-5 border-2 border-primary-200 bg-primary-50/50">
            <h3 className="font-bold text-primary-700 mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div> Pending Invitations ({pendingInvites})</h3>
            <Link to="/invitations" className="block w-full py-2 bg-white rounded-lg text-center font-bold text-primary-600 shadow-sm hover:shadow-md transition-shadow">Review Invitations</Link>
          </motion.div>
        )}

        <div className="card p-5">
          <h3 className="font-bold text-text-primary mb-4 border-b border-slate-100 pb-2">Quick Links</h3>
          <div className="space-y-2">
            <Link to="/expenses/add" className="block w-full py-2 px-3 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold hover:bg-primary-100 transition-colors">+ Add Expense</Link>
            <Link to="/settlements" className="block w-full py-2 px-3 bg-slate-50 text-text-primary rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">Record Settlement</Link>
            <Link to="/budget" className="block w-full py-2 px-3 bg-slate-50 text-text-primary rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">View Budgets</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
