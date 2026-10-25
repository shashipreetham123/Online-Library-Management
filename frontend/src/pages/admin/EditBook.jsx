import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Save,
  Trash2,
  PauseCircle,
  PlayCircle,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
} from "lucide-react";
import api from "../../services/api";
import Modal from "../../components/Modal";
import useRequireRole from "../../utils/useAuth";
import "./EditBook.css";

function EditBook() {
  useRequireRole("admin");
  const location = useLocation();
  const navigate = useNavigate();

  // Search State
  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Loaded Book Data State
  const [book, setBook] = useState(null);
  const [isInitialIsbnNull, setIsInitialIsbnNull] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publishedYear: "",
    category: "",
    coverImage: "",
    totalCopies: 0,
    availableCopies: 0,
    isbn: "",
  });

  // Action Loading & Feedback State
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Modal Configuration State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "Confirm",
    onConfirm: null,
  });

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const loadBookDetails = async (query) => {
    const trimmed = String(query).trim();
    if (!trimmed) return;

    setSearchInput(trimmed);
    setSearchError("");
    setFeedback({ type: "", message: "" });
    setSearchLoading(true);

    try {
      const res = await api.get(`/api/admin/book/${encodeURIComponent(trimmed)}`);
      const foundBook = res?.data;

      if (!foundBook) {
        setSearchError("Book not found.");
        setBook(null);
        return;
      }

      setBook(foundBook);
      const isNullIsbn =
        foundBook.isbn === null ||
        foundBook.isbn === undefined ||
        foundBook.isbn === "";
      setIsInitialIsbnNull(isNullIsbn);

      setFormData({
        title: foundBook.title || "",
        author: foundBook.author || "",
        publishedYear:
          foundBook.publishedYear !== undefined ? String(foundBook.publishedYear) : "",
        category: foundBook.category || "",
        coverImage: foundBook.coverImage || "",
        totalCopies: foundBook.totalCopies ?? 0,
        availableCopies: foundBook.availableCopies ?? 0,
        isbn: foundBook.isbn || "",
      });
    } catch (err) {
      setSearchError(err?.message || "Failed to retrieve book details.");
      setBook(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // Automatically fetch and prefill book if bookId is passed via navigation state (e.g. from Browse.jsx)
  useEffect(() => {
    const targetBookId = location.state?.bookId;
    if (targetBookId) {
      loadBookDetails(targetBookId);
    }
  }, [location.state?.bookId]);

  // 1. Search Book by _id or isbn
  const handleSearchBook = async (e) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (!query) {
      setSearchError("Please enter a Book ID or ISBN to search.");
      return;
    }
    loadBookDetails(query);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 4. Cancel button handler: navigates back to previous page
  const handleCancel = () => {
    navigate(-1);
  };

  // 5. Save Changes Handler: Confirmation Modal then PUT /api/admin/book/<bookId>
  const handleSaveClick = (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    // Validate ISBN if modified when initially null
    if (isInitialIsbnNull && formData.isbn.trim()) {
      const isbnVal = formData.isbn.trim();
      // Using user's modified regex from Browse.jsx: /^\d{9}$/
      if (!/^\d{9}$/.test(isbnVal)) {
        setFeedback({
          type: "error",
          message: "ISBN must be a valid 9-digit numeric format.",
        });
        return;
      }
    }

    // Validate inventory copies
    const total = Number(formData.totalCopies);
    const available = Number(formData.availableCopies);
    if (isNaN(total) || total < 0) {
      setFeedback({ type: "error", message: "Total copies must be a non-negative integer." });
      return;
    }
    if (isNaN(available) || available < 0) {
      setFeedback({ type: "error", message: "Available copies must be a non-negative integer." });
      return;
    }
    if (available > total) {
      setFeedback({
        type: "error",
        message: "Available copies cannot exceed total copies.",
      });
      return;
    }

    // Open Confirmation Modal
    setModalConfig({
      isOpen: true,
      title: "Confirm Save Changes",
      message: `Are you sure you want to save changes to "${formData.title || book.title}"?`,
      type: "info",
      confirmText: "Save Changes",
      onConfirm: executeSave,
    });
  };

  const executeSave = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        publishedYear: Number(formData.publishedYear) || undefined,
        category: formData.category.trim(),
        coverImage: formData.coverImage.trim(),
        totalCopies: Number(formData.totalCopies),
        availableCopies: Number(formData.availableCopies),
      };

      // Only include ISBN if it was initially null and now provided
      if (isInitialIsbnNull && formData.isbn.trim()) {
        payload.isbn = formData.isbn.trim();
      }

      const res = await api.put(`/api/admin/book/${book._id}`, payload);
      const updated = res?.data || res;
      setBook(updated);
      setIsInitialIsbnNull(
        updated.isbn === null || updated.isbn === undefined || updated.isbn === ""
      );
      setFeedback({
        type: "success",
        message: "Book changes saved successfully!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update book.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Put on Hold Handler: Confirmation Modal then PUT /api/admin/book/o/hold
  const handleHoldClick = () => {
    setFeedback({ type: "", message: "" });

    setModalConfig({
      isOpen: true,
      title: "Confirm Place on Hold",
      message: `Are you sure you want to put "${book.title}" on hold? Any pending requests and reservations will be cancelled.`,
      type: "warning",
      confirmText: "Put on Hold",
      onConfirm: executeHold,
    });
  };

  const executeHold = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      await api.put("/api/admin/book/o/hold", { _id: book._id });
      setBook((prev) => ({ ...prev, onHold: true }));
      setFeedback({
        type: "success",
        message: "Book placed on hold successfully. Active requests and reserves have been cancelled.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to place book on hold.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 6b. Release Hold Handler: Confirmation Modal then PUT /api/admin/book/o/release
  const handleReleaseHoldClick = () => {
    setFeedback({ type: "", message: "" });

    setModalConfig({
      isOpen: true,
      title: "Confirm Release Hold",
      message: `Are you sure you want to release the hold on "${book.title}"? The book will become available for requests and reservations again.`,
      type: "info",
      confirmText: "Release Hold",
      onConfirm: executeReleaseHold,
    });
  };

  const executeReleaseHold = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      await api.put("/api/admin/book/o/release", { _id: book._id });
      setBook((prev) => ({ ...prev, onHold: false }));
      setFeedback({
        type: "success",
        message: "Book hold released successfully! It is now active and available for requests.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to release book hold.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Delete Book Handler: Confirmation Modal then DELETE /api/admin/book
  const handleDeleteClick = () => {
    setFeedback({ type: "", message: "" });

    setModalConfig({
      isOpen: true,
      title: "Confirm Delete Book",
      message: `Are you sure you want to delete "${book.title}"?`,
      type: "danger",
      confirmText: "Delete Book",
      onConfirm: executeDelete,
    });
  };

  const executeDelete = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      await api.delete("/api/admin/book", { _id: book._id });
      setBook(null);
      setSearchInput("");
      setFeedback({
        type: "success",
        message: "Book deleted successfully.",
      });
    } catch (err) {
      // If book cannot be deleted due to active borrows/requests, prompt for Force Delete
      setFeedback({
        type: "error",
        message: err?.message || "Failed to delete book.",
      });

      // Prompt Force Delete Modal
      setModalConfig({
        isOpen: true,
        title: "Active Records Detected - Force Delete?",
        message: `${err?.message || "Book cannot be deleted while it has active borrows or requests."}\n\nWould you like to Force Delete this book? This will permanently wipe all associated borrows, requests, and reservations.`,
        type: "danger",
        confirmText: "Force Delete",
        onConfirm: executeForceDelete,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const executeForceDelete = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      await api.delete("/api/admin/book/force", { _id: book._id });
      setBook(null);
      setSearchInput("");
      setFeedback({
        type: "success",
        message: "Book and all associated records force deleted successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to force delete book.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="edit-book-container">
      {/* Page Header */}
      <div className="edit-book-header">
        <h2>Edit Book</h2>
        <p>Search and manage book metadata, copies, inventory, and holds</p>
      </div>

      {/* 1. Search Box at the Top */}
      <div className="search-book-card">
        <label className="search-book-label" htmlFor="book-search-input">
          Find Book by MongoDB _id or ISBN
        </label>
        <form onSubmit={handleSearchBook} className="search-input-row">
          <input
            id="book-search-input"
            type="text"
            className="search-book-input"
            placeholder="Enter 24-character ID or 9-digit ISBN"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={searchLoading}
          />
          <button
            type="submit"
            className="search-book-btn"
            disabled={searchLoading}
          >
            {searchLoading ? (
              <Loader2 size={16} className="btn-spinner" />
            ) : (
              <Search size={16} />
            )}
            <span>{searchLoading ? "Searching..." : "Search"}</span>
          </button>
        </form>

        {searchError && (
          <div className="edit-book-alert error">
            <AlertCircle size={16} />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Action Feedback Alerts */}
      {feedback.message && (
        <div className={`edit-book-alert ${feedback.type}`}>
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2. Book Edit Form */}
      {book ? (
        <form onSubmit={handleSaveClick} className="edit-book-form-card">
          {book.onHold && (
            <div className="book-on-hold-banner">
              <PauseCircle size={18} />
              <span>
                <strong>This book is currently on hold.</strong> It is hidden from student searches and cannot be requested or reserved.
              </span>
            </div>
          )}
          <div className="form-grid-2">
            {/* Title */}
            <div className="field-group form-group-full">
              <label htmlFor="edit-title">Title</label>
              <input
                id="edit-title"
                type="text"
                className="field-input"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            {/* Author */}
            <div className="field-group">
              <label htmlFor="edit-author">Author</label>
              <input
                id="edit-author"
                type="text"
                className="field-input"
                value={formData.author}
                onChange={(e) => handleInputChange("author", e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="field-group">
              <label htmlFor="edit-category">Category</label>
              <input
                id="edit-category"
                type="text"
                className="field-input"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                required
              />
            </div>

            {/* Published Year */}
            <div className="field-group">
              <label htmlFor="edit-year">Published Year</label>
              <input
                id="edit-year"
                type="number"
                className="field-input"
                value={formData.publishedYear}
                onChange={(e) =>
                  handleInputChange("publishedYear", e.target.value)
                }
                required
              />
            </div>

            {/* ISBN (Editable only if currently NULL, else greyed out) */}
            <div className="field-group">
              <label htmlFor="edit-isbn">
                <span>ISBN</span>
                <span className="field-hint">
                  {isInitialIsbnNull
                    ? "Editable (9 digits)"
                    : "Locked (Immutable)"}
                </span>
              </label>
              <input
                id="edit-isbn"
                type="text"
                className="field-input"
                placeholder={isInitialIsbnNull ? "e.g. 123456789" : "None"}
                value={formData.isbn}
                onChange={(e) => handleInputChange("isbn", e.target.value)}
                disabled={!isInitialIsbnNull}
              />
            </div>

            {/* Total Copies */}
            <div className="field-group">
              <label htmlFor="edit-total-copies">Total Copies</label>
              <input
                id="edit-total-copies"
                type="number"
                min="0"
                className="field-input"
                value={formData.totalCopies}
                onChange={(e) =>
                  handleInputChange("totalCopies", e.target.value)
                }
                required
              />
            </div>

            {/* Available Copies */}
            <div className="field-group">
              <label htmlFor="edit-available-copies">Available Copies</label>
              <input
                id="edit-available-copies"
                type="number"
                min="0"
                className="field-input"
                value={formData.availableCopies}
                onChange={(e) =>
                  handleInputChange("availableCopies", e.target.value)
                }
                required
              />
            </div>

            {/* Cover Image URL */}
            <div className="field-group form-group-full">
              <label htmlFor="edit-cover-img">Cover Image URL</label>
              <div className="cover-preview-row">
                <input
                  id="edit-cover-img"
                  type="text"
                  className="field-input"
                  style={{ flex: 1 }}
                  placeholder="https://..."
                  value={formData.coverImage}
                  onChange={(e) =>
                    handleInputChange("coverImage", e.target.value)
                  }
                  required
                />
                {formData.coverImage && (
                  <img
                    src={formData.coverImage}
                    alt="Cover preview"
                    className="cover-preview-thumb"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3. Action Buttons at Bottom */}
          <div className="edit-actions-bar">
            <div className="actions-left">
              {/* 4. Cancel Button */}
              <button
                type="button"
                className="action-btn cancel"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <ArrowLeft size={16} />
                <span>Cancel</span>
              </button>

              {/* 6. Hold / Release Hold Button */}
              {book.onHold ? (
                <button
                  type="button"
                  className="action-btn release"
                  onClick={handleReleaseHoldClick}
                  disabled={actionLoading}
                >
                  <PlayCircle size={16} />
                  <span>Release Hold</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="action-btn hold"
                  onClick={handleHoldClick}
                  disabled={actionLoading}
                >
                  <PauseCircle size={16} />
                  <span>Put on Hold</span>
                </button>
              )}
            </div>

            <div className="actions-right">
              {/* 7. Delete Book Button */}
              <button
                type="button"
                className="action-btn delete"
                onClick={handleDeleteClick}
                disabled={actionLoading}
              >
                <Trash2 size={16} />
                <span>Delete Book</span>
              </button>

              {/* 5. Save Changes Button */}
              <button
                type="submit"
                className="action-btn save"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 size={16} className="btn-spinner" />
                ) : (
                  <Save size={16} />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        !searchLoading && (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              color: "#94a3b8",
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              borderRadius: "12px",
            }}
          >
            <BookOpen size={40} style={{ margin: "0 auto 12px" }} />
            <p style={{ margin: 0 }}>Search for a book above to view and edit its details.</p>
          </div>
        )
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onClose={closeModal}
      />
    </div>
  );
}

export default EditBook;