import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconUsers,
  IconPlus,
  IconSearch,
  IconKey,
  IconHistory,
  IconEdit,
  IconUserX,
  IconCheck,
  IconAlertCircle,
  IconX,
} from "@tabler/icons-react";

const roleNames = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
  6: "Customer",
};

const creatableRoles = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit User state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", roleId: "" });

  // Add User state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "2",
    licenseNumber: "",
  });

  // Admin Reset Password modal state
  const [resetModalUser, setResetModalUser] = useState(null);
  const [tempPassword, setTempPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadUsers = useCallback(() => {
    axios
      .get(apiUrl("/api/users"), authHeader)
      .then((res) => setUsers(res.data || []))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load users")
      );
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await axios.post(
        apiUrl("/api/users"),
        {
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          password: addForm.password,
          roleId: Number(addForm.roleId),
          licenseNumber:
            addForm.roleId === "4" ? addForm.licenseNumber.trim() : undefined,
        },
        authHeader
      );
      setSuccess(`Account for ${addForm.name} created successfully.`);
      setAddForm({
        name: "",
        email: "",
        password: "",
        roleId: "2",
        licenseNumber: "",
      });
      setShowAddForm(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create user account.");
    }
  };

  const startEdit = (user) => {
    setEditingUser(user.user_id);
    setEditForm({ name: user.name, email: user.email, roleId: user.role_id });
    setError("");
    setSuccess("");
  };

  const cancelEdit = () => {
    setEditingUser(null);
  };

  const saveEdit = async (userId) => {
    setError("");
    setSuccess("");
    try {
      await axios.put(
        apiUrl(`/api/users/${userId}`),
        {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          roleId: Number(editForm.roleId),
        },
        authHeader
      );
      setSuccess("User account updated successfully.");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update user");
    }
  };

  const handleDeactivate = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to deactivate this account? The user will no longer be able to log in."
      )
    ) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await axios.put(apiUrl(`/api/users/${userId}/deactivate`), {}, authHeader);
      setSuccess("Account deactivated successfully.");
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Could not deactivate user");
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (tempPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError("");
    setResetLoading(true);

    try {
      await axios.put(
        apiUrl(`/api/users/${resetModalUser.user_id}/reset-password`),
        { newPassword: tempPassword },
        authHeader
      );
      setSuccess(
        `Password for ${resetModalUser.name} (${resetModalUser.email}) reset successfully!`
      );
      setResetModalUser(null);
      setTempPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset user password.");
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole =
        selectedRoleFilter === "ALL" || String(u.role_id) === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, selectedRoleFilter]);

  const getRoleBadge = (roleId) => {
    const colors = {
      1: "bg-danger-subtle text-danger",
      2: "bg-warning-subtle text-warning-emphasis",
      3: "bg-primary-subtle text-primary",
      4: "bg-info-subtle text-info-emphasis",
      5: "bg-secondary-subtle text-secondary",
      6: "bg-success-subtle text-success",
    };
    return (
      <span className={`badge ${colors[roleId] || "bg-light text-dark"} fw-medium px-2 py-1`}>
        {roleNames[roleId] || `Role #${roleId}`}
      </span>
    );
  };

  return (
    <AppLayout pageTitle="User Directory">
      <div className="kp-card">
        {/* ── Top Header ─────────────────────────────────────── */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="kp-stat-icon bg-primary-subtle text-primary mb-0">
              <IconUsers size={24} />
            </div>
            <div>
              <h2 className="h5 mb-0 fw-bold">User & Staff Management</h2>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to="/admin/audit-logs" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <IconHistory size={16} />
              <span>Audit Logs</span>
            </Link>
            <button
              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError("");
                setSuccess("");
              }}
            >
              <IconPlus size={16} />
              <span>{showAddForm ? "Close Form" : "New Staff Account"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small mb-3">
            <IconAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success d-flex align-items-center gap-2 p-2 small mb-3">
            <IconCheck size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* ── Add User Accordion Form ──────────────────────────── */}
        {showAddForm && (
          <div className="p-3 mb-4 bg-light rounded border">
            <h3 className="h6 mb-3 fw-bold text-primary">Create New Staff Account</h3>
            <form onSubmit={handleAddUser}>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-medium">Full Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Kasun Perera"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-medium">Email Address</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="staff@kandypack.local"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-medium">Initial Password</label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    placeholder="At least 8 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-medium">System Role</label>
                  <select
                    className="form-select form-select-sm"
                    value={addForm.roleId}
                    onChange={(e) => setAddForm({ ...addForm, roleId: e.target.value })}
                  >
                    {Object.entries(creatableRoles).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {addForm.roleId === "4" && (
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-medium">
                      Driver License Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. B1234567"
                      value={addForm.licenseNumber}
                      onChange={(e) => setAddForm({ ...addForm, licenseNumber: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-sm btn-primary">
                    Create Account
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── Search & Filter Bar ──────────────────────────────── */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div style={{ minWidth: "260px", maxWidth: "400px", flex: 1 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <IconSearch size={15} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => handleSearchChange("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap gap-1">
            <button
              type="button"
              className={`btn btn-sm ${
                selectedRoleFilter === "ALL" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setSelectedRoleFilter("ALL")}
            >
              All Roles ({users.length})
            </button>
            {Object.entries(roleNames).map(([id, label]) => {
              const count = users.filter((u) => String(u.role_id) === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  className={`btn btn-sm ${
                    selectedRoleFilter === id ? "btn-primary" : "btn-light border"
                  }`}
                  onClick={() => setSelectedRoleFilter(id)}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Users Table ──────────────────────────────────────── */}
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: "230px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isEditing = editingUser === u.user_id;

                  return (
                    <tr key={u.user_id}>
                      <td>
                        {isEditing ? (
                          <div className="d-flex flex-column gap-1">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                            <input
                              type="email"
                              className="form-control form-control-sm"
                              value={editForm.email}
                              onChange={(e) =>
                                setEditForm({ ...editForm, email: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="fw-semibold text-dark">{u.name}</div>
                            <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                              {u.email}
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="form-select form-select-sm"
                            value={editForm.roleId}
                            onChange={(e) =>
                              setEditForm({ ...editForm, roleId: e.target.value })
                            }
                          >
                            {Object.entries(creatableRoles).map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          getRoleBadge(u.role_id)
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.is_active
                              ? "bg-success-subtle text-success"
                              : "bg-danger-subtle text-danger"
                          }`}
                        >
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-success py-1 px-2"
                              onClick={() => saveEdit(u.user_id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-sm btn-light border py-1 px-2"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-1">
                            <button
                              className="btn btn-sm btn-light border py-1 px-2 d-flex align-items-center gap-1"
                              title="Edit user"
                              onClick={() => startEdit(u)}
                            >
                              <IconEdit size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="btn btn-sm btn-light border py-1 px-2 d-flex align-items-center gap-1 text-primary"
                              title="Reset Password"
                              onClick={() => {
                                setResetModalUser(u);
                                setTempPassword("Password123!");
                                setError("");
                                setSuccess("");
                              }}
                            >
                              <IconKey size={14} />
                              <span>Reset Pwd</span>
                            </button>
                            {u.is_active ? (
                              <button
                                className="btn btn-sm btn-outline-danger py-1 px-2"
                                title="Deactivate Account"
                                onClick={() => handleDeactivate(u.user_id)}
                              >
                                Deactivate
                              </button>
                            ) : (
                              <span className="text-muted small ps-1">—</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Admin Reset Password Modal ───────────────────────── */}
      {resetModalUser && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "440px" }}>
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconKey size={18} className="text-primary" />
                  Reset Staff Password
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setResetModalUser(null)}
                ></button>
              </div>
              <form onSubmit={handleResetPasswordSubmit}>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    Set a new replacement password for{" "}
                    <strong>{resetModalUser.name}</strong> ({resetModalUser.email}).
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-medium">New Password</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="At least 8 characters"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      required
                    />
                    <div className="form-text small" style={{ fontSize: "0.75rem" }}>
                      Default suggested for demo evaluation: <code>Password123!</code>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setResetModalUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Updating..." : "Confirm Password Reset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminUsers;
