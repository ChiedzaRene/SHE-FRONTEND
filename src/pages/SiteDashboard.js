import React, { useState, useEffect, useCallback, useMemo } from 'react';
<<<<<<< HEAD
import { 
  Clock, Activity, Plus,
  TrendingDown, TrendingUp, AlertTriangle, FileText, Phone, ClipboardX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LogIncidentModal from '../components/LogIncidentModal';
import { incidentsApi, sitesApi } from '../api/endpoints';
=======
import { bucketWidth } from "../utils/breakpoint";
import { fmtRate } from "../utils/rates";
import { 
  Clock, ShieldCheck, Activity, Plus,
  TrendingDown, TrendingUp, AlertCircle, FileText, Phone,
  Users, CheckCircle2, Timer, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogIncidentModal from '../components/LogIncidentModal';
import { incidentsApi, actionsApi, sitesApi, siteHoursApi, dashboardApi, safetyTalksApi } from '../api/endpoints';
import LoadingScreen from "../components/LoadingScreen";
import RateCoverageNotice from "../components/RateCoverageNotice";
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9

export default function SiteDashboard() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
<<<<<<< HEAD
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
=======
  const [metrics, setMetrics] = useState({ total_incidents: 0, ltifr: null });
  const [openActions, setOpenActions] = useState(0);
  const [latestHours, setLatestHours] = useState(null); // newest month the manager entered: { period, hours_worked, workers }
  const [actionStats, setActionStats] = useState({}); // corrective actions over the last 12 months
  const [talks, setTalks] = useState(null); // this week's toolbox talk and the completion rate so far
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(() => bucketWidth(window.innerWidth));
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  const [siteName, setSiteName] = useState('Loading...');

  // Get user info from token
  const token = localStorage.getItem('token');
  const tokenPayload = token ? JSON.parse(atob(token.split('.')[1])) : {};

  useEffect(() => {
<<<<<<< HEAD
    const handleResize = () => setWindowWidth(window.innerWidth);
=======
    const handleResize = () => setWindowWidth(bucketWidth(window.innerWidth));
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
<<<<<<< HEAD
      const siteId = payload.site_id || user?.site_id;

      const [siteRes, incRes] = await Promise.all([
        sitesApi.getOne(siteId).catch(() => ({ data: null })),
        incidentsApi.getBySite(siteId).catch(() => ({ data: [] }))
      ]);

      if (siteRes.data) {
        setSiteData(siteRes.data);
        setSiteName(siteRes.data.name);
      }

      setIncidents(incRes.data || []);
=======
      const siteId = payload.site_id;

      const siteRes = await sitesApi.getOne(siteId).catch(() => ({ data: null }));
      if (siteRes.data) setSiteName(siteRes.data.name);

      const [incRes, metRes, actRes, hoursRes, sumRes, talkRes] = await Promise.all([
        incidentsApi.getBySite(siteId).catch(() => ({ data: [] })),
        incidentsApi.getMetrics(siteId).catch(() => ({ data: { total_incidents: 0, ltifr: null } })),
        actionsApi.getAll().catch(() => ({ data: [] })),
        siteHoursApi.list({ site_id: siteId }).catch(() => ({ data: [] })),
        dashboardApi.summary({ period: '12m' }).catch(() => ({ data: null })),
        safetyTalksApi.current().catch(() => ({ data: null })),
      ]);

      setTalks(talkRes.data);

      setLatestHours((hoursRes.data || [])[0] || null);
      setActionStats(sumRes.data?.current?.totals || {});

      setIncidents(incRes.data || []);
      setMetrics(metRes.data || { total_incidents: 0, ltifr: null });
      setOpenActions((actRes.data || actRes).filter(a => String(a.site_id) === String(siteId) && !a.resolved).length);
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Dynamic TRIR Calculation ---
  const siteTrir = useMemo(() => {
    const hours = Number(siteData?.man_hours) || 200000;
    if (hours <= 0) return 0;
    return (incidents.length * 200000) / hours;
  }, [incidents, siteData]);

  // --- Dynamic Trend Calculation ---
=======
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- NEW: Dynamic Trend Calculation ---
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
      percent = 100;
=======
      percent = 100; // From 0 to something is a 100% increase
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    }

    return {
      value: percent.toFixed(1),
<<<<<<< HEAD
      isImprovement: percent <= 0,
=======
      isImprovement: percent <= 0, // Fewer incidents = Improvement
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      currentCount: currentIncidents
    };
  }, [incidents]);

<<<<<<< HEAD
  // --- Robust Safety Streak Calculation ---
  const daysSince = useMemo(() => {
    if (!incidents || incidents.length === 0) {
      return { text: 'N/A', subtext: 'No recorded incidents' };
    }

    const validTimestamps = incidents
      .map(i => new Date(i.date_time || i.date).getTime())
      .filter(ts => !isNaN(ts));

    if (validTimestamps.length === 0) {
      return { text: 'N/A', subtext: 'No recorded incidents' };
    }

    const latestTimestamp = Math.max(...validTimestamps);
    const now = new Date().getTime();

    const diffInDays = Math.floor((now - latestTimestamp) / (1000 * 60 * 60 * 24));
    const days = Math.max(0, diffInDays);

    return {
      text: `${days} ${days === 1 ? 'Day' : 'Days'}`,
      subtext: 'Since last incident'
    };
  }, [incidents]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
=======
  const daysSince = () => {
    if (incidents.length === 0) return "0";
    const latest = Math.max(...incidents.map(i => new Date(i.date_time || i.date).getTime()));
    const days = Math.floor((new Date() - latest) / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  };

  if (loading) return <LoadingScreen message="Loading dashboard..." />;
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: isMobile ? '20px' : '32px 40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* --- HEADER --- */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: isMobile ? '32px' : '48px', position: 'relative' }}>
<<<<<<< HEAD
=======
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
             <ShieldCheck size={14} /> <span>Site Command Center</span>
          </div>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
          <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.8rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            {siteName}
          </h1>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ position: isTablet ? 'static' : 'absolute', right: 0, top: '50%', transform: isTablet ? 'none' : 'translateY(-50%)', marginTop: isTablet ? '24px' : '0', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>
            <Plus size={20} /> Log Incident
          </button>
        </div>

<<<<<<< HEAD
        {/* --- KPI GRID --- */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          {/* SAFETY STREAK */}
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Safety Streak</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Clock size={28} /></div>
              <div>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{daysSince.text}</span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{daysSince.subtext}</div>
=======
        <RateCoverageNotice metrics={metrics} />

        {talks?.open && !talks.talk && (
          <div className="rate-notice" role="status">
            <MessageSquare size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>This week's toolbox talk hasn't been submitted yet.</strong> Submissions close at the end of Tuesday;
              after that the week counts as missed. <Link to="/trainings">Submit the talk</Link>
            </div>
          </div>
        )}

        {/* --- KPI GRID --- */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Safety Streak</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><Clock size={28} /></div>
              <div>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{daysSince()} Days</span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Since last incident</div>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* SITE TRIR */}
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Site TRIR</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Activity size={28} /></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>
                {siteTrir.toFixed(2)}
=======
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Site LTIFR</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}><Activity size={28} /></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>
                {fmtRate(metrics.ltifr)}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
              </span>
            </div>
          </div>

<<<<<<< HEAD
          {/* TOTAL INCIDENTS CARD */}
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: isTablet && !isMobile ? 'span 2' : 'span 1' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Total Incidents</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><AlertTriangle size={28} /></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{incidents.length}</span>
=======
          <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: isTablet && !isMobile ? 'span 2' : 'span 1' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' }}>Open Actions</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}><AlertCircle size={28} /></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{openActions} Items</span>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
            </div>
          </div>
        </div>

<<<<<<< HEAD
=======
        {/* --- PEOPLE, HOURS AND CORRECTIVE ACTIONS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <SmallStat label="Workers" Icon={Users} color="#0f766e"
            value={latestHours?.workers ?? '—'}
            note={latestHours?.workers != null ? `As entered for ${monthName(latestHours.period)}` : 'Not entered yet'} />
          <SmallStat label="Hours worked" Icon={Clock} color="#0891b2"
            value={latestHours ? Number(latestHours.hours_worked).toLocaleString() : '—'}
            note={latestHours ? monthName(latestHours.period) : 'No hours entered yet'}
            action={<Link to="/site-hours" style={{ color: '#003087', fontWeight: 700 }}>Enter hours and workers</Link>} />
          <SmallStat label="Actions completed (12 mo)" Icon={CheckCircle2} color="#16a34a"
            value={actionStats.actions_completion_pct == null ? '—' : `${Math.round(actionStats.actions_completion_pct)}%`}
            note={`${actionStats.actions_completed ?? 0} of ${actionStats.actions_total ?? 0} raised`} />
          <SmallStat label="Toolbox talks" Icon={MessageSquare} color="#1d4ed8"
            value={talks?.cumulative?.rate == null ? '—' : `${Math.round(talks.cumulative.rate)}%`}
            note={talks?.cumulative ? `${talks.cumulative.done} of ${talks.cumulative.due} weekly talks submitted` : 'Weekly talks submitted'}
            action={<Link to="/trainings" style={{ color: '#003087', fontWeight: 700 }}>
              {talks?.open ? (talks.talk ? "This week's talk is in" : "Submit this week's talk") : 'See your talks'}
            </Link>} />
          <SmallStat label="Avg days to close (12 mo)" Icon={Timer} color="#ea580c"
            value={actionStats.avg_days_to_close == null ? '—' : `${Number(actionStats.avg_days_to_close).toFixed(1)}`}
            note="From raising an action to resolving it" />
        </div>

>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
                  {incidents.length > 0 ? (
                    incidents.slice(0, 5).map(inc => (
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: '#f1f5f9', marginBottom: '12px' }}>
                          <ClipboardX size={28} color="#94a3b8" />
                        </div>
                        <div style={{ fontWeight: '700', color: '#334155' }}>No recent incidents recorded</div>
                        <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#94a3b8' }}>
                          Your site has a clean safety record!
                        </div>
                      </td>
                    </tr>
                  )}
=======
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
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
<<<<<<< HEAD
=======
            {/* DYNAMIC SITE PERFORMANCE CARD */}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
}
=======
}

const monthName = (period) => {
  const [y, m] = String(period).split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const SmallStat = ({ label, value, note, Icon, color, action }) => (
  <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>{label}</div>
      <Icon size={20} color={color} aria-hidden="true" />
    </div>
    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1e293b' }}>{value}</div>
    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>{note}</div>
    {action ? <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>{action}</div> : null}
  </div>
);
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
