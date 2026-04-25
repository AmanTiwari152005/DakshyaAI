import styles from "../../pages/ProfileDashboard.module.css";

function ProfileCompletion({ completion, missingItems }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Profile Completion</p>
          <h2>{completion}% complete</h2>
        </div>
      </div>

      <div className={styles.progressTrack}>
        <span style={{ width: `${completion}%` }} />
      </div>

      <div className={styles.missingList}>
        {missingItems.length === 0 ? (
          <span className={styles.completePill}>Portfolio ready</span>
        ) : (
          missingItems.map((item) => (
            <span
              className={`${styles.missingPill} ${
                item.optional ? styles.optionalPill : ""
              }`}
              key={item.label}
            >
              {item.label}
              <small>{item.status}</small>
            </span>
          ))
        )}
      </div>
    </section>
  );
}

export default ProfileCompletion;
