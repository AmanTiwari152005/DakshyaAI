import { useState } from "react";
import styles from "../../pages/Dashboard.module.css";

function RecommendedJobs({ jobs, applications, loading, applyingId, onApply }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverNote, setCoverNote] = useState("");
  const appliedJobIds = new Set(applications.map((application) => application.job));

  const openApplyModal = (job) => {
    setSelectedJob(job);
    setCoverNote("");
  };

  const closeApplyModal = () => {
    setSelectedJob(null);
    setCoverNote("");
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!selectedJob) {
      return;
    }
    await onApply(selectedJob.id, coverNote);
    closeApplyModal();
  };

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrowDark}>Recommended Jobs</p>
          <h2>Matched opportunities</h2>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          <span />
          <span />
        </div>
      ) : jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No job matches yet</strong>
          <p>Add skills and a target role so DakshyaAI can recommend better jobs.</p>
        </div>
      ) : (
        <div className={styles.jobList}>
          {jobs.map((job) => {
            const hasApplied = job.has_applied || appliedJobIds.has(job.id);
            return (
              <article className={styles.jobCard} key={job.id}>
                <div className={styles.projectTopline}>
                  <div>
                    <h3>{job.title}</h3>
                    <p>{job.company_name || "Recruiter"} · {job.role}</p>
                  </div>
                  <span className={`${styles.statusTag} ${styles.statusReview}`}>
                    {job.job_type}
                  </span>
                </div>
                <p>{job.description}</p>
                <div className={styles.jobMeta}>
                  <span>{job.required_skills}</span>
                  <span>{job.location || "Remote / Flexible"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openApplyModal(job)}
                  disabled={hasApplied || applyingId === job.id}
                >
                  {hasApplied ? "Applied" : applyingId === job.id ? "Applying..." : "Apply"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div className={styles.inlineModal} role="dialog" aria-label="Apply to job">
          <form className={styles.inlineModalCard} onSubmit={submitApplication}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrowDark}>Apply</p>
                <h2>{selectedJob.title}</h2>
              </div>
              <button type="button" onClick={closeApplyModal}>
                Close
              </button>
            </div>
            <label>
              Cover note
              <textarea
                value={coverNote}
                onChange={(event) => setCoverNote(event.target.value)}
                rows="4"
                placeholder="A short note for the recruiter"
              />
            </label>
            <button className={styles.primaryButton} type="submit">
              Submit Application
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default RecommendedJobs;
