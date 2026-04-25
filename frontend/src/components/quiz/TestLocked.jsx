import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "../../pages/SkillTest.module.css";

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

function TestLocked({ lockInfo, skillName }) {
  const initialSeconds = useMemo(() => {
    if (typeof lockInfo?.remaining_seconds === "number") {
      return lockInfo.remaining_seconds;
    }

    if (lockInfo?.locked_until) {
      return Math.max(
        0,
        Math.floor((new Date(lockInfo.locked_until).getTime() - Date.now()) / 1000)
      );
    }

    return 0;
  }, [lockInfo]);
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.lockedCard}>
      <span className={styles.dangerBadge}>Test Locked</span>
      <h2>{skillName} is locked for 48 hours</h2>
      <p>
        {lockInfo?.message ||
          "This test is locked for 48 hours due to anti-cheating warnings."}
      </p>

      <div className={styles.countdownBox}>
        <span>Time remaining</span>
        <strong>{formatRemaining(remaining)}</strong>
      </div>

      {lockInfo?.locked_until && (
        <small>Lock expires at {new Date(lockInfo.locked_until).toLocaleString()}</small>
      )}

      <div className={styles.resultActions}>
        <Link to="/dashboard">Back to Dashboard</Link>
        <Link to="/profile-dashboard">Profile Dashboard</Link>
      </div>
    </section>
  );
}

export default TestLocked;
