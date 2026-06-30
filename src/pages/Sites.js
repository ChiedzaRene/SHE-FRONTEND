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
import { sitesApi } from '../api/endpoints';

export default function Sites() {
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
  }, []);

  // --- HANDLERS ---
  
  // Prepare form for editing
  const handleEditClick = (site) => {
    setEditingId(site.id);
    setFormData({
      name: site.name,
      address: site.address,
      contact_number: site.contact_number || '',
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
    setFormData({ name: '', address: '', contact_number: '', latitude: '', longitude: '' });
  };

  // Submit Logic (Handles both Create and Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };

      if (editingId) {
        // UPDATE EXISTING SITE
        await sitesApi.update(editingId, payload);
      } else {
        // CREATE NEW SITE
        await sitesApi.create(payload);
      }
      
      await fetchSites(); // Refresh the list from server
      closeForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save site. Ensure coordinates are valid numbers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Logic
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await sitesApi.delete(id);
        // Optimistic update: remove from UI immediately
        setSites(prev => prev.filter(site => site.id !== id));
      } catch (err) {
        alert('Could not delete site. It may have linked incidents or audits.');
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sites Management</h1>
          <p className="page-subtitle">Manage Glow Petroleum service stations and depots</p>
        </div>
        <button 
          className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`} 
          onClick={showForm ? closeForm : () => setShowForm(true)}
        >
          {showForm ? <><X size={18} /> Close</> : <><Plus size={18} /> Add New Site</>}
        </button>
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
                <label className="form-label">Site Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Msasa Depot"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={formData.contact_number} 
                  onChange={e => setFormData({...formData, contact_number: e.target.value})} 
                  placeholder="+263..." 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Physical Address</label>
              <input 
                type="text" 
                className="form-control" 
                required 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                placeholder="Street address and city" 
              />
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input 
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
                <label className="form-label">Longitude</label>
                <input 
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
                  <th className="text-center">Compliance</th>
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
                    <td className="text-center">
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-sm btn-outline btn-icon" 
                          onClick={() => handleEditClick(site)}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-sm btn-outline btn-icon text-danger" 
                          onClick={() => handleDelete(site.id, site.name)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
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