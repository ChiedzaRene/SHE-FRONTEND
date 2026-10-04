import React, { useEffect, useState } from 'react';
import { usersApi, sitesApi } from '../api/endpoints';
import { useFeedback } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../utils/apiError';
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  X,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
} from 'lucide-react';

const UserManagement = () => {
  const { notify, confirm } = useFeedback();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Create, object = Edit
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'site_manager',
    site_id: '',
    is_active: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, sitesRes] = await Promise.all([
        usersApi.getAll(),
        sitesApi.getAll().catch(() => ({ data: [] }))
      ]);
      setUsers(usersRes.data || []);
      setSites(sitesRes.data || []);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ACTIONS ---
  
  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '', // Keep empty unless changing
      role: user.role || 'site_manager',
      site_id: user.site_id || '',
      is_active: user.is_active
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (userId) => {
    const ok = await confirm({
      title: 'Delete this user?',
      message: 'This permanently removes the account and cannot be undone.',
      confirmLabel: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    try {
      await usersApi.delete(userId);
      await fetchData();
      notify('User deleted.', 'success');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409 && typeof detail === 'string') {
        // The user has recorded incidents, audits etc. Those must keep their author, so offer the safe alternative.
        const deactivate = await confirm({
          title: "This account can't be deleted",
          message: `${detail}\n\nDeactivate this account instead?`,
          confirmLabel: 'Deactivate account',
        });
        if (deactivate) {
          try {
            await usersApi.update(userId, { is_active: false });
            await fetchData();
            notify('Account deactivated. They can no longer sign in.', 'success');
          } catch (e2) {
            notify(apiError(e2, 'Could not deactivate the user.'), 'error');
          }
        }
        return;
      }
      notify(apiError(err, 'Failed to delete user.'), 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setShowPassword(false);
    setFormError('');
    setFormData({
      full_name: '', email: '', password: '',
      role: 'site_manager', site_id: '', is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const newPassword = formData.password || '';
    if (newPassword && newPassword.length < 8) {
      setFormError('The password must be at least 8 characters.');
      return;
    }
    const payload = {
      ...formData,
      site_id: formData.site_id ? Number(formData.site_id) : null,
    };
    // If editing and password is empty, remove it from payload so it doesn't overwrite with empty string
    if (editingUser && !payload.password) {
      delete payload.password;
    }

    setSaving(true);
    try {
      let message;
      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
        const isMe = String(editingUser.id) === String(currentUser?.user_id);
        if (newPassword && isMe) message = 'Your password has been changed.';
        else if (newPassword) message = `Password reset for ${payload.email}. They'll be asked to choose their own password when they next sign in.`;
        else message = `${payload.email} updated.`;
      } else {
        await usersApi.create(payload);
        message = `${payload.email} created. They'll choose their own password at first sign-in.`;
      }
      closeModal();
      notify(message, 'success');
      await fetchData();
    } catch (err) {
      // Shown inside the box so it can't be missed; the box stays open to fix it
      setFormError(apiError(err, 'Could not save the user.'));
    } finally {
      setSaving(false);
    }
  };

  // --- HELPERS ---
  const getSiteName = (id) => sites.find(s => String(s.id) === String(id))?.name || 'Global';
  
  const filteredUsers = users.filter((u) => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="user-management">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system access and roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Register New User
        </button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="users-search-wrap">
            <Search size={16} className="users-search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              className="form-control"
              style={{ paddingLeft: 40 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Site</th>
                <th>Status</th>
                <th className="users-actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="users-state-cell">
                    <div className="spinner"></div>
                    <p className="users-state-text">Loading users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="users-state-cell users-state-cell-empty">
                    <p className="users-state-text">No users found.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="users-name">{user.full_name}</div>
                      <div className="users-email">{user.email}</div>
                    </td>
                    <td><span className="badge">{user.role}</span></td>
                    <td>{getSiteName(user.site_id)}</td>
                    <td>
                      {user.is_active ? 
                        <span className="users-status users-status-active"><UserCheck size={14}/> Active</span> : 
                        <span className="users-status users-status-inactive"><UserX size={14}/> Inactive</span>
                      }
                    </td>
                    <td className="users-actions-cell">
                      <div className="users-actions-wrap">
                        <button className="btn-icon-only" onClick={() => handleEditClick(user)}>
                          <Edit2 size={16} color="#6366f1" />
                        </button>
                        <button className="btn-icon-only" aria-label={`Delete ${user.email}`} onClick={() => handleDeleteClick(user.id)}>
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? 'Edit User' : 'Register User'}</h2>
              <button className="users-modal-close" onClick={closeModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input name="full_name" className="form-control" value={formData.full_name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-control" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Password {editingUser && <small>(Leave blank to keep current)</small>}
                </label>
                <div className="users-password-wrap">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder={editingUser ? 'New password (at least 8 characters)' : 'At least 8 characters'}
                  />
                  <button type="button" className="users-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                <small style={{ color: '#64748b', display: 'block', marginTop: 6 }}>
                  {editingUser
                    ? 'If you set a new password, the user is signed out everywhere and must choose their own password at their next sign-in.'
                    : 'This is a temporary password. The user will be asked to choose their own at first sign-in.'}
                </small>
              </div>
              <div className="two-col users-form-two-col">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select name="role" className="form-control" value={formData.role} onChange={handleInputChange}>
                    <option value="admin">Admin</option>
                    <option value="she_team">SHE Team</option>
                    <option value="site_manager">Site Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Site</label>
                  <select name="site_id" className="form-control" value={formData.site_id} onChange={handleInputChange}>
                    <option value="">Global</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group users-active-row">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                <label className="form-label" style={{ marginBottom: 0 }}>User is Active</label>
              </div>
              {formError && (
                <div role="alert" style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px',
                  borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
                  {formError}
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;