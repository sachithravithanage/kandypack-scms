import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";

const roleNames = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
  6: "Customer",
};
// Customer (6) is deliberately left out here — customers self-register via the public
// Register page (SRS 3.1.1 / REQ-USR-03). This dropdown is only for accounts an Admin creates.
const creatableRoles = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", roleId: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "2",
    licenseNumber: "",
  });

  const loadUsers = useCallback(() => {
    axios
      .get(apiUrl("/api/users"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setUsers(res.data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load users"),
      );
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        apiUrl("/api/users"),
        {
          name: addForm.name,
          email: addForm.email,
          password: addForm.password,
          roleId: Number(addForm.roleId),
          licenseNumber:
            addForm.roleId === "4" ? addForm.licenseNumber : undefined,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
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
      setError(err.response?.data?.error || "Could not create user");
    }
  };

  const startEdit = (user) => {
    setEditingUser(user.user_id);
    setEditForm({ name: user.name, email: user.email, roleId: user.role_id });
    setError("");
  };

  const cancelEdit = () => {
    setEditingUser(null);
  };

  const saveEdit = async (userId) => {
    try {
      await axios.put(
        apiUrl(`/api/users/${userId}`),
        {
          name: editForm.name,
          email: editForm.email,
          roleId: Number(editForm.roleId),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update user");
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Deactivate this user?")) return;
    try {
      await axios.put(
        apiUrl(`/api/users/${userId}/deactivate`),
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Could not deactivate user");
    }
  };

  return (
    <AppLayout pageTitle="User management">
      {error && <p className="text-danger">{error}</p>}

      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showAddForm && (
        <div className="kp-card mb-3">
          <h5 className="mb-3">Create a staff account</h5>
          <form onSubmit={handleAddUser}>
            <div className="row g-2">
              <div className="col-md-3">
                <label>Name</label>
                <input
                  className="form-control"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-3">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-2">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-3">
                <label>Role</label>
                <select
                  className="form-select"
                  value={addForm.roleId}
                  onChange={(e) =>
                    setAddForm({ ...addForm, roleId: e.target.value })
                  }
                >
                  {Object.entries(creatableRoles).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {addForm.roleId === "4" && (
                <div className="col-md-2">
                  <label>License number</label>
                  <input
                    className="form-control"
                    value={addForm.licenseNumber}
                    onChange={(e) =>
                      setAddForm({ ...addForm, licenseNumber: e.target.value })
                    }
                    required
                  />
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-success mt-3">
              Create account
            </button>
          </form>
        </div>
      )}

      <div className="kp-card" style={{ padding: 0 }}>
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                {editingUser === u.user_id ? (
                  <>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={editForm.roleId}
                        onChange={(e) =>
                          setEditForm({ ...editForm, roleId: e.target.value })
                        }
                      >
                        {Object.entries(roleNames).map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={`kp-badge ${u.is_active ? "kp-badge-success" : "kp-badge-danger"}`}
                      >
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-success me-1"
                        onClick={() => saveEdit(u.user_id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{roleNames[u.role_id]}</td>
                    <td>
                      <span
                        className={`kp-badge ${u.is_active ? "kp-badge-success" : "kp-badge-danger"}`}
                      >
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => startEdit(u)}
                      >
                        Edit
                      </button>
                      {u.is_active && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeactivate(u.user_id)}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

export default AdminUsers;
