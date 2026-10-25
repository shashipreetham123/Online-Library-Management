import { useState, useEffect, useCallback } from "react";
import {
  History as HistoryIcon,
  Search,
  User,
  Clock,
  BookOpen,
  AlertCircle,
  Loader2,
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import { formatDate, getEventIcon } from "../../utils/formatters";
import "./History.css";

const PAGE_SIZE = 10;

export default function AdminHistory() {
  const { role } = useRequireRole(["admin", "library"]);
  const apiRole = role === "library" ? "library" : "admin";

  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [paginationInfo, setPaginationInfo] = useState({
    totalCount: 0,
    totalPages: 1,
    page: 1,
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [activeFilterUser, setActiveFilterUser] = useState("");

  const fetchHistory = useCallback(async (currentOffset = 0, filterUser = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      if (filterUser && filterUser.trim()) {
        params.append("username", filterUser.trim());
      }

      const res = await api.get(`/api/${apiRole}/history?${params.toString()}`);
      const records = res?.data || [];
      setHistoryList(Array.isArray(records) ? records : []);

      if (res?.pagination) {
        setPaginationInfo(res.pagination);
      } else {
        const total = Array.isArray(records) ? records.length : 0;
        setPaginationInfo({
          totalCount: total,
          totalPages: Math.ceil(total / PAGE_SIZE) || 1,
          page: Math.floor(currentOffset / PAGE_SIZE) + 1,
          limit: PAGE_SIZE,
          offset: currentOffset,
        });
      }
    } catch (err) {
      setError(err?.message || "Failed to load audit history.");
    } finally {
      setLoading(false);
    }
  }, [apiRole]);

  useEffect(() => {
    fetchHistory(offset, activeFilterUser);
  }, [offset, activeFilterUser, fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveFilterUser(usernameInput.trim());
    setOffset(0);
  };

  const handleResetSearch = () => {
    setUsernameInput("");
    setActiveFilterUser("");
    setOffset(0);
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, paginationInfo.totalPages || Math.ceil(paginationInfo.totalCount / PAGE_SIZE) || 1);
  const startItem = paginationInfo.totalCount === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + historyList.length, paginationInfo.totalCount);

  return (
    <div className="admin-history-container">
      <div className="admin-history-header">
        <div className="admin-history-header-left">
          <div className="admin-history-title-row">
            <HistoryIcon size={30} className="admin-history-icon" />
            <h1 className="admin-history-title">Audit History</h1>
          </div>
          <p className="admin-history-subtitle">
            System-wide transaction and activity records (10 records per page)
          </p>
        </div>
        <div className="admin-history-badge">
          <span>{paginationInfo.totalCount}</span>
          <span>Total Records</span>
        </div>
      </div>

      <div className="admin-history-search-card">
        <form onSubmit={handleSearchSubmit} className="admin-history-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-field-icon" />
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Filter by username (e.g. student1)..."
            />
            {usernameInput && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setUsernameInput("")}
                title="Clear input"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button type="submit" className="btn-search" disabled={loading}>
            <Search size={16} />
            <span>Search</span>
          </button>

          {(activeFilterUser || usernameInput) && (
            <button
              type="button"
              className="btn-reset"
              onClick={handleResetSearch}
              title="Reset search and show all history"
            >
              <RotateCw size={15} />
              <span>Reset</span>
            </button>
          )}
        </form>

        {activeFilterUser && (
          <div className="active-filter-indicator">
            <span>Filtering records for:</span>
            <span className="filter-pill">
              <User size={12} />
              {activeFilterUser}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-history-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-history-loading">
          <Loader2 size={26} className="admin-history-spinner" />
          <span>Loading audit history...</span>
        </div>
      ) : historyList.length === 0 ? (
        <div className="admin-history-empty">
          <BookOpen size={48} />
          <h3>No Records Found</h3>
          <p>
            {activeFilterUser
              ? `No activity history found for user "${activeFilterUser}".`
              : "There are currently no transaction or activity logs recorded."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-history-timeline">
            {historyList.map((item, index) => {
              const eventKey = item.event || "general";
              return (
                <div key={item._id || index} className="admin-timeline-item">
                  <div className={`admin-timeline-icon-box ${eventKey}`}>
                    {getEventIcon(item.event, 20)}
                  </div>
                  <div className="admin-timeline-content">
                    <div className="admin-timeline-top">
                      <h3 className="admin-timeline-summary">
                        {item.summaryShort || item.summaryLong || `${item.event} operation`}
                      </h3>
                      <span className="admin-timeline-date">
                        <Clock size={12} />
                        <span>{formatDate(item.date)}</span>
                      </span>
                    </div>
                    <div className="admin-timeline-details">
                      <span className={`admin-event-badge ${eventKey}`}>
                        {item.event ? item.event.replace("-", " ") : "Action"}
                      </span>
                      {item.username && (
                        <span className="admin-user-tag">
                          <User size={13} />
                          <span>{item.username}</span>
                        </span>
                      )}
                      {item.bookTitle && (
                        <span className="admin-book-tag" title={item.bookTitle}>
                          <BookOpen size={13} />
                          <span>{item.bookTitle}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="admin-pagination-bar">
            <div className="pagination-summary">
              Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of{" "}
              <strong>{paginationInfo.totalCount}</strong> records
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => offset >= PAGE_SIZE && setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                disabled={offset === 0 || loading}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span className="pagination-page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="pagination-btn"
                onClick={() => offset + PAGE_SIZE < paginationInfo.totalCount && setOffset((prev) => prev + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= paginationInfo.totalCount || loading}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
