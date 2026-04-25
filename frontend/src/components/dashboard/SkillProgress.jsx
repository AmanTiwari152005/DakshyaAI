import { useNavigate } from "react-router-dom";
import styles from "../../pages/Dashboard.module.css";

const statusClassMap = {
  verified: styles.statusVerified,
  in_review: styles.statusReview,
  not_tested: styles.statusMuted,
};

function SkillProgress({ skills, loading, onAddSkill }) {
  const navigate = useNavigate();

  const openSkillTest = (skillName) => {
    navigate(`/skill-test/${encodeURIComponent(skillName)}`);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrowDark}>Skill Progress</p>
          <h2>Validated strengths</h2>
        </div>
        <button type="button" onClick={onAddSkill}>
          Add Skill
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          <span />
          <span />
          <span />
        </div>
      ) : skills.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No skills added yet</strong>
          <p>Add your first skill or take a test to start building proof.</p>
          <button type="button" onClick={onAddSkill}>
            Add First Skill
          </button>
        </div>
      ) : (
        <div className={styles.skillList}>
          {skills.map((skill) => (
            <article className={styles.skillItem} key={skill.id}>
              <div className={styles.skillTopline}>
                <div>
                  <strong>{skill.name}</strong>
                  <span>{skill.level}</span>
                </div>
                <div className={styles.skillActions}>
                  <span
                    className={`${styles.statusTag} ${
                      statusClassMap[skill.verification_status] || styles.statusMuted
                    }`}
                  >
                    {skill.verification_status_label}
                  </span>
                  <button type="button" onClick={() => openSkillTest(skill.name)}>
                    Take Test
                  </button>
                </div>
              </div>

              <div className={styles.progressTrack}>
                <span style={{ width: `${skill.progress_score}%` }} />
              </div>

              <div className={styles.skillMeta}>
                <span>{skill.progress_score}% progress</span>
                <span>Source: {skill.source}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SkillProgress;
