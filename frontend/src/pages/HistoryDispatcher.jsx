import { useOutletContext } from "react-router-dom";
import StudentHistory from "./student/History";
import AdminHistory from "./admin/History";

export default function HistoryDispatcher() {
  const context = useOutletContext() || {};
  const role = (context.role || sessionStorage.getItem("user_role") || "").toLowerCase();

  // Show system audit history (with user search and pagination) for Admin and Library roles
  if (role === "admin" || role === "library") {
    return <AdminHistory />;
  }

  // Fallback to StudentHistory for students
  return <StudentHistory />;
}
