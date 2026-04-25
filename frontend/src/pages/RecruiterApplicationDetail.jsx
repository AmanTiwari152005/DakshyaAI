import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiError, recruiterApi } from "../services/api";
import styles from "./Recruiter.module.css";

function RecruiterApplicationDetail() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [validationForms, setValidationForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingProjectId, setSavingProjectId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApplication = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await recruiterApi.applicationDetail(id);
      setApplication(response.data);
    } catch (err) {
      setError(getApiError(err, "Unable to load application."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const updateValidation = (projectId, field, value) => {
    setValidationForms((current) => ({
      ...current,
      [projectId]: {
        upvote: true,
        comment: "",
        ...current[projectId],
        [field]: value,
      },
    }));
  };

  const submitValidation = async (project) => {
    const form = validationForms[project.id] || { upvote: true, comment: "" };
    setSavingProjectId(project.id);
    setError("");
    setNotice("");

    try {
      await recruiterApi.validateProject({
        candidate_id: application.candidate_id,
        project_id: project.id,
        application_id: application.id,
        upvote: Boolean(form.upvote),
        comment: form.comment || "",
      });
      setNotice("Project validation saved and reflected on the candidate profile.");
      await loadApplication();
    } catch (err) {
      setError(getApiError(err, "Unable to save project validation."));
    } finally {
      setSavingProjectId(null);
    }
  };

  const profile = application?.candidate_profile;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar}>
          <Link className={styles.brand} to="/recruiter-dashboard">
            DakshyaAI Recruiter
          </Link>
          <div className={styles.navActions}>
            <Link to="/recruiter/applications">Applications</Link>
            <Link to="/recruiter/jobs">Jobs</Link>
          </div>
        </nav>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}

        {loading ? (
          <section className={styles.card}>Loading candidate profile...</section>
        ) : !application ? (
          <section className={styles.card}>Application not found.</section>
        ) : (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>Candidate Review</p>
                <h1>{profile?.full_name || profile?.email}</h1>
                <p>
                  {profile?.target_role || "Candidate"} · {profile?.location || "Location not added"}
                </p>
                <p>{profile?.short_bio || "No bio added yet."}</p>
              </div>
              <div className={styles.scoreGrid}>
                <article className={styles.scoreCard}>
                  <span>Dakshya Score</span>
                  <strong>{application.dakshya_score}</strong>
                </article>
                <article className={styles.scoreCard}>
                  <span>Projects</span>
                  <strong>{application.candidate_projects?.length || 0}</strong>
                </article>
              </div>
            </section>

            <div className={styles.candidateLayout}>
              <aside className={styles.profileStack}>
                <section className={styles.card}>
                  <p className={styles.eyebrowDark}>Application</p>
                  <h2>{application.job_title}</h2>
                  <p>{application.cover_note || "No cover note added."}</p>
                  <div className={styles.meta}>
                    <span>{application.status}</span>
                    <span>{application.role}</span>
                  </div>
                </section>

                <section className={styles.card}>
                  <p className={styles.eyebrowDark}>Skills</p>
                  <div className={styles.meta}>
                    {application.candidate_skills?.map((skill) => (
                      <span key={skill.id}>
                        {skill.name} · {skill.progress_score}%
                      </span>
                    ))}
                  </div>
                </section>

                <section className={styles.card}>
                  <p className={styles.eyebrowDark}>Badges</p>
                  <div className={styles.meta}>
                    {application.candidate_badges?.length ? (
                      application.candidate_badges.map((badge) => (
                        <span key={badge.id}>{badge.title}</span>
                      ))
                    ) : (
                      <span>No earned badges yet</span>
                    )}
                  </div>
                </section>

                <section className={styles.card}>
                  <p className={styles.eyebrowDark}>Resume</p>
                  {application.resume_url ? (
                    <a
                      className={styles.primaryButton}
                      href={application.resume_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Resume
                    </a>
                  ) : (
                    <p>No resume uploaded.</p>
                  )}
                </section>
              </aside>

              <section className={styles.card}>
                <p className={styles.eyebrowDark}>Projects</p>
                <h2>Validate candidate work</h2>
                <div className={styles.list}>
                  {application.candidate_projects?.map((project) => {
                    const form = validationForms[project.id] || {
                      upvote: true,
                      comment: "",
                    };
                    return (
                      <article className={styles.item} key={project.id}>
                        <div className={styles.itemHeader}>
                          <div>
                            <h3>{project.title}</h3>
                            <p>{project.description || "No description added."}</p>
                          </div>
                          <span className={styles.tagGreen}>
                            {project.upvote_count || 0} upvotes
                          </span>
                        </div>
                        <div className={styles.meta}>
                          <span>{project.tech_stack}</span>
                          <span>{project.verification_status_label}</span>
                        </div>
                        <div className={styles.actions}>
                          {project.live_link && (
                            <a
                              className={styles.secondaryButton}
                              href={project.live_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Live
                            </a>
                          )}
                          {project.proof_link && (
                            <a
                              className={styles.secondaryButton}
                              href={project.proof_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Proof
                            </a>
                          )}
                        </div>
                        <div className={styles.validationForm}>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={form.upvote}
                              onChange={(event) =>
                                updateValidation(
                                  project.id,
                                  "upvote",
                                  event.target.checked
                                )
                              }
                            />
                            Upvote this project
                          </label>
                          <label>
                            Comment
                            <textarea
                              value={form.comment}
                              onChange={(event) =>
                                updateValidation(project.id, "comment", event.target.value)
                              }
                              placeholder="Strong project with clear frontend implementation."
                            />
                          </label>
                          <button
                            className={styles.primaryButton}
                            type="button"
                            onClick={() => submitValidation(project)}
                            disabled={savingProjectId === project.id}
                          >
                            {savingProjectId === project.id
                              ? "Saving..."
                              : "Submit Validation"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default RecruiterApplicationDetail;
