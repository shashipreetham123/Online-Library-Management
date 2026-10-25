import { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  BookmarkCheck,
  RotateCcw,
  Search,
  BookOpen,
  User,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import { formatDate } from "../../utils/formatters";
import "./Borrow.css";

export default function LibraryBorrow() {
  useRequireRole("library");

  const [borrowsList, setBorrowsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageAlert, setPageAlert] = useState({ type: "", message: "" });
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("table"); // "table" (triggered from row) or "global"
  const [inputCode, setInputCode] = useState("");
  const [verifiedBorrow, setVerifiedBorrow] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // 2. Get all borrows from /api/library/borrows
  const fetchBorrows = useCallback(async () => {
    setLoading(true);
    setPageAlert({ type: "", message: "" });

    try {
      const res = await api.get("/api/library/borrows");
      const list = res?.data || [];
      setBorrowsList(Array.isArray(list) ? list : []);
    } catch (err) {
      setPageAlert({
        type: "error",
        message: err?.message || "Failed to load borrowed books list.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrows();
  }, [fetchBorrows]);

  // Open Return Modal from table row (requires student to provide code)
  const handleOpenRowReturnModal = (item) => {
    setModalMode("table");
    setInputCode("");
    setVerifiedBorrow(item);
    setModalError("");
    setIsModalOpen(true);
  };

  // 4. Open Global Return Modal from header button
  const handleOpenGlobalReturnModal = () => {
    setModalMode("global");
    setInputCode("");
    setVerifiedBorrow(null);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (modalLoading) return;
    setIsModalOpen(false);
    setVerifiedBorrow(null);
    setInputCode("");
    setModalError("");
  };

  // Code verification (for global return modal)
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    const formattedCode = inputCode.trim().toUpperCase();

    if (!formattedCode) {
      setModalError("Please enter a valid Borrow Code / PIN.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      // Check code using /api/library/verify?code=<code-uppercase>
      const res = await api.get(`/api/library/verify?code=${encodeURIComponent(formattedCode)}`);
      const data = res?.data;

      if (!data) {
        setModalError("No record found with this code.");
      } else if (data.type && data.type !== "borrow") {
        setModalError(`This code belongs to a "${data.type}", not an active borrow.`);
      } else {
        setVerifiedBorrow(data);
      }
    } catch (err) {
      setModalError(err?.message || "Invalid or unverified PIN code.");
      setVerifiedBorrow(null);
    } finally {
      setModalLoading(false);
    }
  };

  // 3. Delete Request to /api/library/borrow with uppercase code
  const handleConfirmReturn = async () => {
    const formattedCode = inputCode.trim().toUpperCase();

    if (!formattedCode) {
      setModalError("Code is required to complete return.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.delete("/api/library/borrow", { code: formattedCode });

      setIsModalOpen(false);
      setVerifiedBorrow(null);
      setInputCode("");

      setPageAlert({
        type: "success",
        message: res?.message || `Book successfully returned with code ${formattedCode}.`,
      });

      await fetchBorrows();
    } catch (err) {
      setModalError(err?.message || "Failed to process return for this code.");
    } finally {
      setModalLoading(false);
    }
  };

  const isItemOverdue = (dueVal) => {
    if (!dueVal) return false;
    return new Date(dueVal).getTime() < Date.now();
  };

  // Filtered borrows list
  const filteredBorrows = borrowsList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.code?.toLowerCase().includes(q) ||
      item.username?.toLowerCase().includes(q) ||
      item.book?.title?.toLowerCase().includes(q) ||
      item.book?.author?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="library-borrows-container">
      {/* Header */}
      <div className="library-borrows-header">
        <div className="library-borrows-header-left">
          <div className="library-borrows-title-row">
            <BookmarkCheck size={30} className="library-borrows-icon" />
            <h1 className="library-borrows-title">Active Borrows</h1>
          </div>
          <p className="library-borrows-subtitle">
            Circulation registry of all books currently borrowed by students
          </p>
        </div>

        {/* 4. Global Return Button */}
        <button
          type="button"
          className="btn-global-return"
          onClick={handleOpenGlobalReturnModal}
        >
          <RotateCcw size={17} />
          <span>Return with Code</span>
        </button>
      </div>

      {/* Page Alert */}
      {pageAlert.message && (
        <div className={`library-borrows-alert ${pageAlert.type}`}>
          {pageAlert.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{pageAlert.message}</span>
        </div>
      )}

      {/* Filter / Search Card */}
      <div className="borrows-filter-card">
        <div className="borrows-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="borrows-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, book title, author, or code..."
          />
        </div>

        <div className="borrows-count-tag">
          <span>{filteredBorrows.length} Active Records</span>
        </div>
      </div>

      {/* 2. Display Borrows Table */}
      <div className="borrows-table-card">
        {loading ? (
          <div className="borrows-loading-box">
            <Loader2 size={28} className="spinner" />
            <span>Loading active borrows...</span>
          </div>
        ) : filteredBorrows.length === 0 ? (
          <div className="borrows-empty-box">
            <BookOpen size={44} />
            <h3>No Borrows Found</h3>
            <p>
              {searchQuery
                ? `No borrowed items matched "${searchQuery}".`
                : "There are currently no active book loans in the library."}
            </p>
          </div>
        ) : (
          <div className="borrows-table-responsive">
            <table className="borrows-table">
              <thead>
                <tr>
                  <th>Book Details</th>
                  <th>Student</th>
                  <th>Timeline</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBorrows.map((item) => {
                  const overdue = isItemOverdue(item.due);

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
                        <div className="borrow-date-info">
                          <span className="borrow-date-row">
                            <Calendar size={12} />
                            <span>Out: {formatDate(item.borrowed)}</span>
                          </span>
                          <span className={`borrow-due-row ${overdue ? "overdue" : ""}`}>
                            <Clock size={12} />
                            <span>Due: {formatDate(item.due)}</span>
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill ${overdue ? "overdue" : "active"}`}>
                          {overdue ? "Overdue" : "On Loan"}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          {/* 2. One Option Return Button */}
                          <button
                            type="button"
                            className="btn-table-return"
                            onClick={() => handleOpenRowReturnModal(item)}
                          >
                            <RotateCcw size={14} />
                            <span>Return</span>
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

      {/* Return Confirmation / Code Verification Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <RotateCcw size={18} />
                </div>
                <h3 className="modal-title">
                  {modalMode === "global" ? "Process Book Return" : "Confirm Book Return"}
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
                <label htmlFor="borrowReturnCode">Borrow Security Code / PIN</label>
                <div className="code-input-row">
                  <input
                    id="borrowReturnCode"
                    type="text"
                    className="code-input"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BRW-XXXX"
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

              {/* Verified Borrow Details Display */}
              {verifiedBorrow && (
                <div className="borrow-preview-box">
                  <div className="borrow-preview-header">
                    {verifiedBorrow.book?.coverImage ? (
                      <img
                        src={verifiedBorrow.book.coverImage}
                        alt="Book cover"
                        className="borrow-preview-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="borrow-preview-img"
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
                    <div className="borrow-preview-titles">
                      <h4>{verifiedBorrow.book?.title || "Untitled Book"}</h4>
                      <p>By {verifiedBorrow.book?.author || "Unknown Author"}</p>
                    </div>
                  </div>

                  <div className="borrow-preview-grid">
                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Borrower</span>
                      <span className="preview-grid-val">{verifiedBorrow.username}</span>
                    </div>

                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Due Date</span>
                      <span
                        className={`preview-grid-val ${
                          isItemOverdue(verifiedBorrow.due) ? "overdue" : ""
                        }`}
                      >
                        {formatDate(verifiedBorrow.due)}
                        {isItemOverdue(verifiedBorrow.due) && " (Overdue)"}
                      </span>
                    </div>

                    <div className="preview-grid-item">
                      <span className="preview-grid-label">Status</span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: isItemOverdue(verifiedBorrow.due) ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {isItemOverdue(verifiedBorrow.due) ? "Overdue Borrow" : "Active Borrow"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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

                <button
                  type="button"
                  className="btn-modal-confirm-return"
                  onClick={handleConfirmReturn}
                  disabled={modalLoading || !inputCode.trim()}
                >
                  {modalLoading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Returning...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm Return</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
