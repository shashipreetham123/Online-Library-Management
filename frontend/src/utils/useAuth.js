import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../services/api";

export function useRequireRole(allowedRoles) {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const role = (context.role || sessionStorage.getItem("user_role") || "").toLowerCase();
  const username = context.username || sessionStorage.getItem("user_name") || "";

  useEffect(() => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(role)) {
      navigate("/dashboard");
      return;
    }
    const apiRole = role === "library" ? "library" : role === "admin" ? "admin" : "student";
    api.get(`/api/${apiRole}/me`).catch(() => navigate("/login"));
  }, [role, navigate, allowedRoles]);

  return { role, username, navigate, context };
}

export default useRequireRole;
