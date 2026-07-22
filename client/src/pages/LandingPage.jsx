import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Bot, Zap, Globe, ShieldCheck, ArrowRight, Star, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#080c14]/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30">
            P
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            PulseSite AI
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/client-login" className="text-sm text-slate-300 hover:text-white transition px-4 py-2">
            Client Login
          </Link>
          <Link to="/admin/login" className="text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition transform hover:-translate-y-0.5">
            Admin Console
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-indigo-400 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>Next-Gen Autonomous Agency Engine</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-8">
          Turn Unmapped Local Businesses Into <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            $49/mo Recurring Clients
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          PulseSite continuously audits local business reviews, calculates missed booking revenue, and dispatches psychological storytelling pitches via WhatsApp & Email — then closes deals with an AI Sales Consultant.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/admin/login" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/30 flex items-center justify-center space-x-3 transition transform hover:-translate-y-0.5">
            <span>Launch Agency Control Panel</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Review Auditor Agent</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Scrapes public Google & Yelp reviews, identifies missing pricing or online calendars, and calculates precise monthly revenue loss per niche.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl border border-white/10 hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Storytelling Fear Pitcher</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Constructs realistic lost-customer narratives showing owners how much revenue they lose to competitors daily.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">On-Demand Swarm & Sales Closer</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              When a lead replies YES, the AI Swarm builds their website live in 60 seconds and delivers the Razorpay/Lemon Squeezy checkout link.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Banner */}
      <section className="max-w-4xl mx-auto px-6 py-16 mb-20 glass-card rounded-3xl border border-indigo-500/30 p-10 text-center relative">
        <h2 className="text-3xl font-bold mb-4">Flat $49 / month Subscription Model</h2>
        <p className="text-slate-400 mb-8 max-w-xl mx-auto">
          Includes 24/7 AI Site Updates, Managed Hosting, SSL, Booking Engine, and Google Cloud Infrastructure.
        </p>
        <div className="inline-flex items-center space-x-2 text-emerald-400 font-semibold bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
          <CheckCircle className="w-5 h-5" />
          <span>Fully Automated Outreach & Closing Engine</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        PulseSite Autonomous Agency Platform &copy; 2026. Built with React, Express, Supabase & Google Cloud.
      </footer>
    </div>
  );
}
