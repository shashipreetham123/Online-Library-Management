import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
import {
    BookOpen,
    PlusCircle,
    FileEdit,
    Users,
    History,
    Settings,
    Library,
    Clock,
    Home,
    BookmarkCheck,
    CalendarClock,
    PauseCircle,
    LogOut,
} from "lucide-react";
import api from "../services/api";
import "./Dashboard.css";

function getSidebarOptions(role) {
    if (role === "admin") {
        return [
            { label: "Home", to: "", icon: Home },
            { label: "Browse Books", to: "browse", icon: BookOpen },
            { label: "Add Book", to: "add-book", icon: PlusCircle },
            { label: "Edit Book", to: "edit-book", icon: FileEdit },
            { label: "Books on Hold", to: "hold", icon: PauseCircle },
            { label: "Users", to: "users", icon: Users },
            { label: "History", to: "history", icon: History },
            { label: "Account Settings", to: "account", icon: Settings },
        ];
    }

    if (role === "student") {
        return [
            { label: "Home", to: "", icon: Home },
            { label: "Browse Books", to: "browse", icon: BookOpen },
            { label: "Library", to: "library", icon: Library },
            { label: "Overdue", to: "overdue", icon: Clock },
            { label: "History", to: "history", icon: History },
            { label: "Account Settings", to: "account", icon: Settings },
        ];
    }

    if (role === "library") {
        return [
            { label: "Home", to: "", icon: Home },
            { label: "Browse Books", to: "browse", icon: BookOpen },
            { label: "Borrows", to: "borrows", icon: BookmarkCheck },
            { label: "Reserves", to: "reserves", icon: CalendarClock },
            { label: "Overdues", to: "overdue", icon: Clock },
            { label: "History", to: "history", icon: History },
            { label: "Account Settings", to: "account", icon: Settings },
        ];
    }

    return [];
}

function Sidebar({ role, username, onLogout }) {
    const options = getSidebarOptions(role);

    return (
        <aside className="dashboard-sidebar">
            <div>
                <div className="sidebar-brand">
                    <div className="brand-icon-wrapper">
                        <Library size={20} />
                    </div>
                    <div className="brand-info">
                        <span className="brand-title">Library Portal</span>
                        <span className="brand-badge">{role || "User"}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {options.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <NavLink
                                key={item.label}
                                to={item.to}
                                end={item.to === "" || item.to === "/"}
                                state={{ role, username }}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? "active" : ""}`
                                }
                            >
                                <IconComponent size={18} className="nav-icon" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            <div className="sidebar-footer">
                <div className="user-profile-bar">
                    <div className="user-avatar">
                        {(username || role || "U")[0]}
                    </div>
                    <div className="user-meta">
                        <span className="user-name">{username || "User"}</span>
                        <span className="user-role-label">{role}</span>
                    </div>
                </div>

                <button type="button" className="logout-btn" onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}

function MainContent({ role, username }) {
    return (
        <main className="dashboard-main">
            <div className="outlet-container">
                <Outlet context={{ role, username }} />
            </div>
        </main>
    );
}

function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    // Fallback to sessionStorage so page refresh or route changes never drop the session
    const [userRole, setUserRole] = useState(
        () => location.state?.role || sessionStorage.getItem("user_role") || ""
    );
    const [userVal, setUserVal] = useState(
        () => location.state?.username || sessionStorage.getItem("user_name") || ""
    );

    useEffect(() => {
        if (location.state?.role) {
            setUserRole(location.state.role);
            sessionStorage.setItem("user_role", location.state.role);
        }
        if (location.state?.username) {
            setUserVal(location.state.username);
            sessionStorage.setItem("user_name", location.state.username);
        }
    }, [location.state]);

    const handleAuthentication = async () => {
        const currentRole = location.state?.role || sessionStorage.getItem("user_role");
        if (!currentRole) {
            navigate("/login");
            return;
        }

        try {
            await api.get(`/api/${currentRole}/me`);
        } catch {
            sessionStorage.removeItem("user_role");
            sessionStorage.removeItem("user_name");
            navigate("/login");
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/api/auth/logout");
        } catch (err) {
            console.error("Logout failed", err);
        } finally {
            sessionStorage.removeItem("user_role");
            sessionStorage.removeItem("user_name");
            navigate("/login");
        }
    };

    useEffect(() => {
        handleAuthentication();
    }, []);

    return (
        <div className="dashboard-layout">
            <Sidebar role={userRole} username={userVal} onLogout={handleLogout} />
            <MainContent role={userRole} username={userVal} />
        </div>
    );
}

export default Dashboard;