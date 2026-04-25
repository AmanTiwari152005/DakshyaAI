import { Link } from "react-router-dom";
import styles from "../../pages/SkillTest.module.css";

function QuizResult({ result, skillName, onRetest }) {
  if (!result) {
    return null;
  }

  return (
    <section className={styles.resultPanel}>
      <div className={styles.resultSummary}>
        <div>
          <p className={styles.eyebrow}>Quiz Result</p>
          <h1>
            {result.score}/{result.total_questions}
          </h1>
          <span
            className={`${styles.resultBadge} ${
              result.passed ? styles.passBadge : styles.failBadge
            }`}
          >
            {result.passed ? "PASS" : "FAIL"}
          </span>
        </div>
        <p>
          {result.passed
            ? `${skillName} is now marked as Test Verified when the skill exists in your profile.`
            : "You need 7/10 or above to pass. Generate a fresh retest when ready."}
        </p>
      </div>

      {result.passed && (
        <div className={styles.successCallout}>
          <strong>Skill Verified</strong>
          <span>
            {result.badge_unlocked
              ? `Unlocked badge: ${result.badge?.title || `${skillName} Test Verified`}`
              : result.badge?.title
              ? `Badge active: ${result.badge.title}`
              : "Your verified status is ready on the dashboard."}
          </span>
        </div>
      )}

      {!result.passed && (
        <button className={styles.primaryButton} type="button" onClick={onRetest}>
          Retest
        </button>
      )}

      <div className={styles.resultActions}>
        <Link to="/dashboard">Back to Dashboard</Link>
        <Link to="/profile-dashboard">Profile Dashboard</Link>
      </div>

      <div className={styles.answerReview}>
        {result.results.map((item) => (
          <article
            className={`${styles.reviewCard} ${
              item.is_correct ? styles.correctCard : styles.wrongCard
            }`}
            key={item.id}
          >
            <div className={styles.reviewTopline}>
              <strong>
                {item.id}. {item.question}
              </strong>
              <span>{item.is_correct ? "Correct" : "Review"}</span>
            </div>
            <p>
              Your answer: <strong>{item.selected_answer || "Not answered"}</strong>
            </p>
            <p>
              Correct answer: <strong>{item.correct_answer}</strong>
            </p>
            <small>{item.explanation}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export default QuizResult;
