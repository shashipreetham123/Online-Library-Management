import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import "./Overdue.css";

function Overdue() {
  useRequireRole("student");
  const [overdues, setOverdues] = useState([]);
  const [totalFine, setTotalFine] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverdueData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overduesRes, totalRes] = await Promise.all([
        api.get("/api/student/overdues"),
        api.get("/api/student/overdue/total").catch(() => api.get("/api/overdue/total")),
      ]);

      const items = overduesRes?.data || [];
      setOverdues(Array.isArray(items) ? items : []);
      const fineAmount = totalRes?.data?.totalFine ?? totalRes?.totalFine ?? items.reduce((sum, item) => sum + (Number(item.fine) || 0), 0);
      setTotalFine(fineAmount);
    } catch (err) {
      setError(err?.message || "Failed to load overdue books and fine details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdueData();
  }, [fetchOverdueData]);

  return (
    <div className="overdue-container">
      <div className="overdue-header">
        <h2>Overdue Books</h2>
        <p>Monitor your overdue borrowings and outstanding penalty fines</p>
      </div>

      {error && (
        <div className="overdue-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="overdue-loading">
          <Loader2 size={24} className="spin-icon" />
          <span>Checking overdue records...</span>
        </div>
      ) : (
        <>
          <div className="overdue-summary-card">
            <div className="overdue-summary-left">
              <div className="summary-icon-box">
                <AlertTriangle size={24} />
              </div>
              <div className="summary-details">
                <h4>
                  {overdues.length > 0
                    ? `${overdues.length} Overdue Book${overdues.length === 1 ? "" : "s"} Pending`
                    : "No Overdue Books"}
                </h4>
                <p>
                  {overdues.length > 0
                    ? "Please return these books to the library as soon as possible to avoid increasing fines."
                    : "Your account is in good standing. Keep up the great reading!"}
                </p>
              </div>
            </div>

            <div className="overdue-amount-pill">
              <span className="amount-label">Total Outstanding Fine</span>
              <span className="amount-value">₹{totalFine}</span>
            </div>
          </div>

          {overdues.length === 0 ? (
            <div className="overdue-empty-box">
              <CheckCircle2 size={44} />
              <h3>All Caught Up!</h3>
              <p>You have no overdue books at this time.</p>
            </div>
          ) : (
            <div className="overdue-list">
              {overdues.map((item) => (
                <div key={item._id || item.code} className="overdue-item-card">
                  <div className="overdue-item-left">
                    {item.book?.coverImage ? (
                      <img src={item.book.coverImage} alt={item.book.title} className="overdue-cover-img" />
                    ) : (
                      <div className="overdue-cover-fallback">
                        <BookOpen size={24} />
                      </div>
                    )}

                    <div className="overdue-item-details">
                      <h4 className="overdue-item-title">{item.book?.title || "Untitled Book"}</h4>
                      <p className="overdue-item-author">by {item.book?.author || "Unknown Author"}</p>
                      <div className="overdue-item-meta">
                        <span className="overdue-pill code" title="Borrow Code">
                          <KeyRound size={12} />
                          <span>Code: {item.code || "N/A"}</span>
                        </span>
                        <span className="overdue-pill due-date" title="Original Due Date">
                          <Clock size={12} />
                          <span>Due: {item.due ? new Date(item.due).toLocaleDateString() : "N/A"}</span>
                        </span>
                        <span className="overdue-pill days-count" title="Days Late">
                          <AlertCircle size={12} />
                          <span>{item.daysOverdue} {item.daysOverdue === 1 ? "day" : "days"} overdue</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overdue-fine-box">
                    <span className="fine-tag-label">Fine Accumulated</span>
                    <span className="fine-tag-amount">₹{item.fine || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Overdue;
