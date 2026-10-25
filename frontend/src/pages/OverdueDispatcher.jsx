import { useOutletContext } from "react-router-dom";
import StudentOverdue from "./student/Overdue";
import LibraryOverdue from "./library/Overdue";

export default function OverdueDispatcher() {
  const context = useOutletContext() || {};
  const role = (context.role || sessionStorage.getItem("user_role") || "").toLowerCase();

  // If logged in as Library or Admin, show the library overdues manager
  if (role === "library" || role === "admin") {
    return <LibraryOverdue />;
  }

  // Fallback to student overdue view
  return <StudentOverdue />;
}
