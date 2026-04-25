import styles from "../../pages/Dashboard.module.css";

function RecruiterFeedback({ validations, loading }) {
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrowDark}>Recruiter Project Feedback</p>
          <h2>Peer validation</h2>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          <span />
          <span />
        </div>
      ) : validations.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No recruiter feedback yet</strong>
          <p>Apply to jobs and submit projects so recruiters can validate your work.</p>
        </div>
      ) : (
        <div className={styles.feedbackList}>
          {validations.map((validation) => (
            <article className={styles.feedbackItem} key={validation.id}>
              <div>
                <strong>{validation.project_title}</strong>
                <p>
                  {validation.recruiter_name} · {validation.company_name}
                </p>
              </div>
              {validation.upvote && (
                <span className={`${styles.statusTag} ${styles.statusVerified}`}>
                  Upvoted
                </span>
              )}
              <p>{validation.comment || "Recruiter validated this project."}</p>
              <small>{new Date(validation.created_at).toLocaleDateString()}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecruiterFeedback;
