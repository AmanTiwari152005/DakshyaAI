import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiError, recruiterApi } from "../services/api";
import styles from "./Recruiter.module.css";

const initialForm = {
  recruiter_name: "",
  company_name: "",
  designation: "",
  company_website: "",
  location: "",
};

function RecruiterProfileSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const response = await recruiterApi.getProfile();
        const profile = response.data.profile;
        if (isMounted && profile) {
          setForm({
            recruiter_name: profile.recruiter_name || "",
            company_name: profile.company_name || "",
            designation: profile.designation || "",
            company_website: profile.company_website || "",
            location: profile.location || "",
          });
        }
      } catch (err) {
        // A newly verified recruiter may not have a filled profile yet.
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await recruiterApi.saveProfile(form);
      navigate("/recruiter-dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Unable to complete recruiter profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <Link className={styles.brand} to="/">
            DakshyaAI
          </Link>
          <p className={styles.eyebrowDark}>Recruiter profile setup</p>
          <h2>Complete your company identity</h2>
          <p>
            These details help candidates understand who is validating and hiring.
          </p>

          <form className={styles.form} onSubmit={submitProfile}>
            <label>
              Recruiter name
              <input
                value={form.recruiter_name}
                onChange={(event) =>
                  updateField("recruiter_name", event.target.value)
                }
                disabled={loading || saving}
                required
              />
            </label>
            <label>
              Company name
              <input
                value={form.company_name}
                onChange={(event) => updateField("company_name", event.target.value)}
                disabled={loading || saving}
                required
              />
            </label>
            <label>
              Designation
              <input
                value={form.designation}
                onChange={(event) => updateField("designation", event.target.value)}
                disabled={loading || saving}
                required
              />
            </label>
            <label>
              Company website
              <input
                type="url"
                value={form.company_website}
                onChange={(event) =>
                  updateField("company_website", event.target.value)
                }
                disabled={loading || saving}
                required
              />
            </label>
            <label className={styles.fullWidth}>
              Location
              <input
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                disabled={loading || saving}
                required
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.primaryButton} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Complete Recruiter Profile"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default RecruiterProfileSetup;
