import styles from "../../pages/ProfileDashboard.module.css";

function EndorsementsPanel({ endorsements }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Endorsements</p>
          <h2>Reviews</h2>
        </div>
      </div>

      <div className={styles.verifiedByMentor}>
        <strong>Verified by mentor</strong>
        <span>Ready</span>
      </div>

      {endorsements.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No peer endorsements yet</strong>
          <p>Mentor reviews, peer comments, and feedback will appear here.</p>
        </div>
      ) : (
        <div className={styles.endorsementList}>
          {endorsements.map((endorsement) => (
            <article className={styles.endorsementCard} key={endorsement.id}>
              <strong>{endorsement.reviewer_name}</strong>
              <span>
                {endorsement.reviewer_role || "Peer"} ·{" "}
                {endorsement.relationship || "Reviewer"}
              </span>
              <p>{endorsement.comment || "No comment added."}</p>
              <small>
                Rating {endorsement.rating}/5
                {endorsement.skill_name ? ` · ${endorsement.skill_name}` : ""}
                {endorsement.project_title ? ` · ${endorsement.project_title}` : ""}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default EndorsementsPanel;
