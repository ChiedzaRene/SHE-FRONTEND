import React, { useEffect, useState } from "react";
import { Users, Shield, UserCheck, UserX } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/admin/users/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updatePayload) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to update user");
      }
    } catch (err) {
      alert("Error updating user: " + err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div style={{ padding: "20px" }}>Loading users...</div>;

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <Shield color="#CC0000" size={28} />
        <h2>Super Admin - User Management</h2>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "12px" }}>Name</th>
            <th style={{ padding: "12px" }}>Email</th>
            <th style={{ padding: "12px" }}>Role</th>
            <th style={{ padding: "12px" }}>Status</th>
            <th style={{ padding: "12px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px" }}>{u.full_name || "N/A"}</td>
              <td style={{ padding: "12px" }}>{u.email}</td>
              <td style={{ padding: "12px" }}>
                <select
                  value={u.role}
                  onChange={(e) => updateUser(u.id, { role: e.target.value })}
                  style={{ padding: "6px", borderRadius: "4px" }}
                >
                  <option value="site_manager">Site Manager</option>
                  <option value="she_team">SHE Team</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </td>
              <td style={{ padding: "12px" }}>
                <span style={{ color: u.is_active ? "green" : "red", fontWeight: "bold" }}>
                  {u.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={{ padding: "12px" }}>
                <button
                  onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: u.is_active ? "#dc2626" : "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}