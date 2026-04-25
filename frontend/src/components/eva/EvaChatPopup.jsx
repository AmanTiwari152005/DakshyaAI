import { useRef, useState } from "react";
import { getApiError, sendEvaMessage } from "../../services/api";
import styles from "../../pages/Dashboard.module.css";
import EvaMessageBubble from "./EvaMessageBubble";

const welcomeMessage = {
  role: "assistant",
  content:
    "Hi, I am Eva. Ask me about your resume, skills, projects, job readiness, or interview preparation.",
};

function EvaChatPopup({ onClose, onStartInterview }) {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const submit = async (event) => {
    event.preventDefault();
    const cleanInput = input.trim();
    if (!cleanInput || loading) {
      return;
    }

    setError("");
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: cleanInput }]);

    try {
      const response = await sendEvaMessage(cleanInput);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.data.reply },
      ]);
    } catch (err) {
      setError(getApiError(err, "Eva is unavailable right now."));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <section className={styles.evaPopup} aria-label="Eva assistant">
      <div className={styles.evaPopupHeader}>
        <div className={styles.evaAvatar}>Eva</div>
        <div>
          <h2>Eva - DakshyaAI Assistant</h2>
          <p>Ask about your resume, skills, projects, and job readiness.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Eva">
          x
        </button>
      </div>

      <button
        className={styles.evaInterviewCta}
        type="button"
        onClick={onStartInterview}
      >
        Start Voice Interview
      </button>

      <div className={styles.evaMessages}>
        {messages.map((message, index) => (
          <EvaMessageBubble message={message} key={`${message.role}-${index}`} />
        ))}
        {loading && (
          <EvaMessageBubble
            message={{ role: "assistant", content: "Eva is thinking..." }}
          />
        )}
      </div>

      {error && <p className={styles.evaError}>{error}</p>}

      <form className={styles.evaInputBar} onSubmit={submit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Eva about your career profile..."
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

export default EvaChatPopup;
