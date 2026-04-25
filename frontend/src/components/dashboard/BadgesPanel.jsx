import styles from "../../pages/Dashboard.module.css";

function formatIconName(iconName) {
  return iconName
    .split("-")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function BadgesPanel({ badges, loading }) {
  return (
    <section className={styles.panel} id="badges">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrowDark}>Badges & Achievements</p>
          <h2>Proof milestones</h2>
        </div>
      </div>

      {loading ? (
        <div className={styles.badgeGrid}>
          <span className={styles.badgeSkeleton} />
          <span className={styles.badgeSkeleton} />
          <span className={styles.badgeSkeleton} />
        </div>
      ) : (
        <div className={styles.badgeGrid}>
          {badges.map((badge) => (
            <article
              className={`${styles.badgeCard} ${
                badge.is_earned ? styles.badgeEarned : styles.badgeLocked
              }`}
              key={badge.id}
            >
              <span className={styles.badgeIcon}>{formatIconName(badge.icon_name)}</span>
              <div>
                <strong>{badge.title}</strong>
                <p>{badge.requirement_text}</p>
                <small>{badge.is_earned ? "Earned" : "Locked"}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default BadgesPanel;
