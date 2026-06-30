import React, { useEffect, useState } from 'react';
import { usersApi, sitesApi } from '../api/endpoints';
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
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Create, object = Edit
  const [showPassword, setShowPassword] = useState(false);

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
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await usersApi.delete(userId);
        await fetchData();
      } catch (err) {
        alert("Failed to delete user.");
      }
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
    setFormData({
      full_name: '', email: '', password: '',
      role: 'site_manager', site_id: '', is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        site_id: formData.site_id ? Number(formData.site_id) : null,
      };
      
      // If editing and password is empty, remove it from payload so it doesn't overwrite with empty string
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create(payload);
      }
      
      closeModal();
      await fetchData();
    } catch (err) {
      console.error('Save failed', err.response?.data);
      alert(err.response?.data?.detail || 'An error occurred');
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
                        <button className="btn-icon-only" onClick={() => handleDeleteClick(user.id)}>
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
                  />
                  <button type="button" className="users-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
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
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
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