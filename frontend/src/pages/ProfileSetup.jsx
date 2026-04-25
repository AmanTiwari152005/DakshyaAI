import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiError, profileApi } from "../services/api";
import styles from "./ProfileSetup.module.css";

const initialForm = {
  full_name: "",
  target_role: "",
  experience_level: "",
  education: "",
  current_status: "Student",
  college_or_company: "",
  location: "",
  short_bio: "",
};

const statuses = [
  "Student",
  "Developer",
  "Job Seeker",
  "Working Professional",
];

function ProfileSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const response = await profileApi.me();
        const profile = response.data.profile;
        if (isMounted && profile) {
          setForm((current) => ({
            ...current,
            full_name: profile.full_name || "",
            target_role: profile.target_role || "",
            experience_level: profile.experience_level || "",
            education: profile.education || "",
            current_status: profile.current_status || "Student",
            college_or_company: profile.college_or_company || "",
            location: profile.location || "",
            short_bio: profile.short_bio || "",
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiError(err, "Unable to load profile."));
        }
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
    setError("");
    setSaving(true);

    try {
      await profileApi.setup(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Unable to complete profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.header}>
          <Link className={styles.brand} to="/">
            DakshyaAI
          </Link>
          <p className={styles.eyebrow}>Profile setup</p>
          <h1>Complete your skill identity</h1>
          <p>
            These details help DakshyaAI create a useful employability profile.
          </p>
        </div>

        <form className={styles.form} onSubmit={submitProfile}>
          <label>
            Full name
            <input
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              placeholder="Your name"
              disabled={loading || saving}
              required
            />
          </label>

          <label>
            Target role
            <input
              value={form.target_role}
              onChange={(event) => updateField("target_role", event.target.value)}
              placeholder="Frontend Developer"
              disabled={loading || saving}
              required
            />
          </label>

          <label>
            Experience level
            <input
              value={form.experience_level}
              onChange={(event) =>
                updateField("experience_level", event.target.value)
              }
              placeholder="Beginner, Intermediate, Advanced"
              disabled={loading || saving}
              required
            />
          </label>

          <label>
            Education
            <input
              value={form.education}
              onChange={(event) => updateField("education", event.target.value)}
              placeholder="B.Tech Computer Science"
              disabled={loading || saving}
              required
            />
          </label>

          <label>
            Current status
            <select
              value={form.current_status}
              onChange={(event) =>
                updateField("current_status", event.target.value)
              }
              disabled={loading || saving}
              required
            >
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            College or company
            <input
              value={form.college_or_company}
              onChange={(event) =>
                updateField("college_or_company", event.target.value)
              }
              placeholder="College or workplace"
              disabled={loading || saving}
              required
            />
          </label>

          <label>
            Location
            <input
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="City, country"
              disabled={loading || saving}
              required
            />
          </label>

          <label className={styles.fullWidth}>
            Short bio
            <textarea
              value={form.short_bio}
              onChange={(event) => updateField("short_bio", event.target.value)}
              placeholder="A short summary of your skills and goals"
              disabled={loading || saving}
              rows="4"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ProfileSetup;
