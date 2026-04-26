import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, getApiError } from "../services/api";
import styles from "./Auth.module.css";

const PENDING_EMAIL_KEY = "dakshyaai_pending_signup_email";
const PENDING_ACCOUNT_TYPE_KEY = "dakshyaai_pending_signup_account_type";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "candidate",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitSignup = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.signup(form);
      localStorage.setItem(PENDING_EMAIL_KEY, response.data.email);
      localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, response.data.account_type);
      navigate("/verify-otp", {
        state: {
          email: response.data.email,
          accountType: response.data.account_type,
        },
      });
    } catch (err) {
      setError(getApiError(err, "Unable to create account."));
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
        <p className={styles.eyebrow}>Create account</p>
        <h1>Signup with email verification</h1>
        <p className={styles.subtitle}>
          Choose your account type, set a password, then verify your email with OTP.
        </p>

        <form className={styles.form} onSubmit={submitSignup}>
          <div className={styles.accountTypeGrid}>
            <button
              className={
                form.accountType === "candidate"
                  ? styles.accountTypeActive
                  : styles.accountTypeCard
              }
              type="button"
              onClick={() => updateField("accountType", "candidate")}
            >
              <strong>Candidate</strong>
              <span>Build proof and apply to jobs</span>
            </button>
            <button
              className={
                form.accountType === "recruiter"
                  ? styles.accountTypeActive
                  : styles.accountTypeCard
              }
              type="button"
              onClick={() => updateField("accountType", "recruiter")}
            >
              <strong>Recruiter</strong>
              <span>Post jobs and validate projects</span>
            </button>
          </div>

          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Minimum 8 characters"
              minLength="8"
              disabled={loading}
              required
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
              placeholder="Re-enter password"
              minLength="8"
              disabled={loading}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        <p className={styles.switchText}>
          Already verified? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
