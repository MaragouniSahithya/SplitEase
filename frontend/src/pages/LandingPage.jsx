import React from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { PieChart, Users, Receipt, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    { icon: <PieChart size={32} />, title: "Split Flexibly", desc: "Equal, exact, percentages or shares. We handle the math." },
    { icon: <CreditCard size={32} />, title: "Track Budgets", desc: "Set limits and get warned before you overspend." },
    { icon: <Receipt size={32} />, title: "Settle Instantly", desc: "Know exactly who owes who with minimum transactions." },
    { icon: <Users size={32} />, title: "Stay Organized", desc: "All your group trips, roommates, and events in one place." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-primary-50 to-transparent -z-10 rounded-bl-[100px]"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl -z-10"></div>
      
      {/* Header */}
      <header className="px-6 py-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-black text-primary-600 tracking-tight flex items-center gap-2">
          <span className="bg-primary-500 text-white rounded-lg p-1.5 shadow-sm">
            <PieChart size={24} />
          </span>
          SplitEase
        </h1>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="font-semibold text-text-secondary hover:text-primary-600 transition-colors">Sign In</Link>
          <Link to="/register" className="btn-primary px-5 py-2 rounded-xl hidden md:block">Get Started Free</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-32 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-5xl md:text-6xl font-black text-text-primary leading-tight mb-6 tracking-tight">
            Split smarter,<br/>not <span className="text-primary-500">harder.</span>
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-lg leading-relaxed">
            Track group expenses, settle debts, plan budgets — all in one beautiful app.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/register" className="btn-primary py-4 px-8 rounded-2xl text-lg flex justify-center items-center gap-2 group">
              Start Splitting <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="py-4 px-8 rounded-2xl text-lg font-semibold text-text-primary bg-white shadow-card hover:shadow-hover transition-all text-center">
              Sign In
            </Link>
          </div>
        </motion.div>
        
        {/* Floating cards graphic */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="relative h-80 md:h-full ml-auto w-full max-w-md hidden md:block">
          <div className="absolute top-10 right-4 card p-4 w-64 shadow-xl -rotate-6 z-10 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">🍕</div>
              <div><p className="font-bold text-sm">Dinner</p><p className="text-xs text-text-muted">You paid</p></div>
              <div className="ml-auto font-bold text-success">₹2,400</div>
            </div>
            <div className="flex justify-between items-center text-xs text-text-secondary border-t pt-2 mt-2">
              <span>Split equally</span>
              <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-bold">4 members</span>
            </div>
          </div>
          
          <div className="absolute top-40 right-24 card p-4 w-64 shadow-xl rotate-3 z-20 bg-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold">You are owed</p>
              <span className="text-success font-black tabular-nums">₹1,800</span>
            </div>
            <button className="w-full bg-primary-50 font-bold text-primary-600 py-2 rounded-lg text-sm">Send Reminders</button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-white py-24 px-6 md:px-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-text-primary mb-4">Everything you need</h2>
            <p className="text-text-secondary text-lg max-w-md mx-auto">No confusing math or missed payments.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card p-6 bg-slate-50 border-0 shadow-sm hover:shadow-hover transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary-500 mb-6">{f.icon}</div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-text-primary mb-4">How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
          {[
            { step: 1, title: 'Create Group', text: 'Start a group for a trip, house, or friend circle.' },
            { step: 2, title: 'Add Expenses', text: 'Enter who paid and how to split it.' },
            { step: 3, title: 'Settle Up', text: 'Pay back your friends seamlessly.' }
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary-500 text-white font-black text-2xl flex items-center justify-center rounded-3xl shadow-button border-4 border-white mb-6 relative">
                {s.step}
              </div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-text-secondary">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-700 py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-black text-white mb-6">Ready to simplify your group finances?</h2>
          <Link to="/register" className="inline-block bg-white text-primary-700 font-bold text-lg py-4 px-10 rounded-2xl shadow-lg hover:scale-105 transition-transform">
            Create an Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
