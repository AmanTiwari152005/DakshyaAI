import styles from "../../pages/ProfileDashboard.module.css";

function formatDate(value) {
  if (!value) {
    return "Not attempted";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function AssessmentsPanel({ assessments }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Assessments / Tests</p>
          <h2>Validation history</h2>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No attempted tests yet</strong>
          <p>Attempted quiz tests and validation history will appear here.</p>
        </div>
      ) : (
        <div className={styles.assessmentList}>
          {assessments.map((attempt) => (
            <article className={styles.assessmentCard} key={attempt.id}>
              <div>
                <strong>{attempt.test_title}</strong>
                <span>{attempt.skill_name}</span>
              </div>
              <div>
                <strong>{attempt.score}%</strong>
                <span>{formatDate(attempt.created_at)}</span>
              </div>
              <button type="button">Retry</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AssessmentsPanel;
