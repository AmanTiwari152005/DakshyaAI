import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiError, recruiterApi } from "../services/api";
import styles from "./Recruiter.module.css";

function RecruiterApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await recruiterApi.applications();
      setApplications(response.data);
    } catch (err) {
      setError(getApiError(err, "Unable to load applications."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar}>
          <Link className={styles.brand} to="/recruiter-dashboard">
            DakshyaAI Recruiter
          </Link>
          <div className={styles.navActions}>
            <Link to="/recruiter-dashboard">Dashboard</Link>
            <Link to="/recruiter/jobs">Jobs</Link>
          </div>
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Applications</p>
            <h1>Review candidate proof</h1>
            <p>
              See Dakshya scores, skills, projects, badges, and resume links before
              validating project work.
            </p>
          </div>
          <div className={styles.scoreGrid}>
            <article className={styles.scoreCard}>
              <span>Total applications</span>
              <strong>{loading ? "--" : applications.length}</strong>
            </article>
            <article className={styles.scoreCard}>
              <span>Shortlisted</span>
              <strong>
                {loading
                  ? "--"
                  : applications.filter((item) => item.status === "shortlisted").length}
              </strong>
            </article>
          </div>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.card}>
          <p className={styles.eyebrowDark}>Candidate Pipeline</p>
          <h2>Applied candidates</h2>
          {loading ? (
            <div className={styles.empty}>Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className={styles.empty}>No applications received yet.</div>
          ) : (
            <div className={styles.list}>
              {applications.map((application) => (
                <article className={styles.item} key={application.id}>
                  <div className={styles.itemHeader}>
                    <div>
                      <h3>
                        {application.candidate_profile?.full_name ||
                          application.candidate_profile?.email}
                      </h3>
                      <p>
                        {application.candidate_profile?.target_role || "Candidate"} ·
                        Dakshya Score {application.dakshya_score}/100
                      </p>
                    </div>
                    <span className={styles.tag}>{application.status}</span>
                  </div>
                  <p>{application.job_title}</p>
                  <div className={styles.meta}>
                    {application.candidate_skills?.slice(0, 5).map((skill) => (
                      <span key={skill.id}>{skill.name}</span>
                    ))}
                    <span>{application.candidate_projects?.length || 0} projects</span>
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
    </main>
  );
}

export default RecruiterApplications;
