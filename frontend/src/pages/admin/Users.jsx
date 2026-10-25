import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users as UsersIcon,
  UserPlus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
  Search,
  Eye,
  EyeOff,
  Shield,
  User,
  Lock,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import "./Users.css";

export default function Users() {
  const { username: currentUsername } = useRequireRole("admin");
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageAlert, setPageAlert] = useState({ type: "", message: "" });
  const [searchQuery, setSearchQuery] = useState("");

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    username: "",
    password: "",
    role: "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete User Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [borrowWarning, setBorrowWarning] = useState(null); // { hasBorrows: true, count: N }

  // 2. Fetch all users from /api/admin/users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setPageAlert({ type: "", message: "" });

    try {
      const res = await api.get("/api/admin/users");
      const list = res?.data || [];
      setUsersList(Array.isArray(list) ? list : []);
    } catch (err) {
      setPageAlert({
        type: "error",
        message: err?.message || "Failed to load users catalog.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 3. Cancel button -> navigate to previous page
  const handleCancelPrevPage = () => {
    navigate(-1);
  };

  // 4. Add User Modal Handlers
  const handleOpenAddModal = () => {
    setAddFormData({ username: "", password: "", role: "student" });
    setAddError("");
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (addLoading) return;
    setIsAddModalOpen(false);
    setAddError("");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError("");

    const u = addFormData.username.trim();
    const p = addFormData.password;

    if (!u) {
      setAddError("Username is required.");
      return;
    }

    if (u.length < 4 || u.length > 20) {
      setAddError("Username must be between 4 and 20 characters.");
      return;
    }

    if (!p || p.length < 4) {
      setAddError("Password must be at least 4 characters long.");
      return;
    }

    setAddLoading(true);

    try {
      // POST to /api/admin/register
      const res = await api.post("/api/admin/register", {
        username: u,
        password: p,
        role: addFormData.role,
      });

      setIsAddModalOpen(false);
      setPageAlert({
        type: "success",
        message: res?.message || `User "${u}" registered successfully!`,
      });
      await fetchUsers();
    } catch (err) {
      setAddError(err?.message || "Failed to register user. Username may already exist.");
    } finally {
      setAddLoading(false);
    }
  };

  // 5. Delete User Modal Handlers
  const handleOpenDeleteModal = (targetUser) => {
    setSelectedUser(targetUser);
    setDeleteError("");
    setBorrowWarning(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    setBorrowWarning(null);
    setDeleteError("");
  };

  // Normal Delete: deletes requests, reserves, user (fails if borrows exist)
  const handleNormalDelete = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    setDeleteError("");
    setBorrowWarning(null);

    try {
      const res = await api.delete(`/api/admin/users/${selectedUser._id}`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setPageAlert({
        type: "success",
        message: res?.message || `User "${selectedUser.username}" deleted successfully.`,
      });
      await fetchUsers();
    } catch (err) {
      // If 409 Conflict with active borrows, offer Force Delete option
      if (err?.status === 409 || err?.data?.hasBorrows) {
        setBorrowWarning({
          hasBorrows: true,
          count: err?.data?.borrowCount || 1,
        });
        setDeleteError(err?.message || "User has active book borrows. Cannot delete normally.");
      } else {
        setDeleteError(err?.message || "Failed to delete user.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Force Delete: removes requests, reserves, borrows, and user
  const handleForceDelete = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await api.delete(`/api/admin/users/${selectedUser._id}/force`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setPageAlert({
        type: "success",
        message:
          res?.message ||
          `User "${selectedUser.username}" and all associated borrows, reserves, and requests were force deleted.`,
      });
      await fetchUsers();
    } catch (err) {
      setDeleteError(err?.message || "Failed to force delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      String(u._id).toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-users-container">
      {/* Header */}
      <div className="admin-users-header">
        <div className="admin-users-header-left">
          <div className="admin-users-title-row">
            <UsersIcon size={30} className="admin-users-icon" />
            <h1 className="admin-users-title">User Accounts</h1>
          </div>
          <p className="admin-users-subtitle">
            Manage library portal users, credentials, and access roles
          </p>
        </div>

        {/* 3. Header Action Buttons: Add User & Cancel (navigate to prev page) */}
        <div className="admin-users-actions">
          <button
            type="button"
            className="btn-header-cancel"
            onClick={handleCancelPrevPage}
            title="Return to previous page"
          >
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            className="btn-add-user"
            onClick={handleOpenAddModal}
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Page Alert */}
      {pageAlert.message && (
        <div className={`admin-users-alert ${pageAlert.type}`}>
          {pageAlert.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{pageAlert.message}</span>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="users-filter-card">
        <div className="users-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="users-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username, role, or ID..."
          />
        </div>

        <div className="users-count-tag">
          <span>{filteredUsers.length} Users</span>
        </div>
      </div>

      {/* 2. Display Available Users */}
      <div className="users-table-card">
        {loading ? (
          <div className="users-loading-box">
            <Loader2 size={28} className="spinner" />
            <span>Loading user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty-box">
            <UsersIcon size={44} />
            <h3>No Users Found</h3>
            <p>
              {searchQuery
                ? `No accounts matched your search for "${searchQuery}".`
                : "No registered users in the database."}
            </p>
          </div>
        ) : (
          <div className="users-table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>User ID</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelf = u.username === currentUsername;

                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="user-cell-meta">
                          <div className="user-avatar-small">
                            {(u.username || "U")[0]?.toUpperCase()}
                          </div>
                          <div className="user-cell-names">
                            <span className="user-name-text">{u.username}</span>
                            {isSelf && <span className="current-user-tag">(You)</span>}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <code className="user-id-code">{String(u._id)}</code>
                      </td>

                      <td>
                        <div className="user-row-actions">
                          <button
                            type="button"
                            className="btn-action-delete"
                            onClick={() => handleOpenDeleteModal(u)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? "Cannot delete your own admin account"
                                : `Delete ${u.username}`
                            }
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Add User Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={handleCloseAddModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <UserPlus size={18} />
                </div>
                <h3 className="modal-title">Register New User</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseAddModal}
                disabled={addLoading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {addError && (
                <div className="modal-alert error">
                  <AlertCircle size={16} />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="regUsername">Username</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-field-icon" />
                    <input
                      id="regUsername"
                      type="text"
                      value={addFormData.username}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, username: e.target.value })
                      }
                      placeholder="e.g. student42"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="regPassword">Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-field-icon" />
                    <input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      value={addFormData.password}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, password: e.target.value })
                      }
                      placeholder="Minimum 4 characters"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="regRole">Role</label>
                  <div className="input-with-icon">
                    <Shield size={16} className="input-field-icon" />
                    <select
                      id="regRole"
                      value={addFormData.role}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, role: e.target.value })
                      }
                    >
                      <option value="student">Student</option>
                      <option value="library">Library</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={handleCloseAddModal}
                    disabled={addLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-submit"
                    disabled={addLoading}
                  >
                    {addLoading ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Create User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete User Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseDeleteModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge danger">
                  <Trash2 size={18} />
                </div>
                <h3 className="modal-title">Delete User Account</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseDeleteModal}
                disabled={deleteLoading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {deleteError && (
                <div className="modal-alert error">
                  <AlertCircle size={16} />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="delete-dialog-content">
                <p className="delete-dialog-message">
                  Are you sure you want to delete user{" "}
                  <strong>"{selectedUser.username}"</strong> ({selectedUser.role})?
                </p>

                {borrowWarning ? (
                  <div className="borrow-warning-box">
                    <div className="borrow-warning-header">
                      <AlertTriangle size={18} />
                      <span>Active Borrows Detected!</span>
                    </div>
                    <p className="borrow-warning-desc">
                      This user currently has <strong>{borrowWarning.count} active book borrow(s)</strong>.
                      Normal delete is blocked. Force delete will permanently cancel their borrows,
                      return book copies to the library inventory, delete all reserves/requests, and remove the user.
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                    Normal delete will clean up pending requests and reservations for this user.
                    If the user has active book borrows, normal deletion will be prevented.
                  </p>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={handleCloseDeleteModal}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>

                  {borrowWarning ? (
                    <button
                      type="button"
                      className="btn-modal-force-delete"
                      onClick={handleForceDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Force Deleting...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} />
                          <span>Force Delete User</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-modal-delete"
                      onClick={handleNormalDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          <span>Delete User</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
