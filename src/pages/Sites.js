import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MapPin, 
  Trash2, 
  Edit2, 
  Phone, 
  Loader2, 
  AlertTriangle, 
  X,
  Save
} from 'lucide-react';
<<<<<<< HEAD
import { ClipboardCheck } from 'lucide-react';
import { sitesApi } from '../api/endpoints';

export default function Sites() {
=======
import { sitesApi } from '../api/endpoints';
import { useFeedback } from '../components/Feedback';
import { apiError } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import RegionsPanel, { regionChoices } from '../components/RegionsPanel';
import { isReadOnly } from '../utils/roles';

export default function Sites() {
  const { notify, confirm } = useFeedback();
  const { user } = useAuth();
  const readOnly = isReadOnly(user?.role);
  // sites are created, edited and moved between regions by admins
  const canAllocate = ['admin', 'super_admin'].includes(user?.role);
  const [regions, setRegions] = useState(null);
  const loadRegions = () => sitesApi.regions().then((r) => setRegions(r.data)).catch(() => setRegions(null));
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  // --- STATE MANAGEMENT ---
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // Tracks if we are editing or creating
  
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    contact_number: '', 
<<<<<<< HEAD
=======
    region: '',
    code: '',
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    latitude: '', 
    longitude: '' 
  });

  // --- API CALLS ---
  const fetchSites = async () => {
    try {
      const res = await sitesApi.getAll();
      setSites(res.data || []);
    } catch (err) {
      console.error("Error fetching sites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
<<<<<<< HEAD
  }, []);

=======
    loadRegions();
  }, []);

  const allocate = async (site, region) => {
    try {
      const res = await sitesApi.setRegion(site.id, region || null);
      setSites((all) => all.map((s) => (s.id === site.id ? res.data : s)));
      notify(region ? `${site.name} is now in ${region}` : `${site.name} is no longer in a region`, 'success');
      loadRegions();
    } catch (err) {
      notify(apiError(err, 'The region could not be changed.'), 'error');
    }
  };

