import styles from "../../pages/ProfileDashboard.module.css";

const badgeIcons = {
  skill_verified: "🏆",
  recruiter_ready: "🥇",
  test_starter: "🧪",
  project_pro: "🚀",
  profile_builder: "🚀",
  peer_verified: "👥",
};

function fallbackIcon(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("skill")) return "🏆";
  if (lowerTitle.includes("performer") || lowerTitle.includes("ready")) return "🥇";
  if (lowerTitle.includes("test")) return "🧪";
  if (lowerTitle.includes("peer")) return "👥";
  return "🚀";
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

      <div className={styles.badgeGrid}>
        {badges.map((badge) => {
          const icon = badge.is_earned
            ? badgeIcons[badge.badge_type] || fallbackIcon(badge.title)
            : "🔒";

          return (
            <article
              className={`${styles.badgeCard} ${
                badge.is_earned ? styles.earnedBadge : styles.lockedBadge
              }`}
              key={badge.id}
            >
              <span className={styles.badgeIcon}>{icon}</span>
              <div>
                <strong>{badge.title}</strong>
                <p>{badge.skill_name || badge.requirement_text}</p>
                <small>
                  {badge.is_earned
                    ? `Earned ${formatDate(badge.earned_at)}`
                    : badge.requirement_text}
                </small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default BadgesSection;
