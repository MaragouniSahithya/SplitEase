import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Mail, Lock, Loader2 } from 'lucide-react';
import { loginUser } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data } = await loginUser(formData);

      // data: { token, user: { _id, name, email, avatar }, pendingInvites }
      login({
        user: data.user,
        token: data.token,
        pendingInvites: data.pendingInvites,
        isFirstLogin: false
      });

      toast.success(`Welcome back, ${data.user.name}! 👋`);

      if (data.pendingInvites > 0) {
        toast(`You have ${data.pendingInvites} pending invitation(s)!`, { icon: '📨' });
      }

      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side decorative */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-primary-700 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 text-center px-12">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 inline-flex mb-8">
            <PieChart size={64} className="text-white" />
          </motion.div>
          <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl font-black text-white mb-4">
            Welcome back
          </motion.h2>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-primary-100 text-xl font-medium max-w-md mx-auto">
            Log in to manage your group expenses, settle debts, and keep your budgets on track.
          </motion.p>
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-base">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-12 lg:hidden">
            <span className="bg-primary-500 text-white rounded-lg p-1">
              <PieChart size={20} />
            </span>
            <span className="text-xl font-black text-primary-600">SplitEase</span>
          </div>

          <h2 className="text-3xl font-black text-text-primary mb-2">Sign In</h2>
          <p className="text-text-secondary mb-8">Enter your email and password to access your account.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="hello@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-primary-500" />
              <span>Remember me</span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3.5 rounded-xl text-lg flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Log In'}
            </button>
          </form>

          <p className="mt-8 text-center text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-primary-600 hover:text-primary-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
