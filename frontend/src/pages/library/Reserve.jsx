import { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Search,
  BookOpen,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import { formatDate } from "../../utils/formatters";
import "./Reserve.css";

export default function LibraryReserve() {
  useRequireRole("library");

  const [reservesList, setReservesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageAlert, setPageAlert] = useState({ type: "", message: "" });
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState("accept"); // "accept" or "cancel"
  const [modalMode, setModalMode] = useState("table"); // "table" or "global"
  const [inputCode, setInputCode] = useState("");
  const [verifiedReserve, setVerifiedReserve] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // 2. Fetch all reserves from /api/library/reserves
  const fetchReserves = useCallback(async () => {
    setLoading(true);
    setPageAlert({ type: "", message: "" });

    try {
      const res = await api.get("/api/library/reserves");
      const list = res?.data || [];
      setReservesList(Array.isArray(list) ? list : []);
    } catch (err) {
      setPageAlert({
        type: "error",
        message: err?.message || "Failed to load reserved books list.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReserves();
  }, [fetchReserves]);

  // Open Accept modal from table row
  const handleOpenRowAcceptModal = (item) => {
    setActionType("accept");
    setModalMode("table");
    setInputCode("");
    setVerifiedReserve(item);
    setModalError("");
    setIsModalOpen(true);
  };

  // Open Cancel modal from table row
  const handleOpenRowCancelModal = (item) => {
    setActionType("cancel");
    setModalMode("table");
    setInputCode("");
    setVerifiedReserve(item);
    setModalError("");
    setIsModalOpen(true);
  };

  // Open Global Accept modal
  const handleOpenGlobalAcceptModal = () => {
    setActionType("accept");
    setModalMode("global");
    setInputCode("");
    setVerifiedReserve(null);
    setModalError("");
    setIsModalOpen(true);
  };

  // Open Global Cancel modal
  const handleOpenGlobalCancelModal = () => {
    setActionType("cancel");
    setModalMode("global");
    setInputCode("");
    setVerifiedReserve(null);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (modalLoading) return;
    setIsModalOpen(false);
    setVerifiedReserve(null);
    setInputCode("");
    setModalError("");
  };

  // Code verification for global action
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    const formattedCode = inputCode.trim().toUpperCase();

    if (!formattedCode) {
      setModalError("Please enter a valid Reservation Code / PIN.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.get(`/api/library/verify?code=${encodeURIComponent(formattedCode)}`);
      const data = res?.data;

      if (!data) {
        setModalError("No record found with this code.");
      } else if (data.type && data.type !== "reserve") {
        setModalError(`This code belongs to a "${data.type}", not an active reservation.`);
      } else {
        setVerifiedReserve(data);
      }
    } catch (err) {
      setModalError(err?.message || "Invalid or unverified reservation PIN code.");
      setVerifiedReserve(null);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Accept (Converts Reserve to a Borrow: POST /api/library/borrow)
  const handleExecuteAccept = async () => {
    const formattedCode = inputCode.trim().toUpperCase();

    if (!formattedCode) {
      setModalError("Student's reservation code is required to issue the book.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/api/library/borrow", { code: formattedCode });

      setIsModalOpen(false);
      setVerifiedReserve(null);
      setInputCode("");

      setPageAlert({
        type: "success",
        message:
          res?.message ||
          `Reservation successfully converted to active borrow for code ${formattedCode}!`,
      });

      await fetchReserves();
    } catch (err) {
      setModalError(
        err?.message || "Failed to convert reservation to borrow. Please check the code."
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Cancel (Cancels Reservation: DELETE /api/library/reserve)
  const handleExecuteCancel = async () => {
    const formattedCode = inputCode.trim().toUpperCase();

    if (!formattedCode) {
      setModalError("Reservation code is required to cancel reservation.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.delete("/api/library/reserve", { code: formattedCode });

      setIsModalOpen(false);
      setVerifiedReserve(null);
      setInputCode("");

      setPageAlert({
        type: "success",
        message: res?.message || `Reservation cancelled successfully for code ${formattedCode}.`,
      });

      await fetchReserves();
    } catch (err) {
      setModalError(
        err?.message || "Failed to cancel reservation. Please check the reservation code."
      );
    } finally {
      setModalLoading(false);
    }
  };

  const isExpired = (toCollectVal) => {
    if (!toCollectVal) return false;
    return new Date(toCollectVal).getTime() < Date.now();
  };

  // Filtered reservations
  const filteredReserves = reservesList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.username?.toLowerCase().includes(q) ||
      item.book?.title?.toLowerCase().includes(q) ||
      item.book?.author?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="library-reserves-container">
      {/* Header */}
      <div className="library-reserves-header">
        <div className="library-reserves-header-left">
          <div className="library-reserves-title-row">
            <CalendarClock size={30} className="library-reserves-icon" />
            <h1 className="library-reserves-title">Active Reservations</h1>
          </div>
          <p className="library-reserves-subtitle">
            Manage student book reservations awaiting pickup at the circulation desk
          </p>
        </div>

        {/* Header Global Actions */}
        <div className="library-reserves-actions">
          <button
            type="button"
            className="btn-global-cancel-reserve"
            onClick={handleOpenGlobalCancelModal}
          >
            <XCircle size={16} />
            <span>Cancel with Code</span>
          </button>

          <button
            type="button"
            className="btn-global-accept"
            onClick={handleOpenGlobalAcceptModal}
          >
            <CheckCircle2 size={16} />
            <span>Accept with Code</span>
          </button>
        </div>
      </div>

      {/* Page Alert */}
      {pageAlert.message && (
        <div className={`library-reserves-alert ${pageAlert.type}`}>
          {pageAlert.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{pageAlert.message}</span>
        </div>
      )}

      {/* Filter / Search Card */}
      <div className="reserves-filter-card">
        <div className="reserves-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="reserves-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, book title, or author..."
          />
        </div>

        <div className="reserves-count-tag">
          <span>{filteredReserves.length} Reservations</span>
        </div>
      </div>

      {/* Reserves Table */}
      <div className="reserves-table-card">
        {loading ? (
          <div className="reserves-loading-box">
            <Loader2 size={28} className="spinner" />
            <span>Loading active reservations...</span>
          </div>
        ) : filteredReserves.length === 0 ? (
          <div className="reserves-empty-box">
            <BookOpen size={44} />
            <h3>No Reservations Found</h3>
            <p>
              {searchQuery
                ? `No reservations matched "${searchQuery}".`
                : "There are currently no held copies awaiting student collection."}
            </p>
          </div>
        ) : (
          <div className="reserves-table-responsive">
            <table className="reserves-table">
              <thead>
                <tr>
                  <th>Book Details</th>
                  <th>Student</th>
                  <th>Timeline</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReserves.map((item) => {
                  const expired = isExpired(item.toCollect);

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="book-cell-meta">
                          {item.book?.coverImage ? (
                            <img
                              src={item.book.coverImage}
                              alt={item.book.title || "Book"}
                              className="book-thumb-tiny"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className="book-thumb-tiny"
                              style={{
                                background: "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <BookOpen size={18} color="#94a3b8" />
                            </div>
                          )}
                          <div className="book-cell-text">
                            <span className="book-cell-title">
                              {item.book?.title || "Unknown Book"}
                            </span>
                            <span className="book-cell-author">
                              {item.book?.author || "Unknown Author"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="user-pill">
                          <User size={13} />
                          <span>{item.username}</span>
                        </span>
                      </td>

                      <td>
                        <div className="reserve-timeline-info">
                          <span className="reserve-timeline-row">
                            <Calendar size={12} />
                            <span>Reserved: {formatDate(item.accepted)}</span>
                          </span>
                          <span
                            className={`reserve-collect-row ${
                              expired ? "expired" : ""
                            }`}
                          >
                            <Clock size={12} />
                            <span>Pickup By: {formatDate(item.toCollect)}</span>
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${
                            expired ? "expired" : "ready"
                          }`}
                        >
                          {expired ? "Expired" : "Ready for Pickup"}
                        </span>
                      </td>

                      <td>
                        <div className="reserve-row-actions">
                          {/* Cancel Option */}
                          <button
                            type="button"
                            className="btn-table-cancel-reserve"
                            onClick={() => handleOpenRowCancelModal(item)}
                            title="Cancel reservation"
                          >
                            <XCircle size={14} />
                            <span>Cancel</span>
                          </button>

                          {/* Accept Option (Converts to Borrow) */}
                          <button
                            type="button"
                            className="btn-table-accept"
                            onClick={() => handleOpenRowAcceptModal(item)}
                            title="Accept reservation and issue book"
                          >
                            <CheckCircle2 size={14} />
                            <span>Accept</span>
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

      {/* Accept / Cancel Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div
                  className={`modal-icon-badge ${
                    actionType === "accept" ? "accept" : "cancel"
                  }`}
                >
                  {actionType === "accept" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                </div>
                <h3 className="modal-title">
                  {actionType === "accept"
                    ? "Accept & Issue Borrow"
                    : "Cancel Reservation"}
                </h3>
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

              {/* Code Input */}
              <div className="code-input-form">
                <label htmlFor="reserveActionCode">
                  Reservation Security PIN / Code (from Student)
                </label>
                <div className="code-input-row">
                  <input
                    id="reserveActionCode"
                    type="text"
                    className="code-input"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RSV-XXXX"
                    autoFocus
                  />
                  {modalMode === "global" && (
                    <button
                      type="button"
                      className="btn-verify-code"
                      onClick={handleVerifyCode}
                      disabled={modalLoading || !inputCode.trim()}
                    >
                      {modalLoading ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <KeyRound size={16} />
                      )}
                      <span>Verify</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Verified Details Preview */}
              {verifiedReserve && (
                <div className="reserve-preview-box">
                  <div className="reserve-preview-header">
                    {verifiedReserve.book?.coverImage ? (
                      <img
                        src={verifiedReserve.book.coverImage}
                        alt="Book cover"
                        className="reserve-preview-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="reserve-preview-img"
                        style={{
                          background: "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <BookOpen size={20} color="#64748b" />
                      </div>
                    )}
                    <div className="reserve-preview-titles">
                      <h4>{verifiedReserve.book?.title || "Untitled Book"}</h4>
                      <p>By {verifiedReserve.book?.author || "Unknown Author"}</p>
                    </div>
                  </div>

                  <div className="reserve-preview-grid">
                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Reserved By</span>
                      <span className="preview-grid-val">{verifiedReserve.username}</span>
                    </div>

                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Pickup Deadline</span>
                      <span
                        className={`preview-grid-val ${
                          isExpired(verifiedReserve.toCollect) ? "expired" : ""
                        }`}
                      >
                        {formatDate(verifiedReserve.toCollect)}
                        {isExpired(verifiedReserve.toCollect) && " (Expired)"}
                      </span>
                    </div>

                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Loan Period</span>
                      <span className="preview-grid-val">
                        {verifiedReserve.timePeriod || 7} Days
                      </span>
                    </div>

                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Status</span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: isExpired(verifiedReserve.toCollect)
                            ? "#dc2626"
                            : "#2563eb",
                        }}
                      >
                        {isExpired(verifiedReserve.toCollect)
                          ? "Expired Reservation"
                          : "Held for Collection"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Description */}
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                {actionType === "accept"
                  ? "Accepting will convert this reservation into an active borrow loan and record the issue in activity history."
                  : "Cancelling will release the reserved book copy back into the library's available inventory."}
              </p>

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={handleCloseModal}
                  disabled={modalLoading}
                >
                  Cancel
                </button>

                {actionType === "accept" ? (
                  <button
                    type="button"
                    className="btn-modal-confirm-accept"
                    onClick={handleExecuteAccept}
                    disabled={modalLoading || !inputCode.trim()}
                  >
                    {modalLoading ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirm & Issue Book</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-modal-confirm-cancel"
                    onClick={handleExecuteCancel}
                    disabled={modalLoading || !inputCode.trim()}
                  >
                    {modalLoading ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        <span>Confirm Cancellation</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