>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  // --- HANDLERS ---
  
  // Prepare form for editing
  const handleEditClick = (site) => {
    setEditingId(site.id);
    setFormData({
      name: site.name,
      address: site.address,
      contact_number: site.contact_number || '',
<<<<<<< HEAD
=======
      region: site.region || '',
      code: site.code || '',
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      latitude: site.latitude,
      longitude: site.longitude
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset form and close
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
<<<<<<< HEAD
    setFormData({ name: '', address: '', contact_number: '', latitude: '', longitude: '' });
=======
    setFormData({ name: '', address: '', contact_number: '', region: '', code: '', latitude: '', longitude: '' });
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  };

  // Submit Logic (Handles both Create and Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
<<<<<<< HEAD
        longitude: parseFloat(formData.longitude)
=======
        longitude: parseFloat(formData.longitude),
        // optional: an empty box means "no number"
        contact_number: (formData.contact_number || '').trim() || null,
        region: (formData.region || '').trim() || null,
        code: (formData.code || '').trim().toUpperCase() || null,
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      };

      if (editingId) {
        // UPDATE EXISTING SITE
        await sitesApi.update(editingId, payload);
      } else {
        // CREATE NEW SITE
        await sitesApi.create(payload);
      }
      
      await fetchSites(); // Refresh the list from server
<<<<<<< HEAD
      closeForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save site. Ensure coordinates are valid numbers.');
=======
      loadRegions();
      closeForm();
    } catch (err) {
      console.error(err);
      notify(apiError(err, 'Failed to save site. Ensure coordinates are valid numbers.'), 'error');
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Logic
  const handleDelete = async (id, name) => {
<<<<<<< HEAD
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
=======
    if (await confirm({ title: 'Delete site?', message: `Delete ${name}? This cannot be undone.`, confirmLabel: 'Delete site', danger: true })) {
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      try {
        await sitesApi.delete(id);
        // Optimistic update: remove from UI immediately
        setSites(prev => prev.filter(site => site.id !== id));
      } catch (err) {
<<<<<<< HEAD
        alert('Could not delete site. It may have linked incidents or audits.');
=======
        // The server says exactly what is still linked (e.g. "Cannot delete a site that still has 3 incidents")
        notify(apiError(err, 'Could not delete site.'), 'error');
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
<<<<<<< HEAD
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            <ClipboardCheck size={14} /> Glow Petroleum SHE
          </div>
          <h1 className="page-title">Sites Management</h1>
          <p className="page-subtitle">Manage Glow Petroleum service stations and depots</p>
        </div>
        <button 
          className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`} 
          onClick={showForm ? closeForm : () => setShowForm(true)}
        >
          {showForm ? <><X size={18} /> Close</> : <><Plus size={18} /> Add New Site</>}
        </button>
=======
          <h1 className="page-title">Sites Management</h1>
          <p className="page-subtitle">Manage Glow Petroleum service stations and depots</p>
        </div>
        {!readOnly && (
          <button
            className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}
            onClick={showForm ? closeForm : () => setShowForm(true)}
          >
            {showForm ? <><X size={18} /> Close</> : <><Plus size={18} /> Add New Site</>}
          </button>
        )}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      </div>

      {/* --- DYNAMIC FORM (CREATE/EDIT) --- */}
      {showForm && (
        <div className="card shadow-sm" style={{ marginBottom: '24px', border: editingId ? '1px solid #f59e0b' : '1px solid #007ACC33' }}>
          <div className="card-header" style={{ background: editingId ? '#fffbeb' : '#f8fafc' }}>
            <div className="card-title">
              {editingId ? `Edit Site: ${formData.name}` : 'Register New Site'}
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div className="two-col">
              <div className="form-group">
<<<<<<< HEAD
                <label className="form-label">Site Name</label>
                <input 
=======
                <label className="form-label" htmlFor="site-site-name">Site Name</label>
                <input id="site-site-name" 
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                  type="text" 
                  className="form-control" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Msasa Depot"
                />
              </div>
              <div className="form-group">
<<<<<<< HEAD
                <label className="form-label">Contact Number</label>
                <input 
=======
                <label className="form-label" htmlFor="site-contact-number">Contact Number</label>
                <input id="site-contact-number" 
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                  type="tel" 
                  className="form-control" 
                  value={formData.contact_number} 
                  onChange={e => setFormData({...formData, contact_number: e.target.value})} 
                  placeholder="+263..." 
                />
              </div>
            </div>
            
            <div className="form-group">
<<<<<<< HEAD
              <label className="form-label">Physical Address</label>
              <input 
=======
              <label className="form-label" htmlFor="site-physical-address">Physical Address</label>
              <input id="site-physical-address" 
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                type="text" 
                className="form-control" 
                required 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                placeholder="Street address and city" 
              />
            </div>

<<<<<<< HEAD
            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input 
=======
            <div className="form-group">
              <label className="form-label" htmlFor="site-code">Site code</label>
              <input id="site-code"
                type="text"
                className="form-control"
                maxLength={12}
                pattern="[A-Za-z0-9-]*"
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="Short code used in NC numbers, e.g. CBD (as in 15/CBD/01)"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="site-region">Region</label>
              <select id="site-region" className="form-control" value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}>
                <option value="">Not allocated to a region</option>
                {regionChoices(regions, formData.region).map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label" htmlFor="site-latitude">Latitude</label>
                <input id="site-latitude" 
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                  type="number" 
                  step="any" 
                  className="form-control" 
                  required 
                  value={formData.latitude} 
                  onChange={e => setFormData({...formData, latitude: e.target.value})} 
                  placeholder="-17.8..." 
                />
              </div>
              <div className="form-group">
<<<<<<< HEAD
                <label className="form-label">Longitude</label>
                <input 
=======
                <label className="form-label" htmlFor="site-longitude">Longitude</label>
                <input id="site-longitude" 
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                  type="number" 
                  step="any" 
                  className="form-control" 
                  required 
                  value={formData.longitude} 
                  onChange={e => setFormData({...formData, longitude: e.target.value})} 
                  placeholder="31.0..." 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
              <button type="button" className="btn btn-outline" onClick={closeForm}>Cancel</button>
              <button disabled={isSubmitting} type="submit" className="btn btn-primary" style={{ background: '#007ACC' }}>
                {isSubmitting ? <Loader2 className="spinner" size={18} /> : <><Save size={18} /> {editingId ? 'Update Site' : 'Save Site'}</>}
              </button>
            </div>
          </form>
        </div>
      )}

<<<<<<< HEAD
=======
      <RegionsPanel regions={regions} />

>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      {/* --- SITES LIST --- */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 className="spinner" size={40} style={{ color: '#007ACC' }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Site Details</th>
                  <th>Location & Contact</th>
<<<<<<< HEAD
                  <th className="text-center">Compliance</th>
=======
                  <th>Region</th>
                  <th className="text-center">Status</th>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(site => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{site.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GLW-{site.id.toString().padStart(3, '0')}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <MapPin size={14} style={{ color: '#007ACC' }} /> {site.address}
                      </div>
                      {site.contact_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                          <Phone size={14} /> {site.contact_number}
                        </div>
                      )}
                    </td>
<<<<<<< HEAD
=======
                    <td>
                      {canAllocate ? (
                        <select className="form-control site-region-select" aria-label={`Region for ${site.name}`}
                          value={site.region || ''} onChange={(e) => allocate(site, e.target.value)}>
                          <option value="">Not allocated</option>
                          {regionChoices(regions, site.region).map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                        </select>
                      ) : site.region ? site.region : <span className="badge badge-amber">Not allocated</span>}
                    </td>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                    <td className="text-center">
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td>
<<<<<<< HEAD
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
=======
                      {!readOnly && <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                        <button 
                          className="btn btn-sm btn-outline btn-icon" 
                          onClick={() => handleEditClick(site)}
                          title="Edit"
<<<<<<< HEAD
=======
                          aria-label={`Edit ${site.name}`}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-sm btn-outline btn-icon text-danger" 
                          onClick={() => handleDelete(site.id, site.name)}
                          title="Delete"
<<<<<<< HEAD
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
=======
                          aria-label={`Delete ${site.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr>
<<<<<<< HEAD
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
=======
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                      <AlertTriangle size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
                      <p style={{ color: '#64748b' }}>No sites found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}