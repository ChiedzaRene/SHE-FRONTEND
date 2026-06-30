import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, ShieldCheck, Activity, Plus,
  TrendingDown, TrendingUp, AlertCircle, FileText, Phone 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LogIncidentModal from '../components/LogIncidentModal';
import { incidentsApi, actionsApi, sitesApi } from '../api/endpoints';

export default function SiteDashboard() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState({ total_incidents: 0, trir: 0.0 });
  const [openActions, setOpenActions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [siteName, setSiteName] = useState('Loading...');

  // Get user info from token
  const token = localStorage.getItem('token');
  const tokenPayload = token ? JSON.parse(atob(token.split('.')[1])) : {};

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const siteId = payload.site_id;

      const siteRes = await sitesApi.getOne(siteId).catch(() => ({ data: null }));
      if (siteRes.data) setSiteName(siteRes.data.name);

      const [incRes, metRes, actRes] = await Promise.all([
        incidentsApi.getBySite(siteId).catch(() => ({ data: [] })),
        incidentsApi.getMetrics(siteId).catch(() => ({ data: { total_incidents: 0, trir: 0 } })),
        actionsApi.getAll().catch(() => ({ data: [] }))
      ]);

      setIncidents(incRes.data || []);
      setMetrics(metRes.data || { total_incidents: 0, trir: 0 });
      setOpenActions((actRes.data || actRes).filter(a => String(a.site_id) === String(siteId) && !a.resolved).length);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- NEW: Dynamic Trend Calculation ---
  const performanceTrend = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentIncidents = incidents.filter(i => {
      const d = new Date(i.date_time || i.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const previousIncidents = incidents.filter(i => {
      const d = new Date(i.date_time || i.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    let percent = 0;
    if (previousIncidents > 0) {
      percent = ((currentIncidents - previousIncidents) / previousIncidents) * 100;
    } else if (currentIncidents > 0) {
      percent = 100; // From 0 to something is a 100% increase
    }

    return {
      value: percent.toFixed(1),
      isImprovement: percent <= 0, // Fewer incidents = Improvement
      currentCount: currentIncidents
    };
  }, [incidents]);

  const daysSince = () => {
    if (incidents.length === 0) return "0";
    const latest = Math.max(...incidents.map(i => new Date(i.date_time || i.date).getTime()));
    const days = Math.floor((new Date() - latest) / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: isMobile ? '20px' : '32px 40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* --- HEADER --- */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: isMobile ? '32px' : '48px', position: 'relative' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
             <ShieldCheck size={14} /> <span>Site Dashboard</span>
          </div>
          <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.8rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            {siteName}
          </h1>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ position: isTablet ? 'static' : 'absolute', right: 0, top: '50%', transform: isTablet ? 'none' : 'translateY(-50%)', marginTop: isTablet ? '24px' : '0', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>
            <Plus size={20} /> Log Incident
          </button>
        </div>

        {/* --- KPI GRID --- */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Safety Streak</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><Clock size={28} /></div>
              <div>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{daysSince()} Days</span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Since last incident</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Site TRIR</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}><Activity size={28} /></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>
                {Number(metrics.trir).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: isTablet && !isMobile ? 'span 2' : 'span 1' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Open Actions</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}><AlertCircle size={28} /></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{openActions} Items</span>
            </div>
          </div>
        </div>

        {/* --- DATA SECTIONS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 340px', gap: '32px' }}>
          <div className="card" style={{ padding: '0', border: 'none', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Recent Incident Log</h3>
              <a href="/incidents" style={{ color: '#6366f1', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none' }}>View Full Log</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '16px 24px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Details</th>
                    <th style={{ textAlign: 'left', padding: '16px 24px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Severity</th>
                    <th style={{ textAlign: 'left', padding: '16px 24px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 5).map(inc => (
                    <tr key={inc.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{inc.type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>REF: #{inc.id}</div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span className={`badge badge-${inc.severity?.toLowerCase()}`}>{inc.severity}</span>
                      </td>
                      <td style={{ padding: '20px 24px', color: '#64748b', fontSize: '0.85rem' }}>
                        {new Date(inc.date_time || inc.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* DYNAMIC SITE PERFORMANCE CARD */}
            <div className="card" style={{ padding: '28px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Site Performance (MoM)</h4>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '1.5rem', 
                fontWeight: '800', 
                marginBottom: '12px',
                color: performanceTrend.isImprovement ? '#10b981' : '#ef4444' 
              }}>
                {performanceTrend.isImprovement ? <TrendingDown strokeWidth={3} /> : <TrendingUp strokeWidth={3} />}
                {performanceTrend.value}%
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                {performanceTrend.isImprovement 
                  ? "Safety incidents are trending downwards compared to last month." 
                  : "Attention: Incident frequency has increased this month."}
              </p>
            </div>

            <div className="card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: '800' }}>Resources</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>
                  <FileText size={18} color="#6366f1" /> Safety Protocol PDF
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>
                  <Phone size={18} color="#6366f1" /> SHE Support Line
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LogIncidentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userSite={{ id: user?.site_id || tokenPayload?.site_id, name: siteName }}
        onIncidentLogged={fetchData}
      />
    </div>
  );
}