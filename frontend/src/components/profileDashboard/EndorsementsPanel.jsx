import styles from "../../pages/ProfileDashboard.module.css";

function EndorsementsPanel({ endorsements }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Endorsements / Reviews</p>
          <h2>Peer signal</h2>
        </div>
      </div>

      <div className={styles.verifiedByMentor}>
        <span>Verified by mentor</span>
        <strong>{endorsements.length > 0 ? "Active" : "Pending"}</strong>
      </div>

      {endorsements.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No endorsements yet</strong>
          <p>Peer reviews and mentor feedback will appear here once approved.</p>
        </div>
      ) : (
        <div className={styles.endorsementList}>
          {endorsements.map((endorsement) => (
            <article className={styles.endorsementCard} key={endorsement.id}>
              <div>
                <strong>{endorsement.reviewer_name}</strong>
                <span>
                  {endorsement.reviewer_role || "Reviewer"} -{" "}
                  {endorsement.relationship || "Peer"}
                </span>
              </div>
              <p>{endorsement.comment || "No written comment provided."}</p>
              <small>
                Rating {endorsement.rating}/5
                {endorsement.skill_name ? ` - ${endorsement.skill_name}` : ""}
                {endorsement.project_title ? ` - ${endorsement.project_title}` : ""}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default EndorsementsPanel;
