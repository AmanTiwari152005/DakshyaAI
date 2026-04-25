import styles from "../../pages/Dashboard.module.css";

function ReportList({ title, items }) {
  return (
    <article className={styles.reportCard}>
      <h3>{title}</h3>
      {items?.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No items returned.</p>
      )}
    </article>
  );
}

function InterviewReport({ report }) {
  if (!report) {
    return null;
  }

  return (
    <section className={styles.reportGrid}>
      <article className={styles.reportCard}>
        <h3>Overall Feedback</h3>
        <p>{report.overall_feedback || "No overall feedback returned."}</p>
      </article>
      <ReportList title="Strengths" items={report.strengths} />
      <ReportList title="Weak Points" items={report.weak_points} />
      <ReportList title="Improvement Suggestions" items={report.improvement_suggestions} />
      <ReportList title="Recommended Practice" items={report.recommended_practice} />
      <ReportList title="Technical Gaps" items={report.technical_gaps} />
      {report.communication_feedback && (
        <article className={styles.reportCard}>
          <h3>Communication Feedback</h3>
          <p>{report.communication_feedback}</p>
        </article>
      )}
    </section>
  );
}

export default InterviewReport;
