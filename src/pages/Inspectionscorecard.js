import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { sitesApi, inspectionsApi } from '../api/endpoints';
import InspectionModal from '../components/InspectionModal';
import { 
  ClipboardCheck, 
  Plus, 
  Filter, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Paperclip,
  RotateCcw
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function InspectionScorecard() {
  const { user } = useAuth();
  const isSiteManager = user?.role === 'site_manager';

  const [sites, setSites] = useState([]);
  const [inspectionsList, setInspectionsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});

  // Filter States (Default site filter locked to user's site if they are a site manager)
  const [siteFilter, setSiteFilter] = useState(isSiteManager ? user?.site_id || '' : '');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial data (Passing site scope for site managers if supported by backend)
  const loadInitialData = useCallback(async () => {
    try {
      const params = isSiteManager && user?.site_id ? { site_id: user.site_id } : {};
      
      const [sitesRes, inspectionsRes] = await Promise.all([
        sitesApi.getAll(),
        inspectionsApi.getAll({ params })
      ]);
      
      setSites(sitesRes.data || []);
      
      let fetchedInspections = inspectionsRes.data || [];
      
      // Client-side safety filter for site managers to guarantee scoping
      if (isSiteManager && user?.site_id) {
        fetchedInspections = fetchedInspections.filter(
          item => String(item.site_id) === String(user.site_id)
        );
      }

      setInspectionsList(fetchedInspections);
    } catch (err) {
      console.error('Error fetching inspection data:', err);
    }
  }, [isSiteManager, user]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handler passed into modal for submitting new inspection payload (Blocked for site managers)
  const handleModalSubmit = async (formDataPayload) => {
    if (isSiteManager) {
      console.warn('Unauthorized action: Site managers have read-only access.');
      return;
    }
    await inspectionsApi.create(formDataPayload);
    await loadInitialData();
  };

  // Helper score calculation
  const calculateOverall = (chkScore, sheScore) => {
    const a = parseFloat(chkScore);
    const b = parseFloat(sheScore);
    const valid = [a, b].filter(n => !isNaN(n));
    if (!valid.length) return null;
    return Math.round(valid.reduce((s, n) => s + n, 0) / valid.length);
  };

  // Status color generator based on compliance percentage
  const getColor = (pct) => {
    if (pct === null || pct === undefined) return '#94a3b8';
    if (pct >= 90) return '#059669';
    if (pct >= 75) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#dc2626';
  };

  const toggleComment = (id) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper function to resolve document full URL
  const getAttachmentUrl = (filePath) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    return `${API_BASE_URL}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  };

  // Real-time Filtering Logic
  const filteredInspections = useMemo(() => {
    return inspectionsList.filter(item => {
      // If site manager, restrict visibility strictly to their site_id
      if (isSiteManager && user?.site_id) {
        if (String(item.site_id) !== String(user.site_id)) return false;
      }

      const matchesSite = siteFilter ? String(item.site_id) === String(siteFilter) : true;
      const matchesDate = dateFilter ? item.inspection_date === dateFilter : true;
      const matchesSearch = searchQuery 
        ? item.inspector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.comments?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return matchesSite && matchesDate && matchesSearch;
    });
  }, [inspectionsList, siteFilter, dateFilter, searchQuery, isSiteManager, user]);

  return (
    <div style={{ padding: '24px', maxWidth: '850px', margin: '0 auto' }}>

      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            <ClipboardCheck size={14} /> Glow Petroleum SHE
          </div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#0f172a' }}>
            {isSiteManager ? 'Station Inspection Scorecard' : 'Inspection Scorecard'}
          </h1>
          <p className="page-subtitle">
            {isSiteManager ? 'Viewing compliance records for your assigned service station ' : 'Inspection and Compliance Tracking'}
          </p>
        </div>

        {/* Hide New Inspection button entirely for Site Managers */}
        {!isSiteManager && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px' }}
          >
            <Plus size={16} /> New Inspection
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', fontWeight: '700', marginRight: '4px' }}>
          <Filter size={15} /> Filters:
        </div>

        {/* Site Filter (Disabled and locked down for site managers) */}
        <select 
          className="form-control" 
          style={{ flex: '1', minWidth: '160px' }} 
          value={siteFilter} 
          onChange={e => setSiteFilter(e.target.value)}
          disabled={isSiteManager}
        >
          {!isSiteManager && <option value="">All Sites</option>}
          {sites
            .filter(s => !isSiteManager || String(s.id) === String(user?.site_id))
            .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Date Filter */}
        <input 
          type="date" 
          className="form-control" 
          style={{ flex: '1', minWidth: '150px' }} 
          value={dateFilter} 
          onChange={e => setDateFilter(e.target.value)} 
        />

        {/* Search Filter (Inspector / Notes) */}
        <div style={{ flex: '1.2', minWidth: '180px' }}>
          <input 
            type="text" 
            placeholder="Search inspector or notes..." 
            className="form-control" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>

        {/* Clear Filters */}
        {((!isSiteManager && siteFilter) || dateFilter || searchQuery) && (
          <button 
            type="button" 
            onClick={() => { if (!isSiteManager) setSiteFilter(''); setDateFilter(''); setSearchQuery(''); }}
            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* INSPECTION SCORECARD CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredInspections.length === 0 ? (
          <div style={{ padding: '32px', background: 'white', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
            No matching inspection records found for this station.
          </div>
        ) : (
          filteredInspections.map((item) => {
            const itemSiteName = sites.find(s => String(s.id) === String(item.site_id))?.name || item.site_name || 'Service Station';
            const itemOverall = calculateOverall(item.checklist_score, item.she_file_score);
            const color = getColor(itemOverall);
            const formattedDate = new Date(item.inspection_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const docPath = item.file_url || item.attachment;

            return (
              <div key={item.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
                
                {/* CARD HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
                      {itemSiteName} — <span style={{ fontWeight: '500', color: '#64748b' }}>{formattedDate}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                      Inspector: <strong>{item.inspector_name}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Overall Score:</span>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.88rem', fontWeight: '800', background: `${color}15`, color }}>
                      {itemOverall !== null ? `${itemOverall}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* INDIVIDUAL SCORES */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div>Checklist Score: <strong style={{ color: getColor(item.checklist_score) }}>{item.checklist_score}%</strong></div>
                  <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>SHE File Score: <strong style={{ color: getColor(item.she_file_score) }}>{item.she_file_score}%</strong></div>
                </div>

                {/* ATTACHED DOCUMENT LINK */}
                {docPath && (
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={getAttachmentUrl(docPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: '#2563eb',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <Paperclip size={13} />
                      View Attached Document {item.file_name ? `(${item.file_name})` : ''}
                    </a>
                  </div>
                )}

                {/* EXPANDABLE COMMENTS */}
                {item.comments && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => toggleComment(item.id)}
                      style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <MessageSquare size={12} />
                      {expandedComments[item.id] ? 'Hide Comments' : 'View Comments'}
                      {expandedComments[item.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {expandedComments[item.id] && (
                      <div style={{ marginTop: '8px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.82rem', color: '#334155', fontStyle: 'italic' }}>
                        "{item.comments}"
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* CREATION MODAL (Only renderable/accessible if not a site manager) */}
      {!isSiteManager && (
        <InspectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          onSubmitted={loadInitialData}
          sites={sites}
          currentUser={user}
          isSiteManager={isSiteManager}
        />
      )}

    </div>
  );
}