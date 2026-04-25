import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  clearAuthToken,
  getApiError,
  recruiterApi,
} from "../services/api";
import styles from "./Recruiter.module.css";

const initialProfile = {
  company_name: "",
  recruiter_name: "",
  designation: "",
  company_website: "",
  location: "",
};

function RecruiterDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadRecruiter = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileResult, jobsResult, applicationsResult] = await Promise.allSettled([
        recruiterApi.getProfile(),
        recruiterApi.jobs(),
        recruiterApi.applications(),
      ]);

      if (profileResult.status === "fulfilled") {
        const nextProfile = profileResult.value.data.profile;
        setProfile(nextProfile);
        setProfileForm({
          company_name: nextProfile.company_name || "",
          recruiter_name: nextProfile.recruiter_name || "",
          designation: nextProfile.designation || "",
          company_website: nextProfile.company_website || "",
          location: nextProfile.location || "",
        });
      }

      if (jobsResult.status === "fulfilled") {
        setJobs(jobsResult.value.data);
      }

      if (applicationsResult.status === "fulfilled") {
        setApplications(applicationsResult.value.data);
      }
    } catch (err) {
      setError(getApiError(err, "Unable to load recruiter dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecruiter();
  }, [loadRecruiter]);

  const stats = useMemo(() => {
    const activeJobs = jobs.filter((job) => job.is_active).length;
    const shortlisted = applications.filter(
      (application) => application.status === "shortlisted"
    ).length;
    return {
      totalJobs: jobs.length,
      totalApplications: applications.length,
      activeJobs,
      shortlisted,
    };
  }, [applications, jobs]);

  const updateProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await recruiterApi.saveProfile(profileForm);
      setProfile(response.data.profile);
      await loadRecruiter();
    } catch (err) {
      setError(getApiError(err, "Unable to save recruiter profile."));
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    navigate("/", { replace: true });
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar}>
          <Link className={styles.brand} to="/">
            DakshyaAI
          </Link>
          <div className={styles.navActions}>
            <Link to="/recruiter/jobs">Jobs</Link>
            <Link to="/recruiter/applications">Applications</Link>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Recruiter Dashboard</p>
            <h1>
              {loading
                ? "Loading recruiter workspace..."
                : `Welcome, ${profile?.recruiter_name || "recruiter"}`}
            </h1>
            <p>
              Post roles, review DakshyaAI candidate proof, and validate projects
              with recruiter feedback.
            </p>
          </div>
          <div className={styles.scoreGrid}>
            <article className={styles.scoreCard}>
              <span>Total jobs</span>
              <strong>{loading ? "--" : stats.totalJobs}</strong>
            </article>
            <article className={styles.scoreCard}>
              <span>Applications</span>
              <strong>{loading ? "--" : stats.totalApplications}</strong>
            </article>
          </div>
        </section>

        <section className={styles.statsGrid}>
          <article className={styles.card}>
            <p className={styles.eyebrowDark}>Active Jobs</p>
            <h2>{stats.activeJobs}</h2>
          </article>
          <article className={styles.card}>
            <p className={styles.eyebrowDark}>Shortlisted</p>
            <h2>{stats.shortlisted}</h2>
          </article>
          <article className={styles.card}>
            <p className={styles.eyebrowDark}>Company</p>
            <h2>{profile?.company_name || "Setup needed"}</h2>
          </article>
          <article className={styles.card}>
            <p className={styles.eyebrowDark}>Location</p>
            <h2>{profile?.location || "Not added"}</h2>
          </article>
        </section>

        {!profile && (
          <p className={styles.notice}>
            Complete your recruiter profile before posting jobs.
          </p>
        )}

        <div className={styles.grid}>
          <section className={styles.formCard}>
            <p className={styles.eyebrowDark}>Recruiter Profile</p>
            <h2>{profile ? "Update recruiter details" : "Setup recruiter details"}</h2>
            <form className={styles.form} onSubmit={saveProfile}>
              <label>
                Company name
                <input
                  value={profileForm.company_name}
                  onChange={(event) =>
                    updateProfileField("company_name", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Recruiter name
                <input
                  value={profileForm.recruiter_name}
                  onChange={(event) =>
                    updateProfileField("recruiter_name", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Designation
                <input
                  value={profileForm.designation}
                  onChange={(event) =>
                    updateProfileField("designation", event.target.value)
                  }
                />
              </label>
              <label>
                Company website
                <input
                  type="url"
                  value={profileForm.company_website}
                  onChange={(event) =>
                    updateProfileField("company_website", event.target.value)
                  }
                />
              </label>
              <label className={styles.fullWidth}>
                Location
                <input
                  value={profileForm.location}
                  onChange={(event) =>
                    updateProfileField("location", event.target.value)
                  }
                />
              </label>
              <button className={styles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Recruiter Profile"}
              </button>
            </form>
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrowDark}>Recent Applications</p>
            <h2>Candidate pipeline</h2>
            {applications.length === 0 ? (
              <div className={styles.empty}>No applications yet.</div>
            ) : (
              <div className={styles.list}>
                {applications.slice(0, 5).map((application) => (
                  <article className={styles.item} key={application.id}>
                    <div className={styles.itemHeader}>
                      <div>
                        <h3>
                          {application.candidate_profile?.full_name ||
                            application.candidate_profile?.email}
                        </h3>
                        <p>{application.job_title}</p>
                      </div>
                      <span className={styles.tag}>{application.status}</span>
                    </div>
                    <Link
                      className={styles.primaryButton}
                      to={`/recruiter/applications/${application.id}`}
                    >
                      View Profile
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default RecruiterDashboard;
