import { useNavigate } from "react-router-dom";
import styles from "../../pages/Dashboard.module.css";

function QuickActions({ onAddProject, onAddSkill, onViewBadges }) {
  const navigate = useNavigate();

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrowDark}>Quick Actions</p>
          <h2>Keep your proof moving</h2>
        </div>
      </div>

      <div className={styles.quickActionsGrid}>
        <button type="button" onClick={onAddProject}>
          Add New Project
        </button>
        <button type="button" onClick={onAddSkill}>
          Take Skill Test
        </button>
        <button type="button" onClick={() => navigate("/profile-setup")}>
          Edit Profile
        </button>
        <button className={styles.disabledAction} type="button" disabled>
          Connect GitHub
          <span>Coming Soon</span>
        </button>
        <button type="button" onClick={onViewBadges}>
          View Badges
        </button>
      </div>
    </section>
  );
}

export default QuickActions;
