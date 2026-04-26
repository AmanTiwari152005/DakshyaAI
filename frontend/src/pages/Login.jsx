import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  authApi,
  getApiError,
  setAccountType,
  setAuthToken,
} from "../services/api";
import styles from "./Auth.module.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setAuthToken(response.data.token);
      setAccountType(response.data.account_type);
      navigate(response.data.redirect_url || "/dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Unable to login."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.authCard}>
        <Link className={styles.brand} to="/">
          DakshyaAI
        </Link>
        <p className={styles.eyebrow}>Welcome back</p>
        <h1>Login with password</h1>
        <p className={styles.subtitle}>
          Use your verified email and password to access your DakshyaAI workspace.
        </p>

        <form className={styles.form} onSubmit={submitLogin}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              disabled={loading}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className={styles.switchText}>
          New to DakshyaAI? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
