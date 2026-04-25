import styles from "../../pages/ProfileDashboard.module.css";

const iconMap = {
  trophy: "🏆",
  award: "🥇",
  target: "🧪",
  "shield-check": "✅",
  "user-check": "🚀",
  briefcase: "💼",
};

function getBadgeIcon(badge) {
  if (!badge.is_earned) {
    return "🔒";
  }
  return iconMap[badge.icon_name] || "🏆";
}

function formatDate(value) {
  if (!value) {
    return "Locked";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function BadgesSection({ badges }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Badges</p>
          <h2>Achievements</h2>
        </div>
      </div>

      {badges.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No badges yet</strong>
          <p>Earned and locked achievements will appear here.</p>
        </div>
      ) : (
        <div className={styles.badgeGrid}>
          {badges.map((badge) => (
            <article
              className={`${styles.badgeCard} ${
                badge.is_earned ? styles.earnedBadge : styles.lockedBadge
              }`}
              key={badge.id}
            >
              <div className={styles.badgeIcon}>{getBadgeIcon(badge)}</div>
              <div>
                <strong>{badge.title}</strong>
                <p>{badge.requirement_text}</p>
                <small>
                  {badge.is_earned ? `Earned ${formatDate(badge.earned_at)}` : "Locked"}
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default BadgesSection;
