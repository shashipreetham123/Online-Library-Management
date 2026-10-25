import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
    Filter,
    RotateCcw,
    Loader2,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    X,
    SlidersHorizontal,
    ArrowUpDown,
} from "lucide-react";
import BookCard from "../components/BookCard";
import api from "../services/api";
import "./Browse.css";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;
const PAGE_SIZE = 20;

function Browse() {
    const navigate = useNavigate();
    const context = useOutletContext() || {};
    const role = context.role || sessionStorage.getItem("user_role") || "student";
    const isAdmin = role === "admin";

    // Data states
    const [books, setBooks] = useState([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [categories, setCategories] = useState([]);

    // Floating filter sidebar open/close state
    const [isFilterOpen, setIsFilterOpen] = useState(true);

    // Sorting state (format: "column,1" or "column,-1")
    const [sortBy, setSortBy] = useState("");

    // Filter form states
    const [queryText, setQueryText] = useState(""); // title or isbn or _id
    const [author, setAuthor] = useState("");
    const [minRating, setMinRating] = useState(0); // 0 to 5
    const [minPublishYear, setMinPublishYear] = useState(MIN_YEAR);
    const [maxPublishYear, setMaxPublishYear] = useState(CURRENT_YEAR);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [availability, setAvailability] = useState({
        available: false,
        unavailable: false,
    });

    // Stored active filters to preserve across page changes
    const [activeFilters, setActiveFilters] = useState({});

    // Check if any filter is currently applied
    const hasActiveFilters = Object.keys(activeFilters).length > 0;

    // Fetch available categories dynamically from backend
    useEffect(() => {
        async function fetchMetadata() {
            try {
                const res = await api.get("/api/books/metadata");
                if (res?.categories) {
                    setCategories(Object.keys(res.categories));
                }
            } catch {
                setCategories(["fiction", "science", "history", "biography", "technology"]);
            }
        }
        fetchMetadata();
    }, []);

    // Helper to build filter query parameters (omits empty strings)
    const buildFilterParams = useCallback(() => {
        const queryParams = {};

        const trimmedQuery = queryText.trim();

        if (trimmedQuery) {
            if (/^[0-9a-fA-F]{24}$/.test(trimmedQuery)) {
                queryParams._id = trimmedQuery;
            } else if (/^\d{9}$/.test(trimmedQuery)) {
                queryParams.isbn = trimmedQuery;
            } else {
                queryParams.title = trimmedQuery;
            }
        }

        const trimmedAuthor = author.trim();
        if (trimmedAuthor) {
            queryParams.author = trimmedAuthor;
        }

        if (Number(minRating) > 0) {
            queryParams.minrating = Number(minRating);
        }

        if (Number(minPublishYear) > MIN_YEAR) {
            queryParams.minpublishyear = Number(minPublishYear);
        }
        if (Number(maxPublishYear) < CURRENT_YEAR) {
            queryParams.maxpublishyear = Number(maxPublishYear);
        }

        if (selectedCategories.length > 0) {
            queryParams.category = selectedCategories.join(",");
        }

        if (availability.available && !availability.unavailable) {
            queryParams.available = 1;
        } else if (!availability.available && availability.unavailable) {
            queryParams.available = 0;
        }

        if (sortBy) {
            queryParams.sort = sortBy;
        }

        return queryParams;
    }, [
        queryText,
        author,
        minRating,
        minPublishYear,
        maxPublishYear,
        selectedCategories,
        availability,
        sortBy,
    ]);

    // Perform GET Request to /api/<role>/search
    const fetchBooks = useCallback(
        async (page = 1, currentAppliedFilters = activeFilters) => {
            setLoading(true);
            setError("");

            const offset = (page - 1) * PAGE_SIZE;

            const params = {
                limit: PAGE_SIZE,
                offset,
                ...currentAppliedFilters,
            };

            try {
                const response = await api.get(`/api/${role}/search`, { params });

                const bookList = response?.data || response?.books || [];
                setBooks(Array.isArray(bookList) ? bookList : []);
                setTotal(
                    response?.total ?? (Array.isArray(bookList) ? bookList.length : 0)
                );
                setCurrentPage(page);
            } catch (err) {
                setError(err?.message || "Failed to load books. Please try again.");
                setBooks([]);
            } finally {
                setLoading(false);
            }
        },
        [role, activeFilters]
    );

    // Initial load
    useEffect(() => {
        fetchBooks(1, {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle applying filters from form
    const handleApplyFilters = (e) => {
        if (e) e.preventDefault();
        const newFilters = buildFilterParams();
        setActiveFilters(newFilters);
        fetchBooks(1, newFilters);
    };

    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        const updatedFilters = { ...activeFilters };
        if (newSort) {
            updatedFilters.sort = newSort;
        } else {
            delete updatedFilters.sort;
        }
        setActiveFilters(updatedFilters);
        fetchBooks(1, updatedFilters);
    };

    const handleResetFilters = () => {
        setQueryText("");
        setAuthor("");
        setMinRating(0);
        setMinPublishYear(MIN_YEAR);
        setMaxPublishYear(CURRENT_YEAR);
        setSelectedCategories([]);
        setAvailability({ available: false, unavailable: false });
        setSortBy("");
        setActiveFilters({});
        fetchBooks(1, {});
    };

    const toggleCategory = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    // Pagination calculation
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        fetchBooks(page, activeFilters);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Generate pagination buttons with ellipsis
    const renderPaginationButtons = () => {
        const buttons = [];
        const delta = 1;

        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);

        buttons.push(
            <button
                key={1}
                type="button"
                className={`page-btn ${currentPage === 1 ? "active" : ""}`}
                onClick={() => handlePageChange(1)}
            >
                1
            </button>
        );

        if (left > 2) {
            buttons.push(
                <span key="left-ellipsis" className="pagination-ellipsis">
                    ...
                </span>
            );
        }

        for (let i = left; i <= right; i++) {
            buttons.push(
                <button
                    key={i}
                    type="button"
                    className={`page-btn ${currentPage === i ? "active" : ""}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }

        if (right < totalPages - 1) {
            buttons.push(
                <span key="right-ellipsis" className="pagination-ellipsis">
                    ...
                </span>
            );
        }

        if (totalPages > 1) {
            buttons.push(
                <button
                    key={totalPages}
                    type="button"
                    className={`page-btn ${currentPage === totalPages ? "active" : ""}`}
                    onClick={() => handlePageChange(totalPages)}
                >
                    {totalPages}
                </button>
            );
        }

        return buttons;
    };

    return (
        <div className="browse-page">
            {/* Main Books Grid Section */}
            <section className="browse-main">
                <div className="browse-header-row">
                    <div>
                        <h2>Browse Collection</h2>
                        <span className="results-count">
                            {total} {total === 1 ? "Book" : "Books"} Found
                        </span>
                    </div>

                    <div className="browse-header-actions">
                        {/* Sort Dropdown */}
                        <div className="browse-sort-wrapper">
                            <ArrowUpDown size={15} className="sort-icon" />
                            <select
                                id="browse-sort-select"
                                className="browse-sort-select"
                                value={sortBy}
                                onChange={(e) => handleSortChange(e.target.value)}
                                aria-label="Sort books by"
                            >
                                <option value="">Default Order</option>
                                <option value="rating,-1">Highest Rating</option>
                                <option value="rating,1">Lowest Rating</option>
                                <option value="ratingsCount,-1">Most Rated</option>
                                <option value="publishedYear,-1">Newest Published</option>
                                <option value="publishedYear,1">Oldest Published</option>
                                <option value="title,1">Title (A - Z)</option>
                                <option value="title,-1">Title (Z - A)</option>
                                <option value="availableCopies,-1">Most Available</option>
                            </select>
                        </div>

                        {/* Button to toggle the floating filter sidebar */}
                        <button
                            type="button"
                            className={`filter-trigger-btn ${isFilterOpen ? "active" : ""}`}
                            onClick={() => setIsFilterOpen((prev) => !prev)}
                            aria-label="Toggle Filters"
                        >
                            <SlidersHorizontal size={16} />
                            <span>{isFilterOpen ? "Hide Filters" : "Show Filters"}</span>
                            {hasActiveFilters && <span className="filter-badge-dot" />}
                        </button>
                    </div>
                </div>

                {error && <div className="browse-error">{error}</div>}

                {loading ? (
                    <div className="browse-loading">
                        <Loader2 size={24} className="spin-icon" />
                        <span>Loading books...</span>
                    </div>
                ) : books.length > 0 ? (
                    <>
                        <div className="books-grid">
                            {books.map((book) => (
                                <BookCard
                                    key={book._id || book.isbn || book.title}
                                    book={book}
                                    onClick={() => {
                                        if (isAdmin) {
                                            navigate("/dashboard/edit-book", {
                                                state: {
                                                    bookId: book._id,
                                                    role,
                                                    username: context.username,
                                                },
                                            });
                                        } else {
                                            navigate(`/dashboard/book/${book._id}`, {
                                                state: {
                                                    role,
                                                    username: context.username,
                                                },
                                            });
                                        }
                                    }}
                                />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <button
                                    type="button"
                                    className="page-btn"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1 || loading}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={16} />
                                    <span>Prev</span>
                                </button>

                                {renderPaginationButtons()}

                                <button
                                    type="button"
                                    className="page-btn"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages || loading}
                                    aria-label="Next page"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="browse-empty">
                        <BookOpen size={48} />
                        <p>No books match your current filters.</p>
                    </div>
                )}
            </section>

            {/* Floating Filter Sidebar */}
            {isFilterOpen && (
                <aside className="floating-filter-sidebar">
                    <div className="filter-header">
                        <div className="filter-title">
                            <Filter size={18} />
                            <span>Filters</span>
                        </div>
                        <div className="filter-header-buttons">
                            <button
                                type="button"
                                className="filter-reset-btn"
                                onClick={handleResetFilters}
                            >
                                <RotateCcw size={12} style={{ marginRight: 4 }} />
                                Reset
                            </button>
                            <button
                                type="button"
                                className="filter-close-btn"
                                onClick={() => setIsFilterOpen(false)}
                                aria-label="Close filters"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleApplyFilters} style={{ display: "contents" }}>
                        {/* Title / ISBN / Mongo ID */}
                        <div className="filter-group">
                            <label className="filter-label" htmlFor="filter-query">
                                Title / ISBN / ID
                            </label>
                            <input
                                id="filter-query"
                                type="text"
                                className="filter-input"
                                placeholder="e.g. The Hobbit or ISBN"
                                value={queryText}
                                onChange={(e) => setQueryText(e.target.value)}
                            />
                        </div>

                        {/* Author */}
                        <div className="filter-group">
                            <label className="filter-label" htmlFor="filter-author">
                                Author
                            </label>
                            <input
                                id="filter-author"
                                type="text"
                                className="filter-input"
                                placeholder="e.g. Tolkien"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                            />
                        </div>

                        {/* Rating Slider (0 to 5) */}
                        <div className="filter-group">
                            <div className="filter-label">
                                <span>Minimum Rating</span>
                                <span className="filter-label-val">{minRating} ★</span>
                            </div>
                            <input
                                type="range"
                                className="filter-slider"
                                min="0"
                                max="5"
                                step="0.5"
                                value={minRating}
                                onChange={(e) => setMinRating(e.target.value)}
                            />
                            <div className="slider-limits">
                                <span>0 ★</span>
                                <span>5 ★</span>
                            </div>
                        </div>

                        {/* Min Published Year Slider */}
                        <div className="filter-group">
                            <div className="filter-label">
                                <span>Min Year</span>
                                <span className="filter-label-val">{minPublishYear}</span>
                            </div>
                            <input
                                type="range"
                                className="filter-slider"
                                min={MIN_YEAR}
                                max={CURRENT_YEAR}
                                value={minPublishYear}
                                onChange={(e) =>
                                    setMinPublishYear(
                                        Math.min(Number(e.target.value), Number(maxPublishYear))
                                    )
                                }
                            />
                            <div className="slider-limits">
                                <span>{MIN_YEAR}</span>
                                <span>{CURRENT_YEAR}</span>
                            </div>
                        </div>

                        {/* Max Published Year Slider */}
                        <div className="filter-group">
                            <div className="filter-label">
                                <span>Max Year</span>
                                <span className="filter-label-val">{maxPublishYear}</span>
                            </div>
                            <input
                                type="range"
                                className="filter-slider"
                                min={MIN_YEAR}
                                max={CURRENT_YEAR}
                                value={maxPublishYear}
                                onChange={(e) =>
                                    setMaxPublishYear(
                                        Math.max(Number(e.target.value), Number(minPublishYear))
                                    )
                                }
                            />
                            <div className="slider-limits">
                                <span>{MIN_YEAR}</span>
                                <span>{CURRENT_YEAR}</span>
                            </div>
                        </div>

                        {/* Categories Checkboxes */}
                        {categories.length > 0 && (
                            <div className="filter-group">
                                <span className="filter-label">Categories</span>
                                <div className="checkbox-list">
                                    {categories.map((cat) => (
                                        <label key={cat} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={() => toggleCategory(cat)}
                                            />
                                            <span>{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Availability Checkboxes */}
                        <div className="filter-group">
                            <span className="filter-label">Availability</span>
                            <div className="checkbox-list">
                                <label className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={availability.available}
                                        onChange={(e) =>
                                            setAvailability((prev) => ({
                                                ...prev,
                                                available: e.target.checked,
                                            }))
                                        }
                                    />
                                    <span>Available</span>
                                </label>

                                <label className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={availability.unavailable}
                                        onChange={(e) =>
                                            setAvailability((prev) => ({
                                                ...prev,
                                                unavailable: e.target.checked,
                                            }))
                                        }
                                    />
                                    <span>Unavailable</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="apply-filters-btn">
                            Apply Filters
                        </button>
                    </form>
                </aside>
            )}
        </div>
    );
}

export default Browse;