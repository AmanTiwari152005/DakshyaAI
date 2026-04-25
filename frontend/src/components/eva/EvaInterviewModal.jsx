import { useCallback, useEffect, useState } from "react";
import {
  endEvaInterview,
  getApiError,
  startEvaInterview,
  submitEvaInterviewAnswer,
} from "../../services/api";
import styles from "../../pages/Dashboard.module.css";
import CameraPreview from "./CameraPreview";
import InterviewReport from "./InterviewReport";
import VoiceRecorder from "./VoiceRecorder";

function speak(text) {
  if (!window.speechSynthesis || !text) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function EvaInterviewModal({ isOpen, onClose }) {
  const [cameraStream, setCameraStream] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [question, setQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("intro");

  const cleanupMedia = useCallback(() => {
    stopStream(cameraStream);
    setCameraStream(null);
    window.speechSynthesis?.cancel();
  }, [cameraStream]);

  useEffect(() => {
    if (!isOpen) {
      cleanupMedia();
      setPhase("intro");
      setSessionId("");
      setQuestion("");
      setAnswer("");
      setHistory([]);
      setFeedback("");
      setReport(null);
      setError("");
    }
  }, [cleanupMedia, isOpen]);

  useEffect(() => cleanupMedia, [cleanupMedia]);

  const closeModal = () => {
    cleanupMedia();
    onClose();
  };

  const startInterview = async () => {
    setError("");
    setLoading(true);
    let openedStream = null;

    try {
      openedStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setCameraStream(openedStream);
      const response = await startEvaInterview("voice");
      setSessionId(response.data.interview_session_id);
      setQuestion(response.data.question);
      setQuestionNumber(response.data.question_number);
      setPhase("interview");
      speak(response.data.question);
    } catch (err) {
      setError(getApiError(err, "Camera permission is required to start the interview."));
      stopStream(openedStream || cameraStream);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    const cleanAnswer = answer.trim();
    if (!cleanAnswer || loading) {
      return;
    }

    setError("");
    setLoading(true);
    const nextHistory = [...history, { question, answer: cleanAnswer }];

    try {
      const response = await submitEvaInterviewAnswer({
        interview_session_id: sessionId,
        question_number: questionNumber,
        question,
        answer: cleanAnswer,
        history,
      });
      setHistory(nextHistory);
      setFeedback(response.data.feedback || "");
      setAnswer("");

      if (response.data.is_complete) {
        await finishInterview(nextHistory, true);
        return;
      }

      setQuestion(response.data.next_question);
      setQuestionNumber(response.data.question_number);
      speak(response.data.next_question);
    } catch (err) {
      setError(getApiError(err, "Eva could not review this answer."));
    } finally {
      setLoading(false);
    }
  };

  const finishInterview = async (finalHistory = history, force = false) => {
    if (!sessionId || (loading && !force)) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await endEvaInterview({
        interview_session_id: sessionId,
        history: finalHistory,
      });
      setReport(response.data.final_report);
      setPhase("report");
      cleanupMedia();
    } catch (err) {
      setError(getApiError(err, "Eva could not generate the final report."));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.evaModalBackdrop} role="presentation">
      <section className={styles.evaInterviewModal} aria-label="Eva voice interview">
        <div className={styles.evaInterviewHeader}>
          <div>
            <p className={styles.eyebrowDark}>Eva Voice Interview</p>
            <h2>Resume-based interview practice</h2>
          </div>
          <button type="button" onClick={closeModal} aria-label="Close interview">
            x
          </button>
        </div>

        {error && <p className={styles.evaError}>{error}</p>}

        {phase === "intro" && (
          <div className={styles.interviewIntro}>
            <p>
              Eva will ask interview questions based on your resume and profile.
            </p>
            <p className={styles.evaNotice}>
              Camera preview stays local. Audio/video and camera frames are not
              stored.
            </p>
            <button className={styles.primaryButton} type="button" onClick={startInterview} disabled={loading}>
              {loading ? "Starting..." : "Allow Camera & Start Interview"}
            </button>
          </div>
        )}

        {phase === "interview" && (
          <div className={styles.interviewGrid}>
            <CameraPreview stream={cameraStream} />

            <section className={styles.interviewPanel}>
              <div className={styles.questionCard}>
                <span>Question {questionNumber}/5</span>
                <h3>{question}</h3>
                <button type="button" onClick={() => speak(question)}>
                  Replay Question
                </button>
              </div>

              {feedback && (
                <div className={styles.feedbackCard}>
                  <strong>Eva feedback</strong>
                  <p>{feedback}</p>
                </div>
              )}

              <VoiceRecorder value={answer} onChange={setAnswer} disabled={loading} />

              <div className={styles.interviewActions}>
                <button type="button" onClick={submitAnswer} disabled={loading || !answer.trim()}>
                  {loading ? "Reviewing..." : "Submit Answer"}
                </button>
                <button
                  className={styles.endInterviewButton}
                  type="button"
                  onClick={() => finishInterview(history)}
                  disabled={loading}
                >
                  End Interview
                </button>
              </div>
            </section>
          </div>
        )}

        {phase === "report" && (
          <>
            <InterviewReport report={report} />
            <div className={styles.interviewActions}>
              <button type="button" onClick={closeModal}>
                Done
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default EvaInterviewModal;
