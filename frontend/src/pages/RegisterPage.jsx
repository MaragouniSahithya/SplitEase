import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PieChart, Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react';
import { registerUser, verifyInviteToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      if (!inviteToken) return;
      try {
        const { data } = await verifyInviteToken(inviteToken);
        setInviteData(data); // e.g. { email, groupName, inviterName }
        setFormData(prev => ({ ...prev, email: data.email }));
      } catch (err) {
        setInviteError('This invitation link is invalid or has expired.');
      }
    };
    verifyToken();
  }, [inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteToken: inviteToken || undefined
      };
      
      const { data } = await registerUser(payload);
      
      login({
        user: data.user,
        token: data.token,
        pendingInvites: 0,
        isFirstLogin: true
      });
      
      toast.success('Account created successfully! 🎉');
      navigate('/onboarding', { state: { joinedGroup: data.joinedGroup } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-base">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="bg-primary-500 text-white rounded-lg p-1">
              <PieChart size={20} />
            </span>
            <span className="text-xl font-black text-primary-600">SplitEase</span>
          </div>

          <h2 className="text-3xl font-black text-text-primary mb-2">Create Account</h2>
          <p className="text-text-secondary mb-6">Join SplitEase to start managing your expenses.</p>

          <AnimatePresence>
            {inviteData && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-emerald-50 border border-success/20 p-4 rounded-xl flex gap-3 text-emerald-800">
                <CheckCircle2 className="text-success shrink-0" />
                <p className="text-sm font-medium">
                  🎉 <strong>{inviteData.inviterName || 'Someone'}</strong> invited you to join <strong>{inviteData.groupName || 'a group'}</strong>! Create your account to join.
                </p>
              </motion.div>
            )}
            {inviteError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-50 border border-danger/20 p-4 rounded-xl text-danger text-sm font-medium">
                ⚠️ {inviteError}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><User size={20} /></div>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Alex Smith" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Mail size={20} /></div>
                <input required type="email" disabled={!!inviteData} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none disabled:bg-slate-100 disabled:text-text-muted" placeholder="hello@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Lock size={20} /></div>
                <input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="••••••••" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Lock size={20} /></div>
                <input required type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3.5 rounded-xl text-lg flex items-center justify-center gap-2 mt-6">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Sign Up'}
            </button>
          </form>

          <p className="mt-8 text-center text-text-secondary">
            Already have an account? <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700">Log in</Link>
          </p>
        </div>
      </div>

      {/* Right side decorative */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-primary-700 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 text-center px-12">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 inline-flex mb-8">
            <PieChart size={64} className="text-white" />
          </motion.div>
          <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl font-black text-white mb-4">
            Join the Club
          </motion.h2>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-primary-100 text-xl font-medium max-w-md mx-auto">
            Say goodbye to awkward money conversations. Start Splitting the easy way.
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
