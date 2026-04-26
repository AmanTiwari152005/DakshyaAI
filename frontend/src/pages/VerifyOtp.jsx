import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  authApi,
  getApiError,
  setAccountType,
  setAuthToken,
} from "../services/api";
import styles from "./Auth.module.css";

const PENDING_EMAIL_KEY = "dakshyaai_pending_signup_email";
const PENDING_ACCOUNT_TYPE_KEY = "dakshyaai_pending_signup_account_type";

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(
    location.state?.email || localStorage.getItem(PENDING_EMAIL_KEY) || ""
  );
  const [accountType, setLocalAccountType] = useState(
    location.state?.accountType ||
      localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) ||
      "candidate"
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!email) {
      setError("Please register first so we know which email to verify.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await authApi.verifySignupOtp({ email, otp });
      setAuthToken(response.data.token);
      setAccountType(response.data.account_type);
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
      navigate(response.data.redirect_url || "/profile-setup", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Unable to verify OTP."));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email) {
      setError("Please register first so we know which email to verify.");
      return;
    }

    setError("");
    setNotice("");
    setResending(true);

    try {
      const response = await authApi.resendOtp({ email });
      setLocalAccountType(response.data.account_type || accountType);
      setNotice("A fresh OTP has been sent to your email.");
    } catch (err) {
      setError(getApiError(err, "Unable to resend OTP."));
    } finally {
      setResending(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.authCard}>
        <Link className={styles.brand} to="/">
          DakshyaAI
        </Link>
        <p className={styles.eyebrow}>Email verification</p>
        <h1>Enter your signup OTP</h1>
        <p className={styles.subtitle}>
          We sent a 6-digit code to <strong>{email || "your email"}</strong>.
        </p>

        <form className={styles.form} onSubmit={verifyOtp}>
          <label>
            OTP
            <input
              className={styles.otpInput}
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="6-digit OTP"
              maxLength="6"
              disabled={loading}
              required
            />
          </label>

          {notice && <p className={styles.notice}>{notice}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button
          className={styles.textButton}
          type="button"
          onClick={resendOtp}
          disabled={resending}
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>

        <p className={styles.switchText}>
          Wrong email or account type? <Link to="/register">Start again</Link>
        </p>
      </section>
    </main>
  );
}

export default VerifyOtp;
