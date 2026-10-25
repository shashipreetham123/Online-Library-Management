import { useState, useEffect, useRef } from "react";
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import "./Modal.css";

/**
 * Reusable Modal Component
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Header title of the modal
 * @param {string} message - Message or prompt to display to user
 * @param {string} type - 'info' | 'success' | 'warning' | 'danger'
 * @param {boolean} hasInput - If true, displays an input field to collect data
 * @param {string} inputLabel - Label for the input field
 * @param {string} inputPlaceholder - Placeholder for the input field
 * @param {string} inputType - HTML input type ('text', 'number', 'password', etc.)
 * @param {string} initialValue - Initial value for the input field
 * @param {string} confirmText - Label for confirm/submit button (default: "Confirm")
 * @param {string} cancelText - Label for cancel button (default: "Cancel")
 * @param {boolean} showCancel - Whether to show the cancel button
 * @param {function} onConfirm - Called with (inputValue) when user confirms
 * @param {function} onClose - Called when user cancels or closes the modal
 * @param {ReactNode} children - Optional custom body elements
 */
function Modal({
  isOpen = false,
  title = "Notice",
  message = "",
  type = "info",
  hasInput = false,
  inputLabel = "",
  inputPlaceholder = "Enter value...",
  inputType = "text",
  initialValue = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = true,
  onConfirm,
  onClose,
  children,
}) {
  const [inputValue, setInputValue] = useState(initialValue);
  const inputRef = useRef(null);

  // Sync internal input value with initialValue when opened
  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue || "");
      // Auto-focus input when opened
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, initialValue]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      // Pass the collected input value (or null if not an input modal) to the parent
      onConfirm(hasInput ? inputValue : true);
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={20} />;
      case "warning":
        return <AlertTriangle size={20} />;
      case "danger":
        return <AlertCircle size={20} />;
      case "info":
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`modal-type-icon ${type}`}>{getIcon()}</div>
            <h3 className="modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Wrap for Submit/Enter handling */}
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          {/* Body */}
          <div className="modal-body">
            {message && <p className="modal-message">{message}</p>}

            {hasInput && (
              <div className="modal-input-group">
                {inputLabel && (
                  <label className="modal-input-label">{inputLabel}</label>
                )}
                <input
                  ref={inputRef}
                  type={inputType}
                  className="modal-input"
                  placeholder={inputPlaceholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
            )}

            {children}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            {showCancel && (
              <button
                type="button"
                className="modal-btn cancel"
                onClick={onClose}
              >
                {cancelText}
              </button>
            )}
            <button
              type="submit"
              className={`modal-btn confirm ${type === "danger" ? "danger" : ""}`}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Modal;
