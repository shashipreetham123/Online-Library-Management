import { useState, useEffect, useCallback } from "react";
import { Clock, AlertCircle, Loader2, BookOpen } from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import { formatDate, getEventIcon } from "../../utils/formatters";
import "./History.css";

function History() {
  useRequireRole("student");
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/student/history");
      setHistoryList(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || "Failed to load activity history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>Activity History</h2>
        <p>A chronological record of your library book requests, borrows, and returns</p>
      </div>

      {error && (
        <div className="history-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="history-loading">
          <Loader2 size={24} className="history-spinner" />
          <span>Loading activity history...</span>
        </div>
      ) : historyList.length === 0 ? (
        <div className="history-empty">
          <BookOpen size={48} />
          <p>No activity history found.</p>
        </div>
      ) : (
        <div className="history-timeline">
          {historyList.map((item, index) => {
            const eventKey = item.event || "general";
            return (
              <div key={item._id || index} className="timeline-item">
                <div className={`timeline-icon-box ${eventKey}`}>
                  {getEventIcon(item.event, 18)}
                </div>
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <h4 className="timeline-summary">
                      {item.summaryShort || item.summaryLong || `${item.event} on book`}
                    </h4>
                    <span className="timeline-date">
                      <Clock size={12} />
                      <span>{formatDate(item.date)}</span>
                    </span>
                  </div>
                  <span className={`timeline-event-badge ${eventKey}`}>
                    {item.event ? item.event.replace("-", " ") : "Event"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default History;
