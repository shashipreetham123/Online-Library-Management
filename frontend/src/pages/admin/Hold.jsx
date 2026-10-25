import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  PauseCircle,
  PlayCircle,
  FileEdit,
  Search,
  X,
  RotateCw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import api from "../../services/api";
import Modal from "../../components/Modal";
import useRequireRole from "../../utils/useAuth";
import "./Hold.css";

export default function Hold() {
  useRequireRole("admin");

  // Books and Search State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Modal State for Release Confirmation
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    book: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch books on hold
  const fetchHoldBooks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get("/api/admin/books/o/hold");
      setBooks(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setAlert({
        type: "error",
        message: err?.message || "Failed to load books on hold.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldBooks();
  }, [fetchHoldBooks]);

  // Filter books by query
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return books;

    return books.filter((b) => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();
      const category = (b.category || "").toLowerCase();
      const isbn = (b.isbn || "").toLowerCase();
      const id = (b._id || "").toLowerCase();
      return (
        title.includes(q) ||
        author.includes(q) ||
        category.includes(q) ||
        isbn.includes(q) ||
        id.includes(q)
      );
    });
  }, [books, searchQuery]);

  // Statistics
  const totalHeldCopies = useMemo(() => {
    return books.reduce((acc, b) => acc + (Number(b.totalCopies) || 0), 0);
  }, [books]);

  // Open Release Confirmation Modal
  const handleOpenReleaseModal = (book) => {
    setAlert({ type: "", message: "" });
    setModalConfig({
      isOpen: true,
      title: "Confirm Release Hold",
      message: `Are you sure you want to release the administrative hold on "${book.title}"? This book will immediately become available for student searches, reservations, and borrow requests.`,
      book,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false, book: null }));
  };

  // Execute Release Hold
  const handleConfirmRelease = async () => {
    const book = modalConfig.book;
    if (!book) return;

    setActionLoading(true);
    closeModal();

    try {
      await api.put("/api/admin/book/o/release", { _id: book._id });

      // Remove released book from local state
      setBooks((prev) => prev.filter((b) => b._id !== book._id));

      setAlert({
        type: "success",
        message: `Hold on "${book.title}" released successfully. The book is now available in active circulation.`,
      });
    } catch (err) {
      setAlert({
        type: "error",
        message: err?.message || "Failed to release book hold.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Navigate to Edit Book
  const handleEditBook = (bookId) => {
    navigate("/dashboard/edit-book", { state: { bookId } });
  };

  return (
    <div className="hold-page-container">
      {/* Page Header */}
      <div className="hold-page-header">
        <div className="hold-header-left">
          <div className="hold-header-icon-wrap">
            <PauseCircle size={28} />
          </div>
          <div>
            <h1 className="hold-header-title">Books on Hold</h1>
            <p className="hold-header-subtitle">
              Manage quarantined books and release titles back to active circulation
            </p>
          </div>
        </div>

        <div className="hold-header-actions">
          <button
            type="button"
            className="hold-refresh-btn"
            onClick={() => fetchHoldBooks(true)}
            disabled={loading || refreshing}
          >
            <RotateCw size={16} className={refreshing ? "hold-spinner" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Alert Feedbacks */}
      {alert.message && (
        <div className={`hold-alert ${alert.type}`}>
          {alert.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="hold-stats-grid">
        <div className="hold-stat-card">
          <div className="hold-stat-icon-wrap amber">
            <PauseCircle size={22} />
          </div>
          <div className="hold-stat-info">
            <span className="hold-stat-value">{books.length}</span>
            <span className="hold-stat-label">Titles On Hold</span>
          </div>
        </div>

        <div className="hold-stat-card">
          <div className="hold-stat-icon-wrap blue">
            <PackageCheck size={22} />
          </div>
          <div className="hold-stat-info">
            <span className="hold-stat-value">{totalHeldCopies}</span>
            <span className="hold-stat-label">Total Held Copies</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="hold-search-card">
        <div className="hold-search-input-wrap">
          <Search size={18} className="hold-search-icon" />
          <input
            type="text"
            className="hold-search-input"
            placeholder="Search on-hold books by title, author, category, ISBN, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="hold-clear-search-btn"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="hold-table-card">
        <div className="hold-table-header">
          <h2 className="hold-table-title">Held Catalog Titles</h2>
          <span className="hold-count-badge">
            {filteredBooks.length} {filteredBooks.length === 1 ? "Book" : "Books"}
          </span>
        </div>

        {loading ? (
          <div className="hold-loading-state">
            <Loader2 size={36} className="hold-spinner" />
            <p>Loading held books catalog...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="hold-empty-state">
            <div className="hold-empty-icon-wrap">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="hold-empty-title">
              {searchQuery ? "No Matching Books on Hold" : "No Books Currently on Hold"}
            </h3>
            <p className="hold-empty-desc">
              {searchQuery
                ? "Try adjusting your search criteria or clearing the filter."
                : "All library books are active and available for student requests and circulation."}
            </p>
          </div>
        ) : (
          <div className="hold-table-responsive">
            <table className="hold-table">
              <thead>
                <tr>
                  <th>Book Details</th>
                  <th>Category</th>
                  <th>ISBN</th>
                  <th>Copies</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div className="hold-book-cell">
                        {b.coverImage ? (
                          <img
                            src={b.coverImage}
                            alt={b.title}
                            className="hold-book-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="hold-book-cover-placeholder"
                          style={{ display: b.coverImage ? "none" : "flex" }}
                        >
                          <BookOpen size={20} />
                        </div>
                        <div className="hold-book-meta">
                          <span className="hold-book-title">{b.title}</span>
                          <span className="hold-book-author">
                            by {b.author || "Unknown Author"}
                            {b.publishedYear ? ` (${b.publishedYear})` : ""}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="hold-category-badge">
                        {b.category || "General"}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                        {b.isbn || "—"}
                      </span>
                    </td>

                    <td>
                      <span>
                        <strong>{b.availableCopies ?? 0}</strong> /{" "}
                        {b.totalCopies ?? 0}
                      </span>
                    </td>

                    <td>
                      <span className="hold-status-pill">
                        <PauseCircle size={13} />
                        <span>On Hold</span>
                      </span>
                    </td>

                    <td>
                      <div className="hold-actions-cell">
                        <button
                          type="button"
                          className="hold-action-btn release"
                          onClick={() => handleOpenReleaseModal(b)}
                          disabled={actionLoading}
                          title="Release hold and return book to circulation"
                        >
                          <PlayCircle size={15} />
                          <span>Release Hold</span>
                        </button>

                        <button
                          type="button"
                          className="hold-action-btn edit"
                          onClick={() => handleEditBook(b._id)}
                          disabled={actionLoading}
                          title="Open in Edit Book"
                        >
                          <FileEdit size={15} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type="info"
        confirmText="Release Hold"
        onConfirm={handleConfirmRelease}
        onClose={closeModal}
      />
    </div>
  );
}
