import styles from "../../pages/Dashboard.module.css";

const statItems = [
  { key: "total_skills", label: "Total Skills Added" },
  { key: "verified_skills", label: "Verified Skills" },
  { key: "projects_uploaded", label: "Projects Uploaded" },
  { key: "badges_earned", label: "Badges Earned" },
  { key: "pending_verifications", label: "Pending Verifications" },
  { key: "project_upvotes", label: "Project Upvotes" },
];

function StatsCards({ stats, loading }) {
  return (
    <section className={styles.statsGrid} aria-label="Dashboard stats">
      {statItems.map((item) => (
        <article className={styles.statCard} key={item.key}>
          <span>{item.label}</span>
          <strong>{loading ? "--" : stats?.[item.key] ?? 0}</strong>
        </article>
      ))}
    </section>
  );
}

export default StatsCards;
