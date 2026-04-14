import React, { useState, useEffect } from 'react';
import { getMyInvitations, respondToInvitation } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Mail, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const InvitationsPage = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { setPendingInvites } = useAuth();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data } = await getMyInvitations();
      setInvitations(data.invitations || []);
      setPendingInvites(data.invitations?.length || 0);
    } catch {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (groupId, action) => {
    setProcessingId(groupId);
    try {
      await respondToInvitation(groupId, { action }); // action: 'accept' | 'decline'
      toast.success(action === 'accept' ? 'Joined group!' : 'Invitation declined');
      setInvitations(prev => prev.filter(inv => inv.group?._id !== groupId));
      setPendingInvites(prev => Math.max(0, prev - 1));
    } catch {
      toast.error(`Failed to ${action} invitation`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
          <Mail size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Pending Invitations</h1>
          <p className="text-sm text-text-secondary">Groups you've been invited to join</p>
        </div>
      </div>

      {invitations.length > 0 ? (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div key={inv._id || inv.group?._id} className="card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">New Invite</p>
                <h3 className="font-bold text-xl text-text-primary mb-1">{inv.group?.name}</h3>
                <p className="text-sm text-text-secondary">Invited by <span className="font-bold">{inv.inviter?.name || 'Someone'}</span></p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleResponse(inv.group?._id, 'decline')}
                  disabled={processingId === inv.group?._id}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-text-secondary hover:bg-slate-200 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleResponse(inv.group?._id, 'accept')}
                  disabled={processingId === inv.group?._id}
                  className="flex-1 sm:flex-none btn-primary px-6 py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === inv.group?._id ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Accept</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📬"
          title="No pending invites"
          description="You're all caught up! When someone invites you to a group, it will appear here."
        />
      )}
    </div>
  );
};

export default InvitationsPage;
