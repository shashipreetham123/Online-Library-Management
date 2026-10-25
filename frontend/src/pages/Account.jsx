import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  User,
  Shield,
  KeyRound,
  IdCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  X,
  Lock,
} from "lucide-react";
import api from "../services/api";
import "./Account.css";

export default function Account() {
  const navigate = useNavigate();
  const context = useOutletContext() || {};

  const roleFromContext = context.role || sessionStorage.getItem("user_role") || "";
  const usernameFromContext = context.username || sessionStorage.getItem("user_name") || "";

  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: usernameFromContext,
    role: roleFromContext,
  });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form Fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Toggle Visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const getRoleApiPrefix = (r) => (r?.toLowerCase() === "admin" ? "admin" : (r?.toLowerCase() === "library" || r?.toLowerCase() === "librarian") ? "library" : "student");

  useEffect(() => {
    async function fetchCurrentUser() {
      const currentRole = roleFromContext || sessionStorage.getItem("user_role");
      if (!currentRole) {
        navigate("/login");
        return;
      }

      const apiPrefix = getRoleApiPrefix(currentRole);

      try {
        setLoading(true);
        const res = await api.get(`/api/${apiPrefix}/me`);
        if (res?.data) {
          setUserInfo({
            userId: res.data.userId || "",
            username: res.data.username || usernameFromContext,
            role: res.data.role || currentRole,
          });
        }
      } catch (err) {
        console.error("Failed to load user info", err);
        setAlert({
          type: "error",
          message: err?.message || "Failed to load account information. Please re-login.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchCurrentUser();
  }, [roleFromContext, usernameFromContext, navigate]);

  const handleOpenModal = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (modalLoading) return;
    setIsModalOpen(false);
    setModalError("");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!oldPassword.trim()) {
      setModalError("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      setModalError("Please enter your new password.");
      return;
    }

    if (newPassword.length < 4) {
      setModalError("New password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError("New password and confirm password do not match.");
      return;
    }

    if (oldPassword === newPassword) {
      setModalError("New password must be different from current password.");
      return;
    }

    setModalLoading(true);

    try {
      const apiPrefix = getRoleApiPrefix(userInfo.role);
      const res = await api.put(`/api/${apiPrefix}/change-password`, {
        oldPassword,
        newPassword,
      });

      setIsModalOpen(false);
      setAlert({
        type: "success",
        message: res?.message || "Password changed successfully!",
      });

      // Auto-clear alert after 5 seconds
      setTimeout(() => {
        setAlert({ type: "", message: "" });
      }, 5000);
    } catch (err) {
      setModalError(err?.message || "Failed to change password. Please verify your old password.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="account-container">
      {/* Header */}
      <div className="account-header">
        <div className="account-title-group">
          <User size={30} className="account-icon" />
          <h1 className="account-title">Account Settings</h1>
        </div>
        <p className="account-subtitle">
          Manage your personal profile and security preferences.
        </p>
      </div>

      {/* Page Notification Alert */}
      {alert.message && (
        <div className={`account-alert ${alert.type}`}>
          {alert.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Main Profile Info Card */}
      <div className="account-card">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: "0.75rem", color: "#64748b" }}>
            <Loader2 size={24} className="spinner" />
            <span>Loading user profile...</span>
          </div>
        ) : (
          <>
            <div className="profile-hero">
              <div className="hero-avatar">
                {(userInfo.username || "U")[0]?.toUpperCase()}
              </div>
              <div className="hero-meta">
                <h2 className="hero-name">{userInfo.username || "User"}</h2>
                <div className="hero-badge-row">
                  <span className={`role-badge ${userInfo.role}`}>
                    {userInfo.role || "User"}
                  </span>
                </div>
              </div>
            </div>

            <div className="account-details-grid">
              <div className="detail-item">
                <div className="detail-icon-wrap">
                  <User size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Username</span>
                  <span className="detail-value">{userInfo.username || "—"}</span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon-wrap">
                  <Shield size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Assigned Role</span>
                  <span className="detail-value" style={{ textTransform: "capitalize" }}>
                    {userInfo.role || "—"}
                  </span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon-wrap">
                  <IdCard size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Account User ID</span>
                  <span className="detail-value" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {userInfo.userId || "—"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Security & Password Section */}
      <div className="security-section">
        <div className="security-info">
          <h3>Password & Authentication</h3>
          <p>Update your password regularly to keep your account secure.</p>
        </div>
        <button
          type="button"
          className="btn-change-password"
          onClick={handleOpenModal}
        >
          <KeyRound size={17} />
          <span>Change Password</span>
        </button>
      </div>

      {/* Change Password Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <Lock size={18} />
                </div>
                <h3 className="modal-title">Change Password</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                disabled={modalLoading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalError && (
                <div className="modal-alert error">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="oldPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="oldPassword"
                      type={showOldPass ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowOldPass(!showOldPass)}
                      tabIndex={-1}
                    >
                      {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPass(!showNewPass)}
                      tabIndex={-1}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      tabIndex={-1}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseModal}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={modalLoading}
                  >
                    {modalLoading ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
