import styles from "../../pages/SkillTest.module.css";

const optionLetters = ["A", "B", "C", "D"];

function QuizQuestion({ question, selectedAnswer, onAnswerChange, disabled }) {
  return (
    <article className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <span>Question {question.id}</span>
        {selectedAnswer && <small>Selected {selectedAnswer}</small>}
      </div>

      <h2>{question.question}</h2>

      <div className={styles.optionGrid}>
        {optionLetters.map((letter) => (
          <label
            className={`${styles.optionCard} ${
              selectedAnswer === letter ? styles.optionSelected : ""
            }`}
            key={letter}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={letter}
              checked={selectedAnswer === letter}
              disabled={disabled}
              onChange={() => onAnswerChange(String(question.id), letter)}
            />
            <span>{letter}</span>
            <p>{question.options?.[letter]}</p>
          </label>
        ))}
      </div>
    </article>
  );
}

export default QuizQuestion;
