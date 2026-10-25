import { useState } from "react";
import { Star, Calendar, Barcode, BookOpen } from "lucide-react";
import "./BookCard.css";

function BookCard({ book, onClick }) {
  const [imageError, setImageError] = useState(false);

  if (!book) return null;

  const {
    coverImage,
    title,
    author,
    rating = 0,
    ratingsCount = 0,
    publishedYear,
    availableCopies = 0,
    category,
    isbn,
  } = book;

  const numericRating = Number(rating) || 0;
  const isAvailable = Number(availableCopies) > 0;

  return (
    <div
      className={`book-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Cover Image Container */}
      <div className="book-cover-container">
        {coverImage && !imageError ? (
          <img
            src={coverImage}
            alt={title || "Book cover"}
            className="book-cover-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="book-cover-fallback">
            <BookOpen size={40} />
            <span>No Cover Available</span>
          </div>
        )}

        {/* Category Badge */}
        {category && (
          <span className="book-category-badge">{category}</span>
        )}

        {/* Availability Badge */}
        <span
          className={`book-availability-badge ${
            isAvailable ? "in-stock" : "out-of-stock"
          }`}
        >
          {isAvailable ? `${availableCopies} Copies` : "Out of Stock"}
        </span>
      </div>

      {/* Book Details */}
      <div className="book-card-content">
        <h3 className="book-title" title={title}>
          {title || "Untitled"}
        </h3>
        <p className="book-author" title={author}>
          by {author || "Unknown Author"}
        </p>

        {/* Rating Section */}
        <div className="book-rating-row">
          <div className="book-rating-stars">
            <Star size={15} className="star-filled" />
          </div>
          <span className="book-rating-value">{numericRating.toFixed(1)}</span>
          <span className="book-ratings-count">({ratingsCount})</span>
        </div>

        {/* Metadata Footer */}
        <div className="book-card-footer">
          {publishedYear && (
            <div className="book-meta-item">
              <Calendar size={13} className="meta-icon" />
              <span>Published: {publishedYear}</span>
            </div>
          )}

          {/* Show ISBN only if it is not null or undefined */}
          {isbn !== null && isbn !== undefined && isbn !== "" && (
            <div className="book-meta-item">
              <Barcode size={13} className="meta-icon" />
              <span className="book-isbn">ISBN: {isbn}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookCard;