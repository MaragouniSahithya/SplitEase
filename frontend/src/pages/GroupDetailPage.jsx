import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getGroupDetail,
    sendInvitation,
    setBudget,
    recordSettlement,
    settleAll,
    deleteExpense,
    deleteGroup,
    cancelMemberInvitation
} from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import { Skeleton } from '../components/LoadingSpinner';
import AmountBadge from '../components/AmountBadge';
import EmptyState from '../components/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Plus, Users, Receipt, ArrowRightLeft,
    Settings, Mail, Loader2, X, CheckCircle, Trash2,
    PieChart, ChevronDown, AlertTriangle, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Expenses', 'Balances', 'Members', 'Settings'];

const CATEGORY_ICONS = {
    food: '🍕', transport: '🚗', accommodation: '🏨',
    entertainment: '🎫', shopping: '🛍️', utilities: '⚡',
    medical: '💊', fuel: '⛽', groceries: '🛒',
    subscriptions: '📱', other: '🧾'
};

// ─── Invite Modal ────────────────────────────────────────────────────────────
const InviteModal = ({ groupId, onClose }) => {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    const handleSend = async () => {
        if (!email.trim()) return toast.error('Enter an email address');
        setSending(true);
        try {
            const { data } = await sendInvitation(groupId, email.trim());
            setResult(data);
            toast.success(data.message || 'Invitation sent!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md z-10"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-text-primary">Invite Member</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {result?.inviteLink ? (
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">
                            This email isn't registered yet. Share this invite link:
                        </p>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 break-all text-xs text-primary-600 font-mono select-all">
                            {result.inviteLink}
                        </div>
                        <button
                            onClick={() => { navigator.clipboard.writeText(result.inviteLink); toast.success('Link copied!'); }}
                            className="w-full btn-primary py-2.5 rounded-xl font-bold"
                        >
                            Copy Link
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-text-primary mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-text-muted" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="friend@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-bold"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Send Invite</>}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

// ─── Budget Settings Panel ───────────────────────────────────────────────────
const BudgetPanel = ({ group, onSaved }) => {
    const [totalLimit, setTotalLimit] = useState(group.budget?.totalLimit || '');
    const [period, setPeriod] = useState(group.budget?.period || 'trip');
    const [alertThreshold, setAlertThreshold] = useState(group.budget?.alertThreshold || 80);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setBudget(group._id, { totalLimit: parseFloat(totalLimit), period, alertThreshold });
            toast.success('Budget saved!');
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card p-6 space-y-4">
            <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                <PieChart size={20} className="text-primary-500" /> Budget Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Total Limit ({group.currency})</label>
                    <input
                        type="number" min="1" value={totalLimit}
                        onChange={e => setTotalLimit(e.target.value)}
                        placeholder="e.g. 10000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Period</label>
                    <select
                        value={period} onChange={e => setPeriod(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                    >
                        <option value="trip">Trip (one-time)</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Alert at (%)</label>
                    <input
                        type="number" min="1" max="100" value={alertThreshold}
                        onChange={e => setAlertThreshold(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                </div>
            </div>
            <button
                onClick={handleSave} disabled={saving || !totalLimit}
                className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Budget'}
            </button>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [simplifiedDebts, setSimplifiedDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Expenses');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [settling, setSettling] = useState(null);
    const [settlingAll, setSettlingAll] = useState(false);
    const [confirmModal, setConfirmModal] = useState(null);

    const fetchGroup = async () => {
        try {
            const { data } = await getGroupDetail(id);
            setGroup(data.group);
            setExpenses(data.expenses || []);
            setSimplifiedDebts(data.simplifiedDebts || []);
        } catch (err) {
            toast.error('Failed to load group');
            if (err.response?.status === 403 || err.response?.status === 404) {
                navigate('/groups');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroup();
    }, [id]);

    const isAdmin = group?.members?.some(
        m => m.user?._id === user?._id && m.role === 'admin' && m.status === 'accepted'
    );

    const acceptedMembers = group?.members?.filter(m => m.status === 'accepted') || [];

    // ── Stats derived from expenses ──────────────────────────────────
    const totalSpent = expenses.filter(e => !e.isSettled || e.tags?.includes('settlement') === false)
        .reduce((acc, e) => acc + e.amount, 0);

    const myExpenses = expenses.filter(e => e.paidBy?._id === user?._id);
    const myTotal = myExpenses.reduce((acc, e) => acc + e.amount, 0);

    // ── Budget progress ───────────────────────────────────────────────
    const budgetPct = group?.budget?.totalLimit
        ? Math.min(100, (totalSpent / group.budget.totalLimit) * 100)
        : null;

    // ── Delete expense ────────────────────────────────────────────────
    const handleDeleteExpense = (expenseId) => {
        setConfirmModal({
            title: 'Delete Expense',
            message: 'This will permanently remove this expense and cannot be undone.',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                setConfirmModal(null);
                setDeletingId(expenseId);
                try {
                    await deleteExpense(expenseId);
                    setExpenses(prev => prev.filter(e => e._id !== expenseId));
                    toast.success('Expense deleted');
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to delete');
                } finally { setDeletingId(null); }
            }
        });
    };

    // ── Settle individual debt ─────────────────────────────────────────
    const handleSettle = async (debt) => {
        setSettling(debt);
        try {
            await recordSettlement(id, {
                payeeId: debt.to,
                amount: debt.amount,
                note: 'Settlement payment'
            });
            toast.success('Settlement recorded!');
            fetchGroup();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record settlement');
        } finally {
            setSettling(null);
        }
    };

    // ── Settle all (admin) ─────────────────────────────────────────────
    const handleSettleAll = () => {
        setConfirmModal({
            title: 'Settle All Expenses',
            message: 'This will mark every unpaid expense in this group as settled. This cannot be undone.',
            confirmLabel: 'Settle All',
            confirmStyle: 'primary',
            onConfirm: async () => {
                setConfirmModal(null);
                setSettlingAll(true);
                try {
                    await settleAll(id);
                    toast.success('All expenses settled!');
                    fetchGroup();
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to settle all');
                } finally { setSettlingAll(false); }
            }
        });
    };

    // ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-36 w-full" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!group) return null;

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/groups')}
                        className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-text-secondary"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-tight">
                            {group.name}
                        </h1>
                        {group.description && (
                            <p className="text-sm text-text-secondary mt-0.5">{group.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-text-secondary hover:bg-slate-50 font-bold text-sm transition-colors flex items-center gap-2 justify-center"
                    >
                        <Mail size={16} /> Invite
                    </button>
                    <Link
                        to="/expenses/add"
                        state={{ groupId: id }}
                        className="flex-1 sm:flex-none btn-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 justify-center"
                    >
                        <Plus size={16} /> Add Expense
                    </Link>
                </div>
            </div>

            {/* ── Budget Alert Banner ── */}
            {group.budget?.totalLimit && budgetPct !== null && budgetPct >= (group.budget.alertThreshold || 80) && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${budgetPct >= 100 ? 'bg-red-50 text-danger border border-red-100' : 'bg-orange-50 text-warning border border-orange-100'}`}
                >
                    <AlertTriangle size={18} />
                    {budgetPct >= 100
                        ? `⚠️ Over budget! Spent ${group.currency} ${totalSpent.toFixed(0)} of ${group.currency} ${group.budget.totalLimit} limit.`
                        : `📊 ${budgetPct.toFixed(0)}% of budget used — ${group.currency} ${(group.budget.totalLimit - totalSpent).toFixed(0)} remaining.`}
                </motion.div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="card p-4 border-l-4 border-primary-500">
                    <p className="text-xs font-bold text-text-muted mb-1">Total Spent</p>
                    <div className="text-xl font-black">
                        <AmountBadge amount={totalSpent} currency={group.currency} context="neutral" />
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-success">
                    <p className="text-xs font-bold text-text-muted mb-1">You Paid</p>
                    <div className="text-xl font-black">
                        <AmountBadge amount={myTotal} currency={group.currency} context="owed" />
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-slate-200 col-span-2 sm:col-span-1">
                    <p className="text-xs font-bold text-text-muted mb-1">Members</p>
                    <div className="text-xl font-black text-text-primary flex items-center gap-2">
                        <Users size={18} className="text-primary-500" />
                        {acceptedMembers.length}
                    </div>
                </div>
            </div>

            {/* ── Budget progress bar (if set) ── */}
            {group.budget?.totalLimit && (
                <div className="card p-4">
                    <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-text-secondary">Budget ({group.budget.period})</span>
                        <span className={budgetPct >= 100 ? 'text-danger' : budgetPct >= 75 ? 'text-warning' : 'text-success'}>
                            {budgetPct?.toFixed(1)}% used
                        </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${budgetPct}%`,
                                backgroundColor: budgetPct >= 100 ? 'var(--danger, #ef4444)' : budgetPct >= 75 ? 'var(--warning, #f97316)' : 'var(--success, #22c55e)'
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-text-muted mt-1.5">
                        <span>{group.currency} {totalSpent.toFixed(0)} spent</span>
                        <span>{group.currency} {group.budget.totalLimit} limit</span>
                    </div>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto hide-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >

                    {/* ═══ EXPENSES TAB ═══ */}
                    {activeTab === 'Expenses' && (
                        <div className="space-y-3">
                            {expenses.length === 0 ? (
                                <EmptyState
                                    icon="🧾"
                                    title="No expenses yet"
                                    description="Add your first expense to start tracking!"
                                    action={{ label: 'Add Expense', onClick: () => navigate('/expenses/add', { state: { groupId: id } }) }}
                                />
                            ) : (
                                expenses.map(expense => {
                                    const isMyExpense = expense.paidBy?._id === user?._id || expense.createdBy === user?._id;
                                    const canDelete = isMyExpense || isAdmin;
                                    const mySplit = expense.splits?.find(s => s.user?._id === user?._id);

                                    return (
                                        <div
                                            key={expense._id}
                                            className={`card p-4 flex justify-between items-center gap-4 ${expense.isSettled ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-xl shrink-0">
                                                    {CATEGORY_ICONS[expense.category] || '🧾'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-text-primary truncate">{expense.description}</p>
                                                    <p className="text-xs text-text-secondary mt-0.5">
                                                        Paid by{' '}
                                                        <span className="font-bold">
                                                            {expense.paidBy?._id === user?._id ? 'you' : expense.paidBy?.name}
                                                        </span>
                                                        {' · '}{new Date(expense.date).toLocaleDateString()}
                                                    </p>
                                                    {mySplit && !mySplit.isPaid && expense.paidBy?._id !== user?._id && (
                                                        <p className="text-xs text-danger font-bold mt-0.5">
                                                            You owe {group.currency} {mySplit.amount?.toFixed(2)}
                                                        </p>
                                                    )}
                                                    {expense.isSettled && (
                                                        <span className="inline-block text-xs bg-emerald-100 text-success font-bold px-2 py-0.5 rounded-full mt-1">Settled</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right">
                                                    <p className="font-black text-lg">
                                                        <AmountBadge amount={expense.amount} currency={group.currency} context="neutral" />
                                                    </p>
                                                    <p className="text-xs text-text-muted capitalize">{expense.category}</p>
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteExpense(expense._id)}
                                                        disabled={deletingId === expense._id}
                                                        className="p-2 text-text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        {deletingId === expense._id
                                                            ? <Loader2 size={16} className="animate-spin" />
                                                            : <Trash2 size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ═══ BALANCES TAB ═══ */}
                    {activeTab === 'Balances' && (
                        <div className="space-y-6">
                            {simplifiedDebts.length === 0 ? (
                                <div className="card p-8 text-center">
                                    <div className="text-4xl mb-3">🎉</div>
                                    <p className="font-bold text-lg text-success">All settled up!</p>
                                    <p className="text-sm text-text-secondary mt-1">Nobody owes anything right now.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h2 className="font-bold text-text-primary">Who Owes Who</h2>
                                        {isAdmin && (
                                            <button
                                                onClick={handleSettleAll}
                                                disabled={settlingAll}
                                                className="btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                                            >
                                                {settlingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                Settle All
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {simplifiedDebts.map((debt, i) => (
                                            <div key={i} className="card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 text-danger flex items-center justify-center text-xs font-bold">
                                                        {debt.from?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-bold text-text-primary">{debt.from?.name}</span>
                                                    <ArrowRightLeft size={16} className="text-text-muted" />
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-success flex items-center justify-center text-xs font-bold">
                                                        {debt.to?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-bold text-text-primary">{debt.to?.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-lg">
                                                        <AmountBadge amount={debt.amount} currency={group.currency} context="neutral" />
                                                    </span>
                                                    {/* Show Record button if current user is the debtor */}
                                                    {debt.from?._id === user?._id && (
                                                        <button
                                                            onClick={() => handleSettle(debt)}
                                                            disabled={!!settling}
                                                            className="bg-success text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:brightness-105 flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {settling === debt ? <Loader2 size={12} className="animate-spin" /> : null}
                                                            Record
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ═══ MEMBERS TAB ═══ */}
                    {activeTab === 'Members' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-text-primary">{acceptedMembers.length} Active Members</h2>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                                >
                                    <Plus size={14} /> Invite
                                </button>
                            </div>

                            <div className="space-y-3">
                                {group.members?.map((member, i) => (
                                    <div key={i} className={`card p-4 flex items-center justify-between ${member.status !== 'accepted' ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                                                {member.user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-text-primary">
                                                    {member.user?.name}
                                                    {member.user?._id === user?._id && (
                                                        <span className="ml-2 text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">You</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-text-secondary">{member.user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.role === 'admin' && (
                                                <span className="text-xs bg-primary-50 text-primary-700 font-bold px-2.5 py-1 rounded-full">Admin</span>
                                            )}
                                            {member.status === 'pending' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-orange-50 text-warning font-bold px-2.5 py-1 rounded-full">
                                                        Pending
                                                    </span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setConfirmModal({
                                                                title: 'Cancel Invitation',
                                                                message: `Cancel the invitation for ${member.user?.name || member.user?.email}?`,
                                                                confirmLabel: 'Cancel Invite',
                                                                confirmStyle: 'danger',
                                                                onConfirm: async () => {
                                                                    setConfirmModal(null);
                                                                    try {
                                                                        await cancelMemberInvitation(group._id, member.user._id);
                                                                        toast.success('Invitation cancelled');
                                                                        fetchGroup();
                                                                    } catch (err) {
                                                                        toast.error(err.response?.data?.message || 'Failed to cancel invitation');
                                                                    }
                                                                }
                                                            })}
                                                            className="p-1 text-text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Cancel invitation"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {member.status === 'left' && (
                                                <span className="text-xs bg-slate-100 text-text-muted font-bold px-2.5 py-1 rounded-full">Left</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ═══ SETTINGS TAB ═══ */}
                    {activeTab === 'Settings' && (
                        <div className="space-y-6 max-w-xl">
                            {isAdmin ? (
                                <>
                                    <BudgetPanel group={group} onSaved={fetchGroup} />

                                    <div className="card p-6 space-y-4 border border-red-100">
                                        <h3 className="font-bold text-lg text-danger">Danger Zone</h3>
                                        <p className="text-sm text-text-secondary">
                                            Settling all expenses will mark every unpaid expense in this group as settled. This cannot be undone.
                                        </p>
                                        <button
                                            onClick={handleSettleAll}
                                            disabled={settlingAll}
                                            className="px-5 py-2.5 bg-red-50 text-danger border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {settlingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                            Settle All Expenses
                                        </button>

                                        {isAdmin && (
                                            <button
                                                onClick={() => setConfirmModal({
                                                    title: 'Delete Group',
                                                    message: `This will permanently delete "${group.name}" and all its expenses. This cannot be undone.`,
                                                    confirmLabel: 'Delete Group',
                                                    confirmStyle: 'danger',
                                                    onConfirm: async () => {
                                                        setConfirmModal(null);
                                                        try {
                                                            await deleteGroup(id);
                                                            toast.success('Group deleted');
                                                            navigate('/groups');
                                                        } catch (err) {
                                                            toast.error(err.response?.data?.message || 'Failed to delete group');
                                                        }
                                                    }
                                                })}
                                                className="px-5 py-2.5 bg-red-100 text-danger border border-red-200 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors flex items-center gap-2 mt-4"
                                            >
                                                <Trash2 size={16} /> Delete Group
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="card p-6 text-center text-text-secondary">
                                    <Settings size={32} className="mx-auto mb-3 text-text-muted" />
                                    <p className="font-bold">Only group admins can change settings.</p>
                                </div>
                            )}
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>

            {/* ── Invite Modal ── */}
            <AnimatePresence>
                {showInviteModal && (
                    <InviteModal groupId={id} onClose={() => setShowInviteModal(false)} />
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
            </AnimatePresence>
        </div>
    );
};

export default GroupDetailPage;
