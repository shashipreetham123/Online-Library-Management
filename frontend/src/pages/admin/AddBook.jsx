import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  BookOpen,
  User,
  Calendar,
  Layers,
  Star,
  Image,
  Tag,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import api from "../../services/api";
import useRequireRole from "../../utils/useAuth";
import "./AddBook.css";

export default function AddBook() {
  useRequireRole("admin");
  const navigate = useNavigate();

  // Form State
  // Required: title, author, publishedYear, totalCopies, rating, coverImage, availableCopies
  // Optional: category (default 'general'), isbn (default null)
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publishedYear: new Date().getFullYear(),
    totalCopies: 1,
    availableCopies: 1,
    rating: 4.5,
    coverImage: "",
    category: "general",
    isbn: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdBook, setCreatedBook] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      let val = value;
      if (type === "number") {
        val = value === "" ? "" : Number(value);
      }

      const updated = { ...prev, [name]: val };

      // Convenience: if user updates totalCopies, default availableCopies to match unless manually changed
      if (name === "totalCopies" && Number(value) >= 0) {
        if (prev.availableCopies === prev.totalCopies) {
          updated.availableCopies = Number(value);
        }
      }

      return updated;
    });
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(String(id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 5. Add Book Handler - Send POST request to '/api/admin/book'
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCreatedBook(null);

    // Frontend validations
    if (!formData.title.trim()) {
      setError("Book Title is required.");
      return;
    }

    if (!formData.author.trim()) {
      setError("Author Name is required.");
      return;
    }

    if (!formData.coverImage.trim()) {
      setError("Cover Image URL is required.");
      return;
    }

    const pubYear = Number(formData.publishedYear);
    if (!pubYear || isNaN(pubYear) || pubYear < 1000 || pubYear > 2100) {
      setError("Please provide a valid Published Year (e.g. 2024).");
      return;
    }

    const total = parseInt(formData.totalCopies, 10);
    const available = parseInt(formData.availableCopies, 10);

    if (isNaN(total) || total < 0) {
      setError("Total Copies must be a non-negative integer.");
      return;
    }

    if (isNaN(available) || available < 0) {
      setError("Available Copies must be a non-negative integer.");
      return;
    }

    if (available > total) {
      setError("Available Copies cannot exceed Total Copies.");
      return;
    }

    const ratingVal = parseFloat(formData.rating);
    if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) {
      setError("Rating must be a number between 0 and 5.");
      return;
    }

    // Prepare payload for backend
    const payload = {
      title: formData.title.trim(),
      author: formData.author.trim(),
      publishedYear: pubYear,
      totalCopies: total,
      availableCopies: available,
      rating: ratingVal,
      coverImage: formData.coverImage.trim(),
      category: formData.category.trim() ? formData.category.trim().toLowerCase() : "general",
      isbn: formData.isbn.trim() ? formData.isbn.trim() : null,
    };

    setLoading(true);

    try {
      const res = await api.post("/api/admin/book", payload);
      const bookData = res?.data;

      if (bookData && bookData._id) {
        setCreatedBook(bookData);
      } else {
        setError("Book was saved, but no _id was returned by the server.");
      }
    } catch (err) {
      setError(err?.message || "Failed to create book. Please verify your entries.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Cancel Button Handler - Navigate to previous page
  const handleCancel = () => {
    navigate(-1);
  };

  const handleResetForm = () => {
    setFormData({
      title: "",
      author: "",
      publishedYear: new Date().getFullYear(),
      totalCopies: 1,
      availableCopies: 1,
      rating: 4.5,
      coverImage: "",
      category: "general",
      isbn: "",
    });
    setCreatedBook(null);
    setError("");
  };

  return (
    <div className="add-book-container">
      {/* Header */}
      <div className="add-book-header">
        <div className="add-book-header-left">
          <div className="add-book-title-row">
            <PlusCircle size={30} className="add-book-icon" />
            <h1 className="add-book-title">Add New Book</h1>
          </div>
          <p className="add-book-subtitle">
            Catalog a new title into the library inventory system
          </p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="add-book-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Success Card showing the _id after creation */}
      {createdBook && (
        <div className="add-book-success-card">
          <div className="success-card-top">
            <div className="success-icon-badge">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h3>Book Created Successfully!</h3>
              <p>"{createdBook.title}" has been cataloged and is now available in the library.</p>
            </div>
          </div>

          <div className="success-id-box">
            <span className="id-label">Assigned Book Database ID (_id)</span>
            <div className="id-value-row">
              <code>{String(createdBook._id)}</code>
              <button
                type="button"
                className="btn-copy-id"
                onClick={() => handleCopyId(createdBook._id)}
                title="Copy ID to clipboard"
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy ID"}</span>
              </button>
            </div>
          </div>

          <div className="success-card-actions">
            <button
              type="button"
              className="btn-add-another"
              onClick={handleResetForm}
            >
              <PlusCircle size={16} />
              <span>Add Another Book</span>
            </button>
            <button
              type="button"
              className="btn-view-browse"
              onClick={() => navigate("/dashboard/browse")}
            >
              <BookOpen size={16} />
              <span>Browse Catalog</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="add-book-card">
        <form onSubmit={handleSubmit} className="form-layout">
          {/* General Details Section */}
          <div className="form-section">
            <h3 className="form-section-title">
              <BookOpen size={18} />
              <span>General Information</span>
            </h3>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="title">
                  <span>Book Title</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <BookOpen size={16} className="input-field-icon" />
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. The Great Gatsby"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="author">
                  <span>Author</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={16} className="input-field-icon" />
                  <input
                    id="author"
                    name="author"
                    type="text"
                    value={formData.author}
                    onChange={handleChange}
                    placeholder="e.g. F. Scott Fitzgerald"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="category">
                  <span>Category / Genre</span>
                  <span className="optional-tag">Optional (Default: general)</span>
                </label>
                <div className="input-with-icon">
                  <Tag size={16} className="input-field-icon" />
                  <input
                    id="category"
                    name="category"
                    type="text"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. fiction, science, history"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="isbn">
                  <span>ISBN</span>
                  <span className="optional-tag">Optional (Default: null)</span>
                </label>
                <div className="input-with-icon">
                  <Barcode size={16} className="input-field-icon" />
                  <input
                    id="isbn"
                    name="isbn"
                    type="text"
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="e.g. 9780743273565 (or leave empty)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory & Publication Section */}
          <div className="form-section">
            <h3 className="form-section-title">
              <Layers size={18} />
              <span>Inventory & Publication</span>
            </h3>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="publishedYear">
                  <span>Publish Year</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <Calendar size={16} className="input-field-icon" />
                  <input
                    id="publishedYear"
                    name="publishedYear"
                    type="number"
                    value={formData.publishedYear}
                    onChange={handleChange}
                    min="1000"
                    max="2100"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="totalCopies">
                  <span>Total Copies</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <Layers size={16} className="input-field-icon" />
                  <input
                    id="totalCopies"
                    name="totalCopies"
                    type="number"
                    value={formData.totalCopies}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="availableCopies">
                  <span>Available Copies</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <Layers size={16} className="input-field-icon" />
                  <input
                    id="availableCopies"
                    name="availableCopies"
                    type="number"
                    value={formData.availableCopies}
                    onChange={handleChange}
                    min="0"
                    max={formData.totalCopies}
                    required
                  />
                </div>
                <p className="input-hint">Cannot exceed Total Copies</p>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="rating">
                  <span>Initial Rating (0 - 5)</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <Star size={16} className="input-field-icon" />
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="coverImage">
                  <span>Cover Image URL</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <Image size={16} className="input-field-icon" />
                  <input
                    id="coverImage"
                    name="coverImage"
                    type="url"
                    value={formData.coverImage}
                    onChange={handleChange}
                    placeholder="https://example.com/cover.jpg"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Live Cover Preview */}
            {formData.coverImage && (
              <div className="cover-preview-wrapper">
                <img
                  src={formData.coverImage}
                  alt="Cover preview"
                  className="cover-preview-img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = "block";
                  }}
                />
                <div className="cover-preview-meta">
                  <strong>Cover Preview</strong>
                  <span>{formData.title || "Untitled Book"}</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Bottom Two Buttons - Add Book, Cancel */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              <ArrowLeft size={16} />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Adding Book...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Add Book</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
