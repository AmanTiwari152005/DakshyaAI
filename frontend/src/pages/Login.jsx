import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, getApiError, setAuthToken } from "../services/api";
import styles from "./Auth.module.css";

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.requestOtp({
        email,
        purpose: "login",
      });
      setDevOtp(response.data.otp);
      setStep("otp");
    } catch (err) {
      setError(getApiError(err, "Unable to send OTP."));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.verifyOtp({
        email,
        otp,
        purpose: "login",
      });
      setAuthToken(response.data.token);
      navigate(response.data.profile_complete ? "/dashboard" : "/profile-setup", {
        replace: true,
      });
    } catch (err) {
      setError(getApiError(err, "Unable to verify OTP."));
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
        <h1>Login with email OTP</h1>
        <p className={styles.subtitle}>
          Access your verified skill profile and continue your assessment.
        </p>

        <form
          className={styles.form}
          onSubmit={step === "email" ? requestOtp : verifyOtp}
        >
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={step === "otp" || loading}
              required
            />
          </label>

          {step === "otp" && (
            <label>
              Enter OTP
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
          )}

          {devOtp && (
            <p className={styles.devOtp}>
              Dev OTP: <strong>{devOtp}</strong>
            </p>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "Please wait..." : step === "email" ? "Send OTP" : "Verify OTP"}
          </button>
        </form>

        {step === "otp" && (
          <button
            className={styles.textButton}
            type="button"
            onClick={() => {
              setOtp("");
              setStep("email");
            }}
          >
            Change email
          </button>
        )}

        <p className={styles.switchText}>
          New to DakshyaAI? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
