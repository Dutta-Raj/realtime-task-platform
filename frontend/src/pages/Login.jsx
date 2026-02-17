import React, { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", res.data);

      // Save token and user data
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      localStorage.setItem("user", JSON.stringify(res.data));

      toast.success("Login Successful! 🎉");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);

    } catch (err) {
      console.log(err.response?.data);
      const errorMsg = err.response?.data?.message || "Login failed";
      toast.error(errorMsg);
      
      // Show demo credentials hint on error
      if (errorMsg.includes("Invalid") || errorMsg.includes("not found")) {
        toast(
          <div>
            <p>Try demo account:</p>
            <p className="font-mono text-sm">raj@gmail.com / 123456</p>
          </div>,
          { duration: 5000 }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("raj@gmail.com");
    setPassword("123456");
    toast.success("Demo credentials filled!");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            className="auth-button" 
            type="submit" 
            disabled={loading}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        {/* Demo Credentials Hint */}
        <div style={{ 
          marginTop: "15px", 
          padding: "10px", 
          background: "#f0f0f0", 
          borderRadius: "5px",
          fontSize: "14px"
        }}>
          <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Demo Credentials:</p>
          <p style={{ margin: "0", color: "#555" }}>
            Email: <strong>raj@gmail.com</strong> | Password: <strong>123456</strong>
          </p>
          <button
            onClick={fillDemoCredentials}
            style={{
              marginTop: "8px",
              padding: "5px 10px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Use Demo Account
          </button>
        </div>

        <p className="switch-text">
          Don't have account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}