import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Lock } from 'lucide-react';

export default function InspectionModal({
  isOpen,
  onClose = () => {},
  onSubmit,
  onSubmitted,
  sites = [],
  currentUser = {},
}) {
  const [formData, setFormData] = useState({
    site_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    checklist_score: 0,
    she_file_score: 0,
    comments: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read locked inspector name directly from currentUser context
  const lockedInspectorName =
    currentUser?.full_name || currentUser?.username || currentUser?.email || 'PM User';

  useEffect(() => {
    if (isOpen) {
      const defaultSiteId = sites && sites.length > 0 ? sites[0].id : '';
      setFormData({
        site_id: defaultSiteId,
        inspection_date: new Date().toISOString().split('T')[0],
        checklist_score: 0,
        she_file_score: 0,
        comments: '',
      });
      setFile(null);
      setError('');
    }
  }, [isOpen, sites]);

  if (!isOpen) return null;

  const handleScoreChange = (field, rawValue) => {
    if (rawValue === '') {
      setFormData((prev) => ({ ...prev, [field]: 0 }));
      return;
    }
    let value = parseFloat(rawValue);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > 100) value = 100;

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const submitHandler = onSubmit || onSubmitted;

    if (typeof submitHandler !== 'function') {
      console.error('InspectionModal Error: Neither "onSubmit" nor "onSubmitted" was provided.');
      setError('System configuration error: Submit action missing.');
      return;
    }

    if (!formData.site_id) {
      setError('Please select a valid site location.');
      return;
    }

    let cleanDate = formData.inspection_date;
    if (cleanDate && cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('site_id', parseInt(formData.site_id, 10));
      // STRICTLY ENFORCE LOCKED ACCOUNT NAME
      payload.append('inspector_name', lockedInspectorName);
      payload.append('inspection_date', cleanDate);
      payload.append('checklist_score', parseFloat(formData.checklist_score) || 0);
      payload.append('she_file_score', parseFloat(formData.she_file_score) || 0);
      payload.append('comments', formData.comments || '');

      if (file) {
        payload.append('file', file);
      }

      await submitHandler(payload);
      onClose();
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err?.response?.data?.detail || 'Failed to submit inspection record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            New Site Inspection
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Site Location *
              </label>
              <select
                required
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
              >
                <option value="">Select a Site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Inspection Date *
              </label>
              <input
                type="date"
                required
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
              />
            </div>
          </div>

          {/* LOCKED INSPECTOR FIELD */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Inspector Name (Account)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                readOnly
                value={lockedInspectorName}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'not-allowed',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
              <Lock
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
            </div>
          </div>

          {/* SCORES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Checklist Score (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={formData.checklist_score}
                onChange={(e) => handleScoreChange('checklist_score', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                SHE File Score (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={formData.she_file_score}
                onChange={(e) => handleScoreChange('she_file_score', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Comments / Observations
            </label>
            <textarea
              rows="3"
              placeholder="Enter details regarding score deductions or findings..."
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Upload Report File (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              style={{ width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: 'white',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: isSubmitting ? '#94a3b8' : '#2563eb',
                color: 'white',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Save Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}