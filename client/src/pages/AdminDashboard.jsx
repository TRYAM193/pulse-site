import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, DollarSign, Calendar, Search, Send, Play, RefreshCw, LogOut, CheckCircle2, Shield, Eye, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalClients: 0, activeSites: 0, mrr: 0, totalBookings: 0 });
  const [campaignStats, setCampaignStats] = useState({ totalOutreached: 0, day1Sent: 0, day2Sent: 0, day3Sent: 0, totalReplied: 0, totalConverted: 0 });
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prospectCity, setProspectCity] = useState('Seattle');
  const [prospectNiche, setProspectNiche] = useState('hair_salon');
  const [prospectResults, setProspectResults] = useState([]);
  const [triggeringCycle, setTriggeringCycle] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Load basic stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) setStats(await statsRes.json());

      // Load campaign stats & logs
      const campRes = await fetch('/api/admin/campaigns', { headers });
      if (campRes.ok) {
        const cData = await campRes.json();
        if (cData.stats) setCampaignStats(cData.stats);
        if (cData.campaigns) setCampaignLogs(cData.campaigns);
      }

      // Load activity
      const actRes = await fetch('/api/admin/activity', { headers });
      if (actRes.ok) {
        const aData = await actRes.json();
        if (Array.isArray(aData)) setActivity(aData);
      }

      // Load clients
      const cliRes = await fetch('/api/clients', { headers });
      if (cliRes.ok) setClients(await cliRes.json());

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleSearchLeads = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?niche=${prospectNiche}&city=${prospectCity}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProspectResults(await res.json());
    } catch (err) {
      alert('Lead search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerOutreach = async () => {
    setTriggeringCycle(true);
    try {
      const res = await fetch('/api/admin/outreach/trigger', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message || 'Outreach cycle triggered!');
      loadData();
    } catch (err) {
      alert('Error triggering cycle: ' + err.message);
    } finally {
      setTriggeringCycle(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0d1423]/90 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              P
            </div>
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">PulseSite</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Admin Console</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'overview' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('prospector')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'prospector' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <Search className="w-4 h-4" />
              <span>Lead Prospector</span>
            </button>

            <button
              onClick={() => setActiveTab('outreach')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'outreach' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <Send className="w-4 h-4" />
              <span>Drip Campaigns</span>
            </button>

            <button
              onClick={() => setActiveTab('sites')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'sites' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <Users className="w-4 h-4" />
              <span>Client Sites ({clients.length})</span>
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

      {/* Main Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Good morning, Admin ✨</h2>
              <p className="text-slate-400 text-sm mt-1">Here is your live agency metric breakdown today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
                  <span>Monthly Revenue (MRR)</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400">${stats.mrr}</div>
                <p className="text-xs text-slate-500 mt-2">{stats.activeSites} active subscriptions ($49/mo)</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
                  <span>Outreached Leads</span>
                  <Send className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-indigo-400">{campaignStats.totalOutreached}</div>
                <p className="text-xs text-slate-500 mt-2">Targeting 10 fresh companies/day</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
                  <span>Lead Replies</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-purple-400">{campaignStats.totalReplied}</div>
                <p className="text-xs text-slate-500 mt-2">Engaging AI Sales Agent</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
                  <span>Total Bookings</span>
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400">{stats.totalBookings}</div>
                <p className="text-xs text-slate-500 mt-2">Captured across all sites</p>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                <span>Live Activity Feed</span>
              </h3>

              {activity.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No live traffic events logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((act, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-sm">
                      <div className="flex items-center space-x-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${act.event_type === 'pageview' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                        <span className="font-semibold text-slate-200">{act.clientName || 'Lead Visitor'}</span>
                        <span className="text-xs text-slate-400">({act.event_type})</span>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(act.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Prospector */}
        {activeTab === 'prospector' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">🔎 Google Maps Lead Prospector</h2>
              <p className="text-slate-400 text-sm mt-1">Discover businesses without websites & analyze public review gaps.</p>
            </div>

            <form onSubmit={handleSearchLeads} className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4">
              <select
                value={prospectNiche}
                onChange={(e) => setProspectNiche(e.target.value)}
                className="glass-input p-3 rounded-xl text-sm outline-none font-semibold bg-[#080c14]"
              >
                <option value="hair_salon">Hair Salon</option>
                <option value="barber_shop">Barber Shop</option>
                <option value="dentist">Dentist</option>
                <option value="plumber">Plumber</option>
                <option value="restaurant">Restaurant</option>
                <option value="gym">Gym / Fitness</option>
                <option value="real_estate">Real Estate</option>
              </select>

              <input
                type="text"
                value={prospectCity}
                onChange={(e) => setProspectCity(e.target.value)}
                className="glass-input p-3 rounded-xl text-sm outline-none flex-1"
                placeholder="e.g. Seattle, San Francisco, Chicago"
              />

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Searching Maps...' : 'Find Leads'}</span>
              </button>
            </form>

            {prospectResults.length > 0 && (
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-4">Business</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">City</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prospectResults.map((lead, i) => (
                      <tr key={i} className="hover:bg-white/5 transition">
                        <td className="p-4 font-semibold">{lead.businessName || lead.business_name}</td>
                        <td className="p-4 text-amber-400 font-bold">{lead.rating} ⭐</td>
                        <td className="p-4 text-slate-400">{lead.city}</td>
                        <td className="p-4 text-indigo-400 font-medium">Ready for Review Audit</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Drip Campaigns */}
        {activeTab === 'outreach' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">✉️ Outbound Sales Drips</h2>
                <p className="text-slate-400 text-sm mt-1">Daily 10-company outreach log & AI Sales Closer conversations.</p>
              </div>

              <button
                onClick={handleTriggerOutreach}
                disabled={triggeringCycle}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>{triggeringCycle ? 'Running Cycle...' : 'Run 10-Lead Cycle Now'}</span>
              </button>
            </div>

            {/* Campaign Logs */}
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 font-bold text-sm">Recent Outreach Dispatches</div>
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Target Business</th>
                    <th className="p-4">Channel</th>
                    <th className="p-4">Subject / Hook</th>
                    <th className="p-4">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {campaignLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-white/5 transition">
                      <td className="p-4 font-semibold">{log.businessName}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${log.emailType?.includes('whatsapp') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                          {log.emailType?.includes('whatsapp') ? 'WhatsApp' : 'Email'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 max-w-md truncate">{log.subject}</td>
                      <td className="p-4 text-slate-400 text-xs">{new Date(log.sentAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Client Sites */}
        {activeTab === 'sites' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">🌐 Client Websites ({clients.length})</h2>
              <p className="text-slate-400 text-sm mt-1">Manage active subscriptions and generated site previews.</p>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Business</th>
                    <th className="p-4">Niche</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">MRR</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clients.map((cli, i) => (
                    <tr key={i} className="hover:bg-white/5 transition">
                      <td className="p-4 font-semibold">{cli.businessName}</td>
                      <td className="p-4 text-slate-400 capitalize">{cli.niche?.replace('_', ' ')}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cli.stripe_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {cli.stripe_status || 'Trial'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">${cli.stripe_status === 'active' ? '49/mo' : '$0'}</td>
                      <td className="p-4">
                        <a href={`/client/${cli.id}/`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs font-semibold">
                          View Site ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
