import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { actionsApi, sitesApi } from '../api/endpoints';
import { X, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const normalizeSites = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  return list
    .map((site, index) => {
      const id = site?.id ?? site?.site_id ?? site?.siteId;
      const name = site?.name ?? site?.site_name ?? site?.siteName ?? site?.location;
      if (id === undefined || id === null) return null;
      return { ...site, id, name: name || `Site ${index + 1}` };
    })
    .filter(Boolean);
};

const AddActionForm = ({ sites: initialSites, onSuccess, onCancel, prefill = null }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isSiteManager = user?.role === 'site_manager';
  const [internalSites, setInternalSites] = useState([]);

  const getTokenSiteId = () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.site_id ? String(payload.site_id) : '';
    } catch { return ''; }
  };

  const getThirtyDaysFromNow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    site_id: '',
    action_taken: '',
    assigned_to: '',
    designation: 'Safety',
    due_date: getThirtyDaysFromNow(),
    priority: 'medium',
    status: 'open'
  });

  // Auto-fill from prefill (from incident) or site manager token
  useEffect(() => {
    if (prefill) {
      setFormData(prev => ({
        ...prev,
        site_id: prefill.site_id ? String(prefill.site_id) : (isSiteManager ? getTokenSiteId() : ''),
        action_taken: prefill.action_taken || '',
        designation: prefill.designation || 'Safety',
      }));
    } else if (isSiteManager) {
      setFormData(prev => ({ ...prev, site_id: getTokenSiteId() }));
    }
  }, [prefill, isSiteManager]);

  useEffect(() => {
    const loadSites = async () => {
      if (initialSites && initialSites.length > 0) {
        setInternalSites(normalizeSites(initialSites));
      } else {
        try {
          const res = await sitesApi.getAll();
          setInternalSites(normalizeSites(res?.data ?? res));
        } catch (err) {
          console.error('Could not load sites', err);
        }
      }
    };

    loadSites();
  }, [initialSites]);

  useEffect(() => {
    if (location.state?.fromAudit) {
      setFormData((prev) => ({
        ...prev,
        site_id: location.state.site_id ? String(location.state.site_id) : '',
        designation: 'Audit',
        action_taken: `Based on Audit (${location.state.criteria || 'General'}): ${location.state.findings || ''}`
      }));
    }

    if (location.state?.fromIncident) {
    setFormData((prev) => ({
      ...prev,
      site_id: location.state.site_id ? String(location.state.site_id) : '',
      designation: 'Safety', // Defaulting to Safety for incidents
      action_taken: `Corrective Action for ${location.state.type || 'Incident'}: ${location.state.description || ''}`
    }));
  }
}, [location.state]);
  

  

 const handleSubmit = async (e) => {
  e.preventDefault();

  // Debug — remove after fixing
  console.log("Form Data:", formData);
  console.log("Sites:", internalSites);

  if (!formData.site_id || !formData.action_taken) {
    alert(`Missing fields: site_id="${formData.site_id}" action_taken="${formData.action_taken}"`);
    return;
  }

  try {
    const payload = {
      site_id: Number(formData.site_id),
      action_taken: formData.action_taken,
      description: formData.action_taken,
      designation: formData.designation,
      assigned_to: formData.assigned_to,
      priority: formData.priority,
      status: 'open',
      due_date: new Date(formData.due_date).toISOString()
    };

    console.log("Sending Payload:", payload);
    await actionsApi.create(payload);
    onSuccess();
  } catch (err) {
    const serverError = err.response?.data;
    console.error('Submission error:', serverError);
    alert(`Submission Failed: ${JSON.stringify(serverError?.detail || 'Check console for details')}`);
  }
};

  return (
    <div className="card mb-8 animate-slide-down" style={{ borderLeft: '5px solid #007ACC', marginBottom: '30px' }}>
      <div className="card-header" style={{ background: '#f8fafc', padding: '15px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title" style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} className="text-primary" /> New Corrective Action Plan
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Location / Site</label>
            {isSiteManager ? (
              <input
                type="text"
                className="form-control"
                value={internalSites.find(s => String(s.id) === String(formData.site_id))?.name || 'Your Site'}
                disabled
                style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
              />
            ) : (
              <select className="form-control" required value={formData.site_id} onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}>
                <option value="">-- {internalSites.length ? 'Select Site' : 'No Sites Available'} --</option>
                {internalSites.map((site) => (
                  <option key={site.id} value={String(site.id)}>{site.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Designation</label>
            <select className="form-control" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })}>
              <option value="Safety">Safety</option>
              <option value="Health">Health</option>
              <option value="Environment">Environment</option>
              <option value="Legal">Legal</option>
              <option value="Audit">Audit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Personnel</label>
            <input type="text" className="form-control" required placeholder="Name" value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} />
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Due Date <Lock size={12} /></label>
            <input type="date" className="form-control" readOnly value={formData.due_date} style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">Action Plan / Description</label>
          <textarea className="form-control" rows="4" required value={formData.action_taken} onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!formData.site_id}>Assign Action</button>
        </div>
      </form>
    </div>
  );
};

export default AddActionForm;