import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, LogIn } from "lucide-react";
import api from "../services/api";
import "./Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password.trim()) {
            setError("Please enter both username and password");
            return;
        }

        setLoading(true);

        try {
            // 1. Send the Username and Password to /api/auth/login as a POST Request
            // 2. The Response is returned as { message: ... , data: {username: ... , role: ...} }
            const res = await api.post("/api/auth/login", {
                username: username.trim(),
                password,
            });

            const role = res?.data?.role;

            if (role) {
                navigate("/dashboard", { state: { role, username: res?.data?.username } });
            } else {
                setError("Role not specified in server response.");
            }
        } catch (err) {
            setError(err?.message || "Failed to log in. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-badge">
                        <ShieldCheck size={14} />
                        <span>Portal Access</span>
                    </div>
                    <h2>Welcome Back</h2>
                    <p>Please enter your credentials to log in</p>
                </div>

                {error && (
                    <div className="login-error" role="alert">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="input-toggle-btn"
                                onClick={() => setShowPassword((prev) => !prev)}
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="spinner" />
                                <span>Logging in...</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                <span>Log In</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
