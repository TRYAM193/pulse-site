import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bot, Calendar, BarChart3, ExternalLink, LogOut, Send, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

export default function ClientPortal() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [clientInfo, setClientInfo] = useState({ businessName: '', ownerEmail: '', stripeStatus: 'trial' });
  const [metrics, setMetrics] = useState({ pageviews: 0, bookings: 0, conversionRate: 0 });
  const [bookings, setBookings] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hi! I'm your AutoAgency AI assistant 👋 Tell me what you want to update on your website, like: 'Change hair salon price list' or 'Update Sunday hours'." }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const token = localStorage.getItem('client_token');

  useEffect(() => {
    if (!token) {
      navigate('/client-login');
      return;
    }
    loadPortalData();
  }, [clientId, token]);

  const loadPortalData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`/api/portal/${clientId}/dashboard`, { headers });
      if (res.ok) {
        const data = await res.json();
        setClientInfo({
          businessName: data.businessName || 'My Business',
          ownerEmail: data.ownerEmail || '',
          stripeStatus: data.stripeStatus || 'trial'
        });
        if (data.metrics) setMetrics(data.metrics);
        if (data.bookings) setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Portal load failed:', err);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/portal/${clientId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: userText })
      });

      const data = await res.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error applying website update: ' + err.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    try {
      await fetch(`/api/portal/${clientId}/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      loadPortalData();
    } catch (err) {
      alert('Error updating booking: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_id');
    navigate('/client-login');
  };

  const handleActivatePro = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/subscribe-public`, { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert('Checkout error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0d1423]/90 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              P
            </div>
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {clientInfo.businessName || 'Client Portal'}
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Management Console</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'dashboard' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'editor' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Site Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'bookings' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <Calendar className="w-4 h-4" />
              <span>Bookings ({bookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'analytics' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition mt-6"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl">
        {/* Guided Onboarding Banner */}
        {!onboardingDismissed && (
          <div className="mb-8 p-6 rounded-2xl glass-card border border-indigo-500/30 relative overflow-hidden bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Prototype Onboarding Walkthrough</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Welcome! Your custom website prototype is ready.</h3>
                <p className="text-slate-400 text-sm max-w-2xl">
                  Follow these steps to preview, test your booking system, and activate Pro ($49/mo).
                </p>
              </div>

              <button onClick={() => setOnboardingDismissed(true)} className="text-xs text-slate-500 hover:text-slate-300">
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6">
              <a href={`/client/${clientId}/`} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-indigo-300 flex items-center justify-between">
                <span>1. View Site Prototype</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button onClick={() => setActiveTab('editor')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-purple-300 flex items-center justify-between text-left">
                <span>2. Try AI Site Editor</span>
                <Bot className="w-3.5 h-3.5" />
              </button>

              <button onClick={() => setActiveTab('bookings')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-amber-300 flex items-center justify-between text-left">
                <span>3. View Appointments</span>
                <Calendar className="w-3.5 h-3.5" />
              </button>

              <button onClick={handleActivatePro} className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-between">
                <span>4. Activate Pro ($49/mo)</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {clientInfo.businessName} 👋</h2>
                <p className="text-slate-400 text-sm mt-1">Here's your website performance summary.</p>
              </div>

              <a
                href={`/client/${clientId}/`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center space-x-2"
              >
                <span>View Live Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase">Pageviews</span>
                <div className="text-3xl font-black text-indigo-400 mt-2">{metrics.pageviews}</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase">Bookings</span>
                <div className="text-3xl font-black text-emerald-400 mt-2">{metrics.bookings}</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase">Conversion Rate</span>
                <div className="text-3xl font-black text-purple-400 mt-2">{metrics.conversionRate}%</div>
              </div>
            </div>

            {/* Embedded Site Preview Frame */}
            <div className="glass-card rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-300">Live Website Embedded Preview</span>
                <a href={`/client/${clientId}/`} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">
                  Open in New Tab ↗
                </a>
              </div>
              <div className="w-full h-[500px] rounded-xl overflow-hidden border border-white/10 bg-black">
                <iframe src={`/client/${clientId}/`} className="w-full h-full border-none" title="Live Preview" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Site Editor */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">🤖 24/7 AI Website Editor</h2>
              <p className="text-slate-400 text-sm mt-1">Describe changes in plain English and watch your site update instantly.</p>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 flex flex-col h-[550px]">
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg p-4 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'bg-white/10 border border-white/10 text-slate-200'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-slate-500 animate-pulse">AI Agent is compiling website updates...</div>
                )}
              </div>

              <form onSubmit={handleSendChat} className="p-4 border-t border-white/10 flex gap-3">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="e.g. 'Add a new service Hair Glossing for $45'"
                  className="flex-1 glass-input px-4 py-3 rounded-xl outline-none text-sm"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl text-sm flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Bookings */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">📅 Appointment Requests ({bookings.length})</h2>
              <p className="text-slate-400 text-sm mt-1">Review and manage customer bookings.</p>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-500">No bookings logged yet.</td>
                    </tr>
                  ) : (
                    bookings.map((bk, i) => (
                      <tr key={i} className="hover:bg-white/5 transition">
                        <td className="p-4 font-semibold">{bk.customer_name}<br/><span className="text-xs text-slate-400 font-normal">{bk.customer_email}</span></td>
                        <td className="p-4 text-indigo-300 font-medium">{bk.service_name}</td>
                        <td className="p-4 text-slate-400 text-xs">{bk.booking_date}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${bk.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : bk.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {bk.status}
                          </span>
                        </td>
                        <td className="p-4 space-x-2">
                          <button onClick={() => handleBookingStatus(bk.id, 'approved')} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30">Approve</button>
                          <button onClick={() => handleBookingStatus(bk.id, 'rejected')} className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">Reject</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">📊 Analytics & Visitor Traffic</h2>
              <p className="text-slate-400 text-sm mt-1">Live customer conversion metrics.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase">Total Visitors</span>
                <div className="text-3xl font-black text-indigo-400 mt-2">{metrics.pageviews}</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase">Successful Bookings</span>
                <div className="text-3xl font-black text-emerald-400 mt-2">{metrics.bookings}</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase">Conversion Rate</span>
                <div className="text-3xl font-black text-purple-400 mt-2">{metrics.conversionRate}%</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
