import styles from "../../pages/SkillTest.module.css";

function CameraPermission({ skillName, onStart, error, loading }) {
  return (
    <section className={styles.permissionCard}>
      <div>
        <p className={styles.eyebrowDark}>Secure Test Mode</p>
        <h2>Camera Required for Test Mode</h2>
        <p>
          DakshyaAI uses camera-based face monitoring during tests to keep
          verification fair.
        </p>
      </div>

      <div className={styles.permissionList}>
        <span>One visible face is required during the {skillName} test.</span>
        <span>Tab switches and window focus loss count as warnings.</span>
        <span>More than 3 warnings locks this test for 48 hours.</span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.primaryButton} type="button" onClick={onStart} disabled={loading}>
        {loading ? "Starting test..." : "Allow Camera & Start Test"}
      </button>

      <p className={styles.privacyNote}>
        Camera frames are processed locally in your browser. DakshyaAI only
        stores warning count and lock status.
      </p>
    </section>
  );
}

export default CameraPermission;
