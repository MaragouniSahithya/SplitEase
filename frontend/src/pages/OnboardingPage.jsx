import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createGroup, sendInvitation } from '../lib/api';
import toast from 'react-hot-toast';
import { Check, X, Loader2, Users, Receipt, Send } from 'lucide-react';

const OnboardingPage = () => {
  const { user, setIsFirstLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const joinedGroup = location.state?.joinedGroup;

  // If joinedGroup is true, skip steps 2 and 3, go to 4.
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Group creation state
  const [groupData, setGroupData] = useState({ name: '', description: '', currency: 'INR' });
  const [createdGroupId, setCreatedGroupId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Invites state
  const [emails, setEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const nextStep = (targetStep) => {
    setDirection(1);
    setStep(targetStep);
  };

  const handleFinish = () => {
    setIsFirstLogin(false);
    navigate('/dashboard');
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data } = await createGroup(groupData);
      setCreatedGroupId(data._id);
      toast.success('Group created!');
      nextStep(3);
    } catch (err) {
      toast.error('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendInvites = async () => {
    setIsInviting(true);
    try {
      const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
      for (const email of emailList) {
        await sendInvitation(createdGroupId, email);
      }
      toast.success('Invitations sent!');
      nextStep(4);
    } catch (err) {
      toast.error('Some invitations failed to send');
    } finally {
      setIsInviting(false);
    }
  };

  const variants = {
    initial: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 })
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-bold text-text-muted mb-2 px-1">
            <span>Welcome</span>
            <span>Create</span>
            <span>Invite</span>
            <span>Done</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
            <div className={`h-full bg-primary-500 transition-all duration-500 ${step >= 1 ? 'w-1/4' : 'w-0'}`}></div>
            <div className={`h-full bg-primary-500 transition-all duration-500 ${step >= 2 ? 'w-1/4' : 'w-0'}`}></div>
            <div className={`h-full bg-primary-500 transition-all duration-500 ${step >= 3 ? 'w-1/4' : 'w-0'}`}></div>
            <div className={`h-full bg-primary-500 transition-all duration-500 ${step >= 4 ? 'w-1/4' : 'w-0'}`}></div>
          </div>
        </div>

        <div className="bg-card shadow-card border border-slate-100 rounded-3xl p-8 md:p-12 min-h-[400px] relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-emerald-100 text-success rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-3xl font-black text-text-primary mb-4">Welcome to SplitEase, {user?.name}!</h2>
                
                {joinedGroup ? (
                  <p className="text-text-secondary text-lg mb-8">You've been added to your group! Here's what you can do next.</p>
                ) : (
                  <p className="text-text-secondary text-lg mb-8">We're so glad you're here. Let's get you set up to start splitting expenses easily.</p>
                )}
                
                <button onClick={() => nextStep(joinedGroup ? 4 : 2)} className="btn-primary py-3.5 px-8 rounded-xl text-lg w-full max-w-sm">
                  Let's Go
                </button>
              </motion.div>
            )}

            {step === 2 && !joinedGroup && (
              <motion.div key="step2" custom={direction} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary-50 text-primary-600 rounded-xl"><Users size={24} /></div>
                  <h2 className="text-2xl font-black text-text-primary">Create your first group</h2>
                </div>
                
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Group Name</label>
                    <input required type="text" value={groupData.name} onChange={e => setGroupData({...groupData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="e.g. Goa Trip 2026" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Description (Optional)</label>
                    <input type="text" value={groupData.description} onChange={e => setGroupData({...groupData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Beach side chills" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Currency</label>
                    <select value={groupData.currency} onChange={e => setGroupData({...groupData, currency: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white">
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-8">
                    <button type="submit" disabled={isCreating} className="w-full btn-primary py-3.5 rounded-xl text-lg flex items-center justify-center gap-2">
                      {isCreating ? <Loader2 className="animate-spin" /> : 'Create Group'}
                    </button>
                    <button type="button" onClick={() => nextStep(4)} className="w-full py-3.5 rounded-xl font-bold text-text-secondary hover:bg-slate-100 transition-colors">
                      Skip, I'll join one later
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && !joinedGroup && (
              <motion.div key="step3" custom={direction} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary-50 text-primary-600 rounded-xl"><Send size={24} /></div>
                  <h2 className="text-2xl font-black text-text-primary">Invite friends</h2>
                </div>
                <p className="text-text-secondary mb-6">Add friends to <span className="font-bold text-text-primary">{groupData.name}</span> so you can start splitting expenses.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">Email Addresses (comma separated)</label>
                    <textarea 
                      value={emails} onChange={e => setEmails(e.target.value)} 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none min-h-[120px]" 
                      placeholder="friend@example.com, another@example.com" 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-8">
                    <button onClick={handleSendInvites} disabled={isInviting || !emails.trim()} className="w-full btn-primary py-3.5 rounded-xl text-lg flex items-center justify-center gap-2 disabled:opacity-50">
                      {isInviting ? <Loader2 className="animate-spin" /> : 'Send Invites'}
                    </button>
                    <button type="button" onClick={() => nextStep(4)} className="w-full py-3.5 rounded-xl font-bold text-text-secondary hover:bg-slate-100 transition-colors">
                      Skip for now
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" custom={direction} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-6">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black text-text-primary mb-4">You're all set!</h2>
                
                <div className="bg-slate-50 w-full rounded-2xl p-6 text-left mb-8 space-y-4 text-text-secondary">
                  <div className="flex items-center gap-3">
                    <Check size={20} className="text-success" /> Account created
                  </div>
                  <div className="flex items-center gap-3">
                    {joinedGroup ? <Check size={20} className="text-success" /> : (createdGroupId ? <Check size={20} className="text-success" /> : <span className="text-slate-300"><Check size={20}/></span>)} 
                    {joinedGroup ? "Joined group" : "Created group"}
                  </div>
                  <div className="flex items-center gap-3">
                    {emails ? <Check size={20} className="text-success" /> : (joinedGroup ? <Check size={20} className="text-success" /> : <span className="text-slate-300"><Check size={20}/></span>)}
                    Ready to track expenses
                  </div>
                </div>
                
                <button onClick={handleFinish} className="btn-primary py-3.5 px-8 rounded-xl text-lg w-full max-w-sm font-bold shadow-button hover:scale-[1.02] transition-transform">
                  Go to Dashboard
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
