import { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import {
  Library as LibraryIcon,
  BookOpen,
  Calendar,
  Clock,
  KeyRound,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookmarkCheck,
  Hourglass,
} from "lucide-react";
import api from "../../services/api";
import Modal from "../../components/Modal";
import useRequireRole from "../../utils/useAuth";
import "./Library.css";

function Library() {
  useRequireRole("student");

  // Tab State: 'all' | 'borrowed' | 'reserves' | 'requests'
  const [activeTab, setActiveTab] = useState("all");

  // Data States
  const [data, setData] = useState({
    borrowed: [],
    reserves: [],
    requests: [],
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Confirmation Modal Configuration
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

  // 2. Fetch Books currently Requested, Reserved or Borrowed
  const fetchLibraryData = useCallback(async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await api.get("/api/student/library");
      const libData = res?.data || { borrowed: [], reserves: [], requests: [] };
      setData({
        borrowed: Array.isArray(libData.borrowed) ? libData.borrowed : [],
        reserves: Array.isArray(libData.reserves) ? libData.reserves : [],
        requests: Array.isArray(libData.requests) ? libData.requests : [],
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load library items.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // Cancel Request Handler - DELETE /api/student/request
  const handleCancelRequestClick = (item) => {
    const title = item.book?.title || "Book";
    setModalConfig({
      isOpen: true,
      title: "Cancel Book Request",
      message: `Are you sure you want to cancel your request for "${title}"?`,
      type: "warning",
      confirmText: "Cancel Request",
      onConfirm: () => executeCancelRequest(item.bookId),
    });
  };

  const executeCancelRequest = async (bookId) => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await api.delete("/api/student/request", { bookId });
      setFeedback({
        type: "success",
        message: res?.message || "Request cancelled successfully.",
      });
      await fetchLibraryData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to cancel request.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Reserve Handler - DELETE /api/student/reserve
  const handleCancelReserveClick = (item) => {
    const title = item.book?.title || "Book";
    setModalConfig({
      isOpen: true,
      title: "Cancel Book Reservation",
      message: `Are you sure you want to cancel your reservation for "${title}"? The reserved book copy will be returned to the library inventory.`,
      type: "warning",
      confirmText: "Cancel Reservation",
      onConfirm: () => executeCancelReserve(item.bookId),
    });
  };

  const executeCancelReserve = async (bookId) => {
    closeModal();
    setActionLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await api.delete("/api/student/reserve", { bookId });
      setFeedback({
        type: "success",
        message: res?.message || "Reservation cancelled successfully.",
      });
      await fetchLibraryData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to cancel reservation.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const totalBorrowed = data.borrowed.length;
  const totalReserves = data.reserves.length;
  const totalRequests = data.requests.length;
  const totalAll = totalBorrowed + totalReserves + totalRequests;

  return (
    <div className="library-page-container">
      {/* Header */}
      <div className="library-header">
        <h2>My Library</h2>
        <p>Manage your active borrows, collection reservations, and queue requests</p>
      </div>

      {/* Tabs */}
      <div className="library-tabs">
        <button
          type="button"
          className={`library-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <span>All Items</span>
          <span className="tab-badge">{totalAll}</span>
        </button>

        <button
          type="button"
          className={`library-tab-btn ${activeTab === "borrowed" ? "active" : ""}`}
          onClick={() => setActiveTab("borrowed")}
        >
          <span>Borrowed</span>
          <span className="tab-badge">{totalBorrowed}</span>
        </button>

        <button
          type="button"
          className={`library-tab-btn ${activeTab === "reserves" ? "active" : ""}`}
          onClick={() => setActiveTab("reserves")}
        >
          <span>Reserved</span>
          <span className="tab-badge">{totalReserves}</span>
        </button>

        <button
          type="button"
          className={`library-tab-btn ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          <span>Requested</span>
          <span className="tab-badge">{totalRequests}</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback.message && (
        <div className={`library-alert ${feedback.type}`}>
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
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
          <Loader2 size={24} className="lib-spinner" />
          <span>Loading your library items...</span>
        </div>
      ) : totalAll === 0 ? (
        <div className="library-empty-box">
          <BookOpen size={48} />
          <p>You have no borrowed, reserved, or requested books.</p>
          <Link to="/dashboard/browse" className="browse-link-btn">
            Browse Books
          </Link>
        </div>
      ) : (
        <div className="library-cards-list">
          {/* 1. Reserved Books */}
          {(activeTab === "all" || activeTab === "reserves") &&
            data.reserves.map((item) => (
              <div key={item._id || item.code} className="library-book-item">
                <div className="library-book-left">
                  {item.book?.coverImage ? (
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="library-item-cover"
                    />
                  ) : (
                    <div className="library-item-cover-fallback">
                      <BookOpen size={24} />
                    </div>
                  )}

                  <div className="library-item-details">
                    <h4 className="library-item-title">
                      {item.book?.title || "Untitled Book"}
                    </h4>
                    <p className="library-item-author">
                      by {item.book?.author || "Unknown Author"}
                    </p>

                    <div className="library-item-meta">
                      {/* Code of the Reserve */}
                      <span className="meta-pill code" title="Collection Code">
                        <KeyRound size={12} />
                        <span>Code: {item.code || "N/A"}</span>
                      </span>

                      <span className="meta-pill due" title="Pickup Deadline">
                        <Clock size={12} />
                        <span>
                          Collect by:{" "}
                          {item.toCollect
                            ? new Date(item.toCollect).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </span>

                      <span className="meta-pill" title="Borrow Period">
                        <Calendar size={12} />
                        <span>Duration: {item.timePeriod} days</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cancel Option for Reserve */}
                <div className="library-item-actions">
                  <button
                    type="button"
                    className="lib-cancel-btn"
                    onClick={() => handleCancelReserveClick(item)}
                    disabled={actionLoading}
                  >
                    <XCircle size={15} />
                    <span>Cancel Reserve</span>
                  </button>
                </div>
              </div>
            ))}

          {/* 2. Requested Books */}
          {(activeTab === "all" || activeTab === "requests") &&
            data.requests.map((item) => (
              <div key={item._id || item.bookId} className="library-book-item">
                <div className="library-book-left">
                  {item.book?.coverImage ? (
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="library-item-cover"
                    />
                  ) : (
                    <div className="library-item-cover-fallback">
                      <BookOpen size={24} />
                    </div>
                  )}

                  <div className="library-item-details">
                    <h4 className="library-item-title">
                      {item.book?.title || "Untitled Book"}
                    </h4>
                    <p className="library-item-author">
                      by {item.book?.author || "Unknown Author"}
                    </p>

                    <div className="library-item-meta">
                      <span className="meta-pill" title="Queue Status">
                        <Hourglass size={12} color="#2563eb" />
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>
                          In Queue
                        </span>
                      </span>

                      <span className="meta-pill" title="Requested Date">
                        <Calendar size={12} />
                        <span>
                          Requested:{" "}
                          {item.requested
                            ? new Date(item.requested).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </span>

                      <span className="meta-pill" title="Borrow Duration Requested">
                        <Clock size={12} />
                        <span>Duration: {item.timePeriod} days</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cancel Option for Request */}
                <div className="library-item-actions">
                  <button
                    type="button"
                    className="lib-cancel-btn"
                    onClick={() => handleCancelRequestClick(item)}
                    disabled={actionLoading}
                  >
                    <XCircle size={15} />
                    <span>Cancel Request</span>
                  </button>
                </div>
              </div>
            ))}

          {/* 3. Borrowed Books */}
          {(activeTab === "all" || activeTab === "borrowed") &&
            data.borrowed.map((item) => {
              const isOverdue =
                item.status === "overdue" ||
                (item.due && new Date(item.due) < new Date());

              return (
                <div key={item._id || item.code} className="library-book-item">
                  <div className="library-book-left">
                    {item.book?.coverImage ? (
                      <img
                        src={item.book.coverImage}
                        alt={item.book.title}
                        className="library-item-cover"
                      />
                    ) : (
                      <div className="library-item-cover-fallback">
                        <BookOpen size={24} />
                      </div>
                    )}

                    <div className="library-item-details">
                      <h4 className="library-item-title">
                        {item.book?.title || "Untitled Book"}
                      </h4>
                      <p className="library-item-author">
                        by {item.book?.author || "Unknown Author"}
                      </p>

                      <div className="library-item-meta">
                        {/* Code of the Borrow */}
                        <span className="meta-pill code" title="Borrow Code">
                          <KeyRound size={12} />
                          <span>Code: {item.code || "N/A"}</span>
                        </span>

                        <span
                          className={`meta-pill ${isOverdue ? "overdue" : "due"}`}
                          title="Due Date"
                        >
                          <Clock size={12} />
                          <span>
                            {isOverdue ? "OVERDUE: " : "Due: "}
                            {item.due
                              ? new Date(item.due).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </span>

                        <span className="meta-pill" title="Borrowed On">
                          <Calendar size={12} />
                          <span>
                            Borrowed:{" "}
                            {item.borrowed
                              ? new Date(item.borrowed).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="library-item-actions">
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: isOverdue ? "#dc2626" : "#4338ca",
                        backgroundColor: isOverdue ? "#fee2e2" : "#e0e7ff",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        textTransform: "capitalize",
                      }}
                    >
                      {item.status || "Borrowed"}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
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

export default Library;
