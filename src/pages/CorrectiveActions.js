import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { actionsApi, sitesApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import AddActionForm from '../components/AddAction';
import { 
  ShieldCheck, Plus, Search, X, Eye
} from 'lucide-react';

const CorrectiveActions = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isReadOnly = user?.role === 'site_manager';
  
  // Data States
  const [actions, setActions] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Modal States
  const [selectedAction, setSelectedAction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resNotes, setResNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actionsRes, sitesRes] = await Promise.all([
        actionsApi.getAll(),
        sitesApi.getAll()
      ]);
      setActions(actionsRes.data || actionsRes || []);
      setSites(sitesRes.data || sitesRes || []);
    } catch (err) {
      console.error('Failed to load registry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (location.state?.fromAudit) setShowAddForm(true);
  }, [location.state]);

  const getSiteName = (id) => sites.find(s => String(s.id) === String(id))?.name || 'Unknown Site';

  const handleUpdateStatus = async (isSuccessful) => {
  try {
    await actionsApi.resolve(selectedAction.id, {
      resolution_notes: resNotes,
      is_successful: isSuccessful ? "yes" : "no"
    });
    fetchData();
    setShowDetailModal(false);
    setIsUpdating(false);
    setResNotes('');
  } catch (err) {
    console.error('Resolution failed:', err);
    alert('Failed to save resolution.');
  }
};

  const getDaysRemaining = (dueDate, isClosed) => {
    if (isClosed) return { text: 'Closed', color: '#059669' }; 
    if (!dueDate) return { text: 'No Date', color: '#94a3b8' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dueDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'hsl(0, 84%, 60%)' };
    if (diffDays === 0) return { text: 'Due Today', color: 'hsl(0, 84%, 60%)' };

    const ratio = Math.min(Math.max(diffDays / 30, 0), 1);
    const hue = ratio * 120; 
    return { text: `${diffDays} days left`, color: `hsl(${hue}, 75%, 45%)` };
  };

  const filteredActions = actions.filter(a => {
    const content = (a.action_taken || a.description || a.designation || '').toLowerCase();
    const matchesSearch = content.includes(search.toLowerCase());
    
    const isClosed = a.is_successful === true;
    const matchesStatus = statusFilter === 'All' || 
                         (statusFilter === 'Closed' && isClosed) || 
                         (statusFilter === 'Open' && !isClosed);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '20px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <ShieldCheck color="#4f46e5" size={28} /> Action Registry
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Site mitigation and compliance tracking</p>
        </div>
        {!isReadOnly && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            {showAddForm ? ' Cancel' : ' Log Action'}
          </button>
        )}
      </div>

      {/* ADD FORM SECTION */}
      {showAddForm && (
        <div style={{ marginBottom: '24px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <AddActionForm 
            sites={sites} 
            onCancel={() => setShowAddForm(false)} 
            onSuccess={() => { setShowAddForm(false); fetchData(); }} 
          />
        </div>
      )}

      {/* FILTERS */}
      <div className="card shadow-sm" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
           <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search designations or details..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="form-control" 
                style={{ paddingLeft: '38px', width: '100%' }} 
              />
           </div>
           <select className="form-control" style={{ width: '160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Open">Open Only</option>
              <option value="Closed">Closed Only</option>
           </select>
        </div>

        {/* TABLE */}
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '12px 24px' }}>Deadline & Site</th>
                <th>Designation</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
              ) : filteredActions.map((action) => {
                const deadline = getDaysRemaining(action.due_date, action.is_successful);
                return (
                  <tr key={action.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: deadline.color }}>{deadline.text}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getSiteName(action.site_id)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
                        {action.designation || 'General Compliance'}
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold',
                        background: action.is_successful ? '#dcfce7' : '#fff7ed',
                        color: action.is_successful ? '#166534' : '#9a3412'
                      }}>
                        {action.is_successful ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <button className="btn-icon-only" onClick={() => { setSelectedAction(action); setShowDetailModal(true); }}>
                        <Eye size={18} color="#6366f1" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (VIEW & UPDATE) */}
      {showDetailModal && selectedAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0 }}>Action Resolution</h3>
              <button onClick={() => { setShowDetailModal(false); setIsUpdating(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {!isUpdating ? (
                <>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b' }}>DESCRIPTION</label>
                  <p style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>{selectedAction.description}</p>
                  
                  {selectedAction.resolution_notes && (
                    <div style={{ marginTop: '15px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#059669' }}>CLOSURE COMMENTS</label>
                      <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>{selectedAction.resolution_notes}</p>
                    </div>
                  )}

                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
                    {!isReadOnly && (
                      <button className="btn btn-primary" onClick={() => setIsUpdating(true)}>Update Status</button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Resolution Comments</label>
                  <textarea 
                    className="form-control" 
                    style={{ width: '100%', minHeight: '100px', marginTop: '8px' }}
                    placeholder="Enter details about the resolution..."
                    value={resNotes}
                    onChange={(e) => setResNotes(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => handleUpdateStatus(true)} style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      Confirm Successful Closure
                    </button>
                    <button onClick={() => handleUpdateStatus(false)} style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      Keep Open (Incomplete)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectiveActions;