import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  authApi,
  getApiError,
  setAccountType,
  setAuthToken,
} from "../services/api";
import styles from "./Auth.module.css";

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [accountType, setAccountTypeValue] = useState("candidate");
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
        purpose: "register",
        accountType,
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
        purpose: "register",
        accountType,
      });
      setAuthToken(response.data.token);
      const verifiedAccountType = response.data.account_type || accountType;
      setAccountType(verifiedAccountType);
      if (verifiedAccountType === "recruiter") {
        navigate("/recruiter-dashboard", { replace: true });
        return;
      }
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
        <p className={styles.eyebrow}>Get started</p>
        <h1>Create your account</h1>
        <p className={styles.subtitle}>
          Verify your email, then complete your employability profile.
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

          {step === "email" && (
            <label>
              Account type
              <select
                value={accountType}
                onChange={(event) => setAccountTypeValue(event.target.value)}
                disabled={loading}
                required
              >
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </label>
          )}

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
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
