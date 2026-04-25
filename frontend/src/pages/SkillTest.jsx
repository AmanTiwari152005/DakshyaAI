import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuizQuestion from "../components/quiz/QuizQuestion";
import QuizResult from "../components/quiz/QuizResult";
import {
  clearAuthToken,
  generateQuiz,
  getApiError,
  submitQuiz,
} from "../services/api";
import styles from "./SkillTest.module.css";

function SkillTest() {
  const { skillName: encodedSkillName = "" } = useParams();
  const navigate = useNavigate();
  const skillName = useMemo(
    () => decodeURIComponent(encodedSkillName || "").trim(),
    [encodedSkillName]
  );
  const [difficulty, setDifficulty] = useState("intermediate");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleError = useCallback(
    (err, fallback) => {
      if (err?.response?.status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }
      setError(getApiError(err, fallback));
    },
    [navigate]
  );

  const loadQuiz = useCallback(async () => {
    if (!skillName) {
      setError("Skill name is missing.");
      setLoading(false);
      return;
    }

    setError("");
    setResult(null);
    setAnswers({});
    setLoading(true);

    try {
      const response = await generateQuiz(skillName, difficulty);
      setQuiz(response.data.quiz);
    } catch (err) {
      handleError(err, "Unable to generate quiz.");
    } finally {
      setLoading(false);
    }
  }, [difficulty, handleError, skillName]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const questions = quiz?.questions || [];
  const answeredCount = Object.keys(answers).length;
  const canSubmit = questions.length === 10 && answeredCount === questions.length;

  const updateAnswer = (questionId, answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  };

  const submitAnswers = async (event) => {
    event.preventDefault();
    if (!canSubmit || submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await submitQuiz(skillName, answers, quiz);
      setResult(response.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      handleError(err, "Unable to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link className={styles.brand} to="/dashboard">
            DakshyaAI
          </Link>
          <div className={styles.navActions}>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile-dashboard">Profile</Link>
          </div>
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Skill Test</p>
            <h1>{skillName || "Skill"} Quiz</h1>
            <p>
              Answer 10 MCQs. Score 7/10 or above to mark this skill as Test
              Verified.
            </p>
          </div>
          <label className={styles.difficultySelect}>
            Difficulty
            <select
              value={difficulty}
              disabled={loading || submitting}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <section className={styles.loadingCard}>
            <div className={styles.spinner} />
            <strong>Generating {skillName} quiz...</strong>
            <p>This usually takes a few seconds.</p>
          </section>
        ) : result ? (
          <QuizResult result={result} skillName={skillName} onRetest={loadQuiz} />
        ) : (
          <form className={styles.quizForm} onSubmit={submitAnswers}>
            <div className={styles.quizMeta}>
              <span>
                {answeredCount}/{questions.length} answered
              </span>
              <button type="button" onClick={loadQuiz} disabled={submitting}>
                Regenerate
              </button>
            </div>

            {questions.map((question) => (
              <QuizQuestion
                question={question}
                key={question.id}
                selectedAnswer={answers[String(question.id)]}
                onAnswerChange={updateAnswer}
                disabled={submitting}
              />
            ))}

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Checking answers..." : "Submit Test"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default SkillTest;
