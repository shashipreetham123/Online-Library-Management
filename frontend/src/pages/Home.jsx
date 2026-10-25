import { useNavigate, useOutletContext } from "react-router-dom";
import {
  BookOpen,
  Library,
  Clock,
  History,
  Settings,
  PlusCircle,
  FileEdit,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  PauseCircle,
} from "lucide-react";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const context = useOutletContext() || {};

  const role = (context.role || sessionStorage.getItem("user_role") || "student").toLowerCase();
  const username = context.username || sessionStorage.getItem("user_name") || "User";

  // Provide quick action cards tailored to user role
  const getActionCards = () => {
    if (role === "admin") {
      return [
        {
          title: "Browse Catalog",
          description: "Explore the library collection, filter by category or status.",
          icon: BookOpen,
          color: "indigo",
          to: "/dashboard/browse",
        },
        {
          title: "Add Book",
          description: "Catalog new titles, assign inventory copies and details.",
          icon: PlusCircle,
          color: "emerald",
          to: "/dashboard/add-book",
        },
        {
          title: "Edit Book",
          description: "Modify existing book metadata or manage book availability.",
          icon: FileEdit,
          color: "amber",
          to: "/dashboard/edit-book",
        },
        {
          title: "Books on Hold",
          description: "Review quarantined or held titles and release holds to circulation.",
          icon: PauseCircle,
          color: "rose",
          to: "/dashboard/hold",
        },
        {
          title: "User Accounts",
          description: "Manage registered student, librarian, and admin accounts.",
          icon: Users,
          color: "purple",
          to: "/dashboard/users",
        },
        {
          title: "Audit History",
          description: "Review system transaction logs and user borrowing activity.",
          icon: History,
          color: "cyan",
          to: "/dashboard/history",
        },
        {
          title: "Account Settings",
          description: "Manage your credentials and change your portal password.",
          icon: Settings,
          color: "rose",
          to: "/dashboard/account",
        },
      ];
    }

    if (role === "library") {
      return [
        {
          title: "Browse Books",
          description: "Search and view books in the library collection.",
          icon: BookOpen,
          color: "indigo",
          to: "/dashboard/browse",
        },
        {
          title: "Circulation Borrows",
          description: "Manage active borrows, verify PINs, and issue books.",
          icon: Library,
          color: "emerald",
          to: "/dashboard/borrows",
        },
        {
          title: "Reserves",
          description: "Check held copies awaiting student pickup.",
          icon: Layers,
          color: "amber",
          to: "/dashboard/reserves",
        },
        {
          title: "Overdues",
          description: "Track late book returns and calculate overdue fines.",
          icon: Clock,
          color: "rose",
          to: "/dashboard/overdue",
        },
        {
          title: "History",
          description: "View library circulation records and event audits.",
          icon: History,
          color: "cyan",
          to: "/dashboard/history",
        },
        {
          title: "Account Settings",
          description: "Update personal security settings and change password.",
          icon: Settings,
          color: "purple",
          to: "/dashboard/account",
        },
      ];
    }

    // Student default
    return [
      {
        title: "Browse Books",
        description: "Search books, view descriptions, and borrow or request copies.",
        icon: BookOpen,
        color: "indigo",
        to: "/dashboard/browse",
      },
      {
        title: "My Library",
        description: "Check your active requests, reserved books, and current borrows.",
        icon: Library,
        color: "emerald",
        to: "/dashboard/library",
      },
      {
        title: "Overdue Items",
        description: "View overdue books and check accumulated fine balances.",
        icon: Clock,
        color: "rose",
        to: "/dashboard/overdue",
      },
      {
        title: "Activity History",
        description: "Review past requests, borrows, and book return timestamps.",
        icon: History,
        color: "cyan",
        to: "/dashboard/history",
      },
      {
        title: "Account Settings",
        description: "Update your profile credentials and change password.",
        icon: Settings,
        color: "purple",
        to: "/dashboard/account",
      },
    ];
  };

  const actionCards = getActionCards();

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="home-container">
      {/* Hero Welcome Card */}
      <div className="home-hero-card">
        <div className="home-hero-content">
          <div className="hero-role-pill">
            <Sparkles size={14} />
            <span>{role} Portal</span>
          </div>

          <h1 className="hero-title">
            Welcome back, <span>{username}</span>!
          </h1>

          <p className="hero-description">
            Access your library services, explore catalog titles, and manage circulation
            records all from your central dashboard.
          </p>

          <div className="hero-meta-row">
            <div className="hero-meta-item">
              <Calendar size={15} />
              <span>{formattedDate}</span>
            </div>
            <div className="hero-meta-item">
              <Shield size={15} />
              <span style={{ textTransform: "capitalize" }}>Role: {role}</span>
            </div>
          </div>
        </div>

        <div className="hero-bg-shapes">
          <BookOpen size={240} />
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <div className="section-heading-row">
          <div>
            <h2>Quick Navigation</h2>
            <p>Select a workspace feature to get started</p>
          </div>
        </div>

        <div className="quick-actions-grid">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                className="action-tile-btn"
                onClick={() => navigate(card.to)}
              >
                <div className={`tile-icon-box ${card.color}`}>
                  <Icon size={24} />
                </div>
                <div className="tile-content">
                  <span className="tile-title">{card.title}</span>
                  <span className="tile-description">{card.description}</span>
                </div>
                <span className="tile-arrow">
                  <span>Open</span>
                  <ArrowRight size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Info Banner */}
      <div className="home-info-banner">
        <div className="banner-left">
          <div className="banner-icon-badge">
            <Settings size={22} />
          </div>
          <div className="banner-text">
            <h4>Security & Preferences</h4>
            <p>Ensure your account stays protected by keeping your password updated.</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-banner-action"
          onClick={() => navigate("/dashboard/account")}
        >
          <span>Account Settings</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
