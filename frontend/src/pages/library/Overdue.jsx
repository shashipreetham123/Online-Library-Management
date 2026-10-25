import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  AlertTriangle,
  Search,
  BookOpen,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  RotateCw,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import { formatDate } from "../../utils/formatters";
import "./Overdue.css";

export default function LibraryOverdue() {
  useRequireRole("library");

  const [overduesList, setOverduesList] = useState([]);
  const [totalFine, setTotalFine] = useState(0);
  const [systemGrandTotal, setSystemGrandTotal] = useState(0);
  const [userTotals, setUserTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [activeFilterUser, setActiveFilterUser] = useState("");

  const fetchOverdueData = useCallback(async (filterUser = "") => {
    setLoading(true);
    setError("");
    try {
      const endpoint = filterUser.trim()
        ? `/api/library/overdues?username=${encodeURIComponent(filterUser.trim())}`
        : "/api/library/overdues";

      const res = await api.get(endpoint);
      const list = res?.data || [];
      setOverduesList(Array.isArray(list) ? list : []);
      setTotalFine(Number(res?.totalFine) || 0);
      setSystemGrandTotal(Number(res?.systemGrandTotal || res?.totalFine) || 0);
      setUserTotals(res?.userTotals || {});
    } catch (err) {
      setError(err?.message || "Failed to load overdue records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdueData();
  }, [fetchOverdueData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    setActiveFilterUser(trimmed);
    fetchOverdueData(trimmed);
  };

  const handleResetSearch = () => {
    setUsernameInput("");
    setActiveFilterUser("");
    fetchOverdueData("");
  };

  const userFilteredTotalFine = activeFilterUser
    ? userTotals[activeFilterUser.toLowerCase()] ||
      Object.entries(userTotals).reduce((sum, [u, val]) => (u.toLowerCase().includes(activeFilterUser.toLowerCase()) ? sum + val : sum), 0)
    : totalFine;

  return (
    <div className="library-overdue-container">
      <div className="library-overdue-header">
        <div className="library-overdue-header-left">
          <div className="library-overdue-title-row">
            <Clock size={30} className="library-overdue-icon" />
            <h1 className="library-overdue-title">Overdue Management</h1>
          </div>
          <p className="library-overdue-subtitle">
            System-wide tracking of late book returns, days overdue, and accumulated penalties
          </p>
        </div>
      </div>

      <div className="fine-metrics-grid">
        <div className="fine-metric-card highlight">
          <div className="metric-icon-box danger">
            <DollarSign size={26} />
          </div>
          <div className="metric-info">
            <span className="metric-label">
              {activeFilterUser ? `Total Overdue for "${activeFilterUser}"` : "Overall Total Fine"}
            </span>
            <span className="metric-value danger">
              ₹{userFilteredTotalFine.toLocaleString()}
            </span>
            <p className="metric-subtext">
              {activeFilterUser ? `Calculated for filtered student loans` : "Aggregated outstanding fines across all users"}
            </p>
          </div>
        </div>

        {activeFilterUser && (
          <div className="fine-metric-card">
            <div className="metric-icon-box amber">
              <TrendingUp size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Overall Library Fines</span>
              <span className="metric-value">₹{systemGrandTotal.toLocaleString()}</span>
              <p className="metric-subtext">Total across entire catalog</p>
            </div>
          </div>
        )}

        <div className="fine-metric-card">
          <div className="metric-icon-box indigo">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Delinquent Loans</span>
            <span className="metric-value">{overduesList.length}</span>
            <p className="metric-subtext">Overdue copies requiring return</p>
          </div>
        </div>
      </div>

      <div className="overdue-filter-card">
        <form onSubmit={handleSearchSubmit} className="overdue-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-field-icon" />
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Filter overdue records by student username (e.g. student1)..."
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
              title="Reset search and show all overdues"
            >
              <RotateCw size={15} />
              <span>Reset</span>
            </button>
          )}
        </form>

        {activeFilterUser && (
          <div className="user-filter-badge-row">
            <div>
              <span>Filtering for student: </span>
              <span className="filter-pill">
                <User size={13} />
                <span>{activeFilterUser}</span>
              </span>
            </div>
            <span className="user-fine-stat">
              Accumulated Fine: <strong>₹{userFilteredTotalFine.toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="library-overdue-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="overdue-table-card">
        {loading ? (
          <div className="overdue-loading-box">
            <Loader2 size={28} className="spinner" />
            <span>Loading overdue records...</span>
          </div>
        ) : overduesList.length === 0 ? (
          <div className="overdue-empty-box">
            <BookOpen size={44} />
            <h3>No Overdues Found</h3>
            <p>
              {activeFilterUser
                ? `No overdue loans found for student "${activeFilterUser}".`
                : "Great news! There are currently no overdue books in the library."}
            </p>
          </div>
        ) : (
          <div className="overdue-table-responsive">
            <table className="overdue-table">
              <thead>
                <tr>
                  <th>Book Details</th>
                  <th>Student</th>
                  <th>Loan Period</th>
                  <th>Days Overdue</th>
                  <th style={{ textAlign: "right" }}>Fine Amount</th>
                </tr>
              </thead>
              <tbody>
                {overduesList.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="book-cell-meta">
                        {item.book?.coverImage ? (
                          <img
                            src={item.book.coverImage}
                            alt={item.book.title || "Book"}
                            className="book-thumb-tiny"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div
                            className="book-thumb-tiny"
                            style={{ background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <BookOpen size={18} color="#94a3b8" />
                          </div>
                        )}
                        <div className="book-cell-text">
                          <span className="book-cell-title">{item.book?.title || "Unknown Book"}</span>
                          <span className="book-cell-author">{item.book?.author || "Unknown Author"}</span>
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
                      <div className="overdue-date-info">
                        <span className="overdue-date-row">
                          <Calendar size={12} />
                          <span>Borrowed: {formatDate(item.borrowed)}</span>
                        </span>
                        <span className="overdue-due-row">
                          <Clock size={12} />
                          <span>Due: {formatDate(item.due)}</span>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="days-overdue-pill">
                        <Clock size={12} />
                        <span>{item.daysOverdue} day{item.daysOverdue === 1 ? "" : "s"}</span>
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span className="fine-badge">
                          <span>₹{item.fine}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
