import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CameraPermission from "../components/quiz/CameraPermission";
import QuizQuestion from "../components/quiz/QuizQuestion";
import QuizResult from "../components/quiz/QuizResult";
import TestLocked from "../components/quiz/TestLocked";
import { useFaceMonitor } from "../components/quiz/useFaceMonitor";
import {
  checkQuizLock,
  clearAuthToken,
  generateQuiz,
  getApiError,
  resetQuizWarnings,
  submitQuiz,
} from "../services/api";
import styles from "./SkillTest.module.css";

function SkillTest() {
  const { skillName: encodedSkillName = "" } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const warningTimerRef = useRef(null);
  const testSessionActiveRef = useRef(false);
  const lockedRef = useRef(false);
  const skillName = useMemo(
    () => decodeURIComponent(encodedSkillName || "").trim(),
    [encodedSkillName]
  );

  const [difficulty, setDifficulty] = useState("intermediate");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [permissionError, setPermissionError] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [pendingQuizStart, setPendingQuizStart] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [monitorError, setMonitorError] = useState("");
  const [lockInfo, setLockInfo] = useState(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
  }, []);

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

  const handleLocked = useCallback(
    (data) => {
      lockedRef.current = true;
      testSessionActiveRef.current = false;
      setMonitoringActive(false);
      setPendingQuizStart(false);
      stopCamera();
      setQuiz(null);
      setResult(null);
      setAnswers({});
      setWarningCount(data?.warning_count || 0);
      setLockInfo(data);
      setPhase("locked");
      setError("");
      setPermissionError("");
    },
    [stopCamera]
  );

  const checkCurrentLock = useCallback(
    async ({ showPermission = true } = {}) => {
      if (!skillName) {
        setError("Skill name is missing.");
        setPhase("permission");
        return false;
      }

      setError("");

      try {
        const response = await checkQuizLock(skillName);
        if (response.data.locked) {
          handleLocked(response.data);
          return false;
        }

        lockedRef.current = false;
        setLockInfo(null);
        setWarningCount(response.data.warning_count || 0);
        if (showPermission) {
          setPhase("permission");
        }
        return true;
      } catch (err) {
        handleError(err, "Unable to check test lock status.");
        setPhase("permission");
        return false;
      }
    },
    [handleError, handleLocked, skillName]
  );

  const loadQuiz = useCallback(async () => {
    setError("");
    setLoading(true);
    setResult(null);
    setAnswers({});
    setQuiz(null);
    setPhase("loading");

    try {
      const response = await generateQuiz(skillName, difficulty);
      setQuiz(response.data.quiz);
      setPhase("testing");
    } catch (err) {
      if (err?.response?.status === 423 && err.response.data?.locked) {
        handleLocked(err.response.data);
      } else {
        handleError(err, "Unable to generate quiz.");
        setPhase("permission");
      }
    } finally {
      setLoading(false);
    }
  }, [difficulty, handleError, handleLocked, skillName]);

  useEffect(() => {
    setPhase("checking");
    checkCurrentLock();
  }, [checkCurrentLock]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play?.().catch(() => {});
    }
  }, [cameraStream, phase]);

  useEffect(() => {
    return () => {
      window.clearTimeout(warningTimerRef.current);
      stopCamera();
      if (testSessionActiveRef.current && !lockedRef.current && skillName) {
        resetQuizWarnings(skillName).catch(() => {});
      }
    };
  }, [skillName, stopCamera]);

  const requestCamera = async () => {
    setPermissionError("");

    if (streamRef.current?.getVideoTracks().some((track) => track.readyState === "live")) {
      setCameraStream(streamRef.current);
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError("Camera permission is required to start this test.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      setCameraStream(stream);
      return true;
    } catch (err) {
      setPermissionError("Camera permission is required to start this test.");
      return false;
    }
  };

  const startTest = async () => {
    const canStart = await checkCurrentLock({ showPermission: false });
    if (!canStart) {
      return;
    }

    setPhase("permission");
    setLoading(true);
    const cameraAllowed = await requestCamera();
    if (!cameraAllowed) {
      setLoading(false);
      return;
    }

    lockedRef.current = false;
    testSessionActiveRef.current = true;
    setWarningMessage("");
    setMonitorError("");
    setPhase("loading");
    setMonitoringActive(true);
    setPendingQuizStart(true);
  };

  const handleWarning = useCallback((data, _reason, fallbackMessage) => {
    setWarningCount(data?.warning_count || 0);
    setWarningMessage(data?.message || fallbackMessage || "Warning recorded.");
    window.clearTimeout(warningTimerRef.current);
    warningTimerRef.current = window.setTimeout(() => {
      setWarningMessage("");
    }, 5200);
  }, []);

  const { monitorStatus } = useFaceMonitor({
    active: monitoringActive && phase !== "locked" && !result,
    skillName,
    videoRef,
    onWarning: handleWarning,
    onLocked: handleLocked,
    onError: setMonitorError,
  });

  useEffect(() => {
    if (!pendingQuizStart) {
      return;
    }

    if (monitorStatus === "Monitoring Active") {
      setPendingQuizStart(false);
      loadQuiz();
      return;
    }

    if (monitorStatus === "Monitor unavailable" && monitorError) {
      testSessionActiveRef.current = false;
      setPendingQuizStart(false);
      setMonitoringActive(false);
      setLoading(false);
      stopCamera();
      setPhase("permission");
    }
  }, [loadQuiz, monitorError, monitorStatus, pendingQuizStart, stopCamera]);

  const questions = quiz?.questions || [];
  const answeredCount = Object.keys(answers).length;
  const canSubmit = questions.length === 10 && answeredCount === questions.length;

  const updateAnswer = (questionId, answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  };

  const resetWarningsAfterTest = async () => {
    if (!lockedRef.current) {
      try {
        await resetQuizWarnings(skillName);
        setWarningCount(0);
      } catch (err) {
        setMonitorError("Unable to reset warning count.");
      }
    }
  };

  const endTestMonitoring = () => {
    testSessionActiveRef.current = false;
    setMonitoringActive(false);
    stopCamera();
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
      endTestMonitoring();
      await resetWarningsAfterTest();
      setResult(response.data);
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      handleError(err, "Unable to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const regenerateQuiz = async () => {
    const canRegenerate = await checkCurrentLock({ showPermission: false });
    if (canRegenerate) {
      await loadQuiz();
    }
  };

  const renderMonitorPreview = () => {
    if (!cameraStream || phase === "locked" || result) {
      return null;
    }

    return (
      <aside className={styles.monitorDock}>
        <div className={styles.monitorHeader}>
          <span>{monitorStatus}</span>
          <strong>Warnings: {Math.min(warningCount, 3)}/3</strong>
        </div>
        <video ref={videoRef} autoPlay muted playsInline />
        <small>
          Camera frames are processed locally. Only warning count and lock status
          are stored.
        </small>
      </aside>
    );
  };

  const renderWarning = () => {
    if (!warningMessage && !monitorError) {
      return null;
    }

    return (
      <div className={styles.warningCard}>
        <strong>{warningMessage || monitorError}</strong>
        <span>Warnings greater than 3 lock this test for 48 hours.</span>
      </div>
    );
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
              disabled={phase !== "permission" || loading || submitting}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </section>

        {error && <p className={styles.error}>{error}</p>}
        {renderWarning()}

        {phase === "checking" ? (
          <section className={styles.loadingCard}>
            <div className={styles.spinner} />
            <strong>Checking test availability...</strong>
            <p>We are checking anti-cheating lock status for {skillName}.</p>
          </section>
        ) : phase === "locked" ? (
          <TestLocked lockInfo={lockInfo} skillName={skillName} />
        ) : phase === "permission" ? (
          <CameraPermission
            skillName={skillName}
            onStart={startTest}
            error={permissionError}
            loading={loading}
          />
        ) : loading || phase === "loading" ? (
          <>
            {renderMonitorPreview()}
            <section className={styles.loadingCard}>
              <div className={styles.spinner} />
              <strong>
                {pendingQuizStart
                  ? "Starting camera face monitor..."
                  : `Generating ${skillName} quiz...`}
              </strong>
              <p>
                {pendingQuizStart
                  ? "The test will begin after monitoring is active."
                  : "This usually takes a few seconds."}
              </p>
            </section>
          </>
        ) : result ? (
          <QuizResult result={result} skillName={skillName} onRetest={startTest} />
        ) : (
          <form className={styles.quizForm} onSubmit={submitAnswers}>
            {renderMonitorPreview()}

            <div className={styles.quizMeta}>
              <span>
                {answeredCount}/{questions.length} answered
              </span>
              <button type="button" onClick={regenerateQuiz} disabled={submitting}>
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
