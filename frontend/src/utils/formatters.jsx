import {
  Send,
  BookmarkCheck,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  XCircle,
  History as HistoryIcon,
} from "lucide-react";

export const formatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  return isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export const getEventIcon = (event, size = 18) => {
  switch (event) {
    case "request":
      return <Send size={size} />;
    case "reserve":
      return <BookmarkCheck size={size} />;
    case "borrow":
      return <BookOpen size={size} />;
    case "return":
      return <RotateCcw size={size} />;
    case "overdue":
      return <AlertTriangle size={size} />;
    case "delete-request":
    case "delete-reserve":
      return <XCircle size={size} />;
    default:
      return <HistoryIcon size={size} />;
  }
};
