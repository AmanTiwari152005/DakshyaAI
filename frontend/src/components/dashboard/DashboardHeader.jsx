import { Link } from "react-router-dom";
import styles from "../../pages/Dashboard.module.css";

function DashboardHeader({
  summary,
  loading,
  onAddProject,
  onAddSkill,
  onLogout,
}) {
  const fullName = summary?.full_name || "there";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <nav className={styles.topbar}>
        <Link className={styles.brand} to="/">
          DakshyaAI
        </Link>

        <div className={styles.topbarActions}>
          <Link
            className={styles.avatarLink}
            to="/profile-dashboard"
            aria-label="Open profile dashboard"
          >
            {initials || "DA"}
          </Link>
          <button className={styles.logoutButton} type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <section className={styles.dashboardHero}>
        <div>
          <p className={styles.eyebrow}>Dashboard</p>
          <h1>{loading ? "Loading your dashboard..." : `Welcome back, ${fullName}`}</h1>
          <p>
            Track verified skills, project proof, badges, and recruiter-ready
            progress from one clean workspace.
          </p>
        </div>

        <div className={styles.scoreGrid}>
          <article className={styles.scoreCard}>
            <span>Employability Score</span>
            <strong>{loading ? "--" : summary?.employability_score ?? 0}</strong>
            <small>/100</small>
          </article>
          <article className={styles.scoreCard}>
            <span>Profile Completion</span>
            <strong>
              {loading ? "--" : summary?.profile_completion_percentage ?? 0}
            </strong>
            <small>%</small>
          </article>
        </div>

        <div className={styles.heroActions}>
          <button type="button" onClick={onAddSkill}>
            Take Skill Test
          </button>
          <button type="button" onClick={onAddProject}>
            Add Project
          </button>
          <Link to="/profile-setup">Complete Profile</Link>
        </div>
      </section>
    </>
  );
}

export default DashboardHeader;
