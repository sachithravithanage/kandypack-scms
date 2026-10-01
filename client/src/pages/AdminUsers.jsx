import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const roleNames = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
  6: "Customer",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null); // user_id currently being edited, or null
  const [editForm, setEditForm] = useState({ name: "", email: "", roleId: "" });

  const loadUsers = useCallback(() => {
    const authHeader = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    };

    axios
      .get("http://localhost:5000/api/users", authHeader)
      .then((res) => setUsers(res.data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load users"),
      );
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        `http://localhost:5000/api/users/${userId}`,
        {
          name: editForm.name,
          email: editForm.email,
          roleId: Number(editForm.roleId),
        },
        authHeader,
      );
      setEditingUser(null);
      loadUsers(); // refresh the table so the saved change shows immediately
    } catch (err) {
      setError(err.response?.data?.error || "Could not update user");
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Deactivate this user?")) return;
    try {
      await axios.put(
        `http://localhost:5000/api/users/${userId}/deactivate`,
        {},
        authHeader,
      );
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Could not deactivate user");
    }
  };

  return (
    <div className="container mt-5">
      <h2>User Management</h2>
      {error && <p className="text-danger">{error}</p>}
      <table className="table">
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
                  <td>{u.is_active ? "Active" : "Deactivated"}</td>
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
                  <td>{u.is_active ? "Active" : "Deactivated"}</td>
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
  );
}

export default AdminUsers;
