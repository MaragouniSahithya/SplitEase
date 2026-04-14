import React, { useState, useEffect } from 'react';
import { getExpenses } from '../lib/api';
import { Skeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import EmptyState from '../components/EmptyState';
import { Receipt, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data } = await getExpenses({ view: 'all_groups', limit: 50 });
      setExpenses(data.expenses || []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    e.group?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">All Expenses</h1>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-3 text-text-muted" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search expenses or groups..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
        <button className="px-4 py-3 rounded-xl border border-slate-200 text-text-secondary hover:bg-slate-50 transition-colors flex items-center gap-2 font-bold">
          <Filter size={20} /> <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filteredExpenses.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {filteredExpenses.map((expense) => (
            <div key={expense._id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-xl shrink-0">
                  {expense.category === 'food' ? '🍕' : expense.category === 'transport' ? '🚗' : '🧾'}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-text-primary mb-0.5 leading-tight">{expense.description}</h4>
                  <p className="text-sm text-text-secondary">
                    {expense.group?.name} • <span className="text-text-muted">{new Date(expense.date).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-lg"><AmountBadge amount={expense.amount} currency={expense.group?.currency} /></p>
                <p className="text-xs font-bold text-text-secondary mt-1">Paid by {expense.paidBy?.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon="🧾" 
          title={search ? "No matches found" : "No expenses yet"} 
          description={search ? "Try a different search term." : "You haven't been part of any expenses. Join a group and add one!"} 
        />
      )}
    </div>
  );
};

export default ExpensesPage;
