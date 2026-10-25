import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  Send,
  Hourglass,
  BookmarkCheck,
} from "lucide-react";
import api from "../../services/api";
import Modal from "../../components/Modal";
import useRequireRole from "../../utils/useAuth";
import "./Book.css";

const MIN_DAYS = 2;
const MAX_DAYS = 14;

function Book() {
  const { id } = useParams();
  const { role } = useRequireRole(["student", "library"]);
  const navigate = useNavigate();
  const isLibraryRole = role === "library";

  // Book Details & Status States
  const [book, setBook] = useState(null);
  const [status, setStatus] = useState({
    isRequested: false,
    isOnReserve: false,
    isBorrowed: false,
    estimatedDays: null,
    request: null,
    reserve: null,
    borrow: null,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Rating State
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  // 3. Number Input for TimePeriod for Borrow
  const [timePeriod, setTimePeriod] = useState(7);

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

  const handleRateBook = async () => {
    setActionLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const res = await api.post(`/api/student/book/${book._id}/rate`, {
        rating: Number(userRating),
      });
      const updatedBook = res?.data || res?.book || res;
      setBook((prev) => ({ ...prev, ...updatedBook }));
      setFeedback({
        type: "success",
        message: `Thank you! Your rating of ${userRating} ★ has been recorded.`,
      });
      setIsRatingOpen(false);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to submit rating.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch Book details & Current Status for this student
  const fetchBookAndStatus = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      // 1. Fetch Book info using appropriate role endpoint
      const apiPrefix = isLibraryRole ? "/api/library" : "/api/student";
      const bookRes = await api.get(`${apiPrefix}/book/${id}`);
      const bookData = bookRes?.data || bookRes;
      setBook(bookData);

      // 2. Fetch Student's status for this book only if student
      if (!isLibraryRole) {
        const statusRes = await api.get(`/api/student/book/${id}/status`);
        if (statusRes?.data) {
          setStatus(statusRes.data);
        }
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load book details.",
      });
    } finally {
      setLoading(false);
    }
  }, [id, isLibraryRole]);

  useEffect(() => {
    fetchBookAndStatus();
  }, [fetchBookAndStatus]);

  // 6. Request or Borrow Button Handler - POST /api/student/request
  const handleRequestBorrowClick = () => {
    setFeedback({ type: "", message: "" });

    const period = Number(timePeriod);
    if (isNaN(period) || period < MIN_DAYS || period > MAX_DAYS) {
      setFeedback({
        type: "error",
        message: `Please specify a borrow duration between ${MIN_DAYS} and ${MAX_DAYS} days.`,
      });
      return;
    }

    const isAvailable = Number(book?.availableCopies) > 0;
    const actionLabel = isAvailable ? "Borrow" : "Request Borrow";

    setModalConfig({
      isOpen: true,
      title: `Confirm ${actionLabel}`,
      message: `Would you like to ${actionLabel.toLowerCase()} "${book?.title}" for ${period} days?`,
      type: "info",
      confirmText: actionLabel,
      onConfirm: executeRequestBorrow,
    });
  };

  const executeRequestBorrow = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await api.post("/api/student/request", {
        bookId: book._id,
        timeperiod: Number(timePeriod),
      });

      setFeedback({
        type: "success",
        message: res?.message || "Request processed successfully!",
      });

      // Refresh data to reflect new status (Reserve or Request queue)
      await fetchBookAndStatus();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to submit request.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Cancel Request Handler - DELETE /api/student/request
  const handleCancelRequestClick = () => {
    setFeedback({ type: "", message: "" });

    setModalConfig({
      isOpen: true,
      title: "Cancel Book Request",
      message: `Are you sure you want to cancel your waiting request for "${book?.title}"?`,
      type: "warning",
      confirmText: "Cancel Request",
      onConfirm: executeCancelRequest,
    });
  };

  const executeCancelRequest = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await api.delete("/api/student/request", {
        bookId: book._id,
      });

      setFeedback({
        type: "success",
        message: res?.message || "Request cancelled successfully.",
      });

      await fetchBookAndStatus();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to cancel request.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Cancel Reserve Handler - DELETE /api/student/reserve
  const handleCancelReserveClick = () => {
    setFeedback({ type: "", message: "" });

    setModalConfig({
      isOpen: true,
      title: "Cancel Reservation",
      message: `Are you sure you want to cancel your reservation for "${book?.title}"? The reserved copy will be released.`,
      type: "warning",
      confirmText: "Cancel Reservation",
      onConfirm: executeCancelReserve,
    });
  };

  const executeCancelReserve = async () => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await api.delete("/api/student/reserve", {
        bookId: book._id,
      });

      setFeedback({
        type: "success",
        message: res?.message || "Reservation cancelled successfully.",
      });

      await fetchBookAndStatus();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to cancel reservation.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          gap: 12,
          color: "#6366f1",
        }}
      >
        <Loader2 size={24} className="spin-icon" />
        <span>Loading book details...</span>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="student-book-container">
        <button
          type="button"
          className="student-book-back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          <span>Back to Browse</span>
        </button>
        <div className="request-feedback-alert error">
          <AlertCircle size={16} />
          <span>Book not found.</span>
        </div>
      </div>
    );
  }

  const isAvailable = Number(book.availableCopies) > 0;
  const { isRequested, isOnReserve, isBorrowed, estimatedDays } = status;

  return (
    <div className="student-book-container">
      {/* Back Button */}
      <button
        type="button"
        className="student-book-back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        <span>Back to Browse</span>
      </button>

      {/* Alert Notifications */}
      {feedback.message && (
        <div className={`request-feedback-alert ${feedback.type}`}>
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Book Details Hero Card */}
      <div className="book-details-card">
        <div className="book-cover-large">
          {book.coverImage ? (
            <img src={book.coverImage} alt={book.title} />
          ) : (
            <div className="book-cover-large-fallback">
              <BookOpen size={48} />
              <span>No Cover</span>
            </div>
          )}
        </div>

        <div className="book-info-col">
          <div className="book-badges-row">
            {book.category && (
              <span className="book-tag category">{book.category}</span>
            )}
            <span
              className={`book-tag ${isAvailable ? "in-stock" : "out-of-stock"}`}
            >
              {isAvailable ? `${book.availableCopies} Available` : "Unavailable"}
            </span>
            {book.onHold && <span className="book-tag on-hold">On Hold</span>}
          </div>

          <h2 className="book-main-title">{book.title}</h2>
          <p className="book-main-author">by {book.author || "Unknown Author"}</p>

          <div className="book-rating-row">
            <div className="book-rating-badge">
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <span>
                {Number(book.rating || 0).toFixed(1)} ({book.ratingsCount || 0}{" "}
                ratings)
              </span>
            </div>

            {!isLibraryRole && (
              <button
                type="button"
                className="btn-open-rate"
                onClick={() => setIsRatingOpen((prev) => !prev)}
              >
                <Star size={14} />
                <span>{isRatingOpen ? "Close Rating" : "Rate this Book"}</span>
              </button>
            )}
          </div>

          {!isLibraryRole && isRatingOpen && (
            <div className="rating-box-inline">
              <span className="rating-box-label">Your Rating:</span>
              <div className="stars-interactive">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled =
                    (hoverRating || userRating) >= starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      className="star-btn"
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(starVal)}
                      aria-label={`Rate ${starVal} stars`}
                    >
                      <Star
                        size={22}
                        fill={isFilled ? "#f59e0b" : "transparent"}
                        color={isFilled ? "#f59e0b" : "#cbd5e1"}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="rating-num-preview">{hoverRating || userRating} / 5</span>
              <button
                type="button"
                className="btn-submit-rating"
                onClick={handleRateBook}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 size={14} className="spin-icon" />
                ) : (
                  "Submit Rating"
                )}
              </button>
            </div>
          )}

          <div className="book-meta-grid">
            {book.publishedYear && (
              <div className="meta-box">
                <span className="meta-box-label">Published</span>
                <span className="meta-box-val">{book.publishedYear}</span>
              </div>
            )}
            {book.isbn && (
              <div className="meta-box">
                <span className="meta-box-label">ISBN</span>
                <span className="meta-box-val">{book.isbn}</span>
              </div>
            )}
            <div className="meta-box">
              <span className="meta-box-label">Total Copies</span>
              <span className="meta-box-val">{book.totalCopies || 0}</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">Available</span>
              <span className="meta-box-val">{book.availableCopies || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Status Banners */}
      {!isLibraryRole && isBorrowed && (
        <div className="book-status-card borrowed">
          <div className="status-left">
            <BookmarkCheck size={24} />
            <div className="status-texts">
              <h4>Currently Borrowed by You</h4>
              <p>
                Due on:{" "}
                {status.borrow?.due
                  ? new Date(status.borrow.due).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLibraryRole && isOnReserve && (
        <div className="book-status-card reserved">
          <div className="status-left">
            <CheckCircle2 size={24} />
            <div className="status-texts">
              <h4>Reserved for You!</h4>
              <p>
                Collection Code: <strong>{status.reserve?.code}</strong> | Collect
                before:{" "}
                {status.reserve?.toCollect
                  ? new Date(status.reserve.toCollect).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-cancel-action"
            onClick={handleCancelReserveClick}
            disabled={actionLoading}
          >
            <XCircle size={16} />
            <span>Cancel Reservation</span>
          </button>
        </div>
      )}

      {!isLibraryRole && isRequested && (
        <div className="book-status-card requested">
          <div className="status-left">
            <Hourglass size={24} />
            <div className="status-texts">
              <h4>Requested & Awaiting Availability</h4>
              {/* 4. Show estimated amount of time in days until book gets reserved */}
              <p>
                Estimated wait time:{" "}
                <strong>
                  {estimatedDays !== null && estimatedDays !== undefined
                    ? `${estimatedDays} day${estimatedDays === 1 ? "" : "s"}`
                    : "Calculating..."}
                </strong>{" "}
                until next available return.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-cancel-action"
            onClick={handleCancelRequestClick}
            disabled={actionLoading}
          >
            <XCircle size={16} />
            <span>Cancel Request</span>
          </button>
        </div>
      )}

      {/* Borrow / Request Action Card (Visible only for student and if NOT currently borrowed, reserved, or requested) */}
      {!isLibraryRole && !isBorrowed && !isOnReserve && !isRequested && (
        <div className="request-action-card">
          <div className="request-card-title">
            <Clock size={20} color="#6366f1" />
            <span>{isAvailable ? "Borrow this Book" : "Request this Book"}</span>
          </div>

          {/* 3. Number Input for TimePeriod for Borrow */}
          <div className="timeperiod-input-group">
            <label htmlFor="timeperiod-input">
              <span>Borrow Duration</span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>
                ({MIN_DAYS} - {MAX_DAYS} days)
              </span>
            </label>
            <div className="timeperiod-input-wrapper">
              <input
                id="timeperiod-input"
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                className="timeperiod-input"
                value={timePeriod}
                onChange={(e) => setTimePeriod(Number(e.target.value))}
                disabled={actionLoading || book.onHold}
              />
              <span className="timeperiod-unit">Days</span>
            </div>
          </div>

          {/* 2 & 6. Borrow / Request Borrow Button */}
          <div className="action-buttons-row">
            <button
              type="button"
              className="btn-borrow"
              onClick={handleRequestBorrowClick}
              disabled={actionLoading || book.onHold}
            >
              {actionLoading ? (
                <Loader2 size={16} className="spin-icon" />
              ) : (
                <Send size={16} />
              )}
              <span>{isAvailable ? "Borrow Book" : "Request Borrow"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Confirmation Modal */}
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

export default Book;
