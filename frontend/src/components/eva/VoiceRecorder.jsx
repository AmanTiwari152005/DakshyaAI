import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../pages/Dashboard.module.css";

function VoiceRecorder({ value, onChange, disabled }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const SpeechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    []
  );
  const isSupported = Boolean(SpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const startListening = () => {
    if (!isSupported || disabled || listening) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      onChange(transcript.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  return (
    <div className={styles.voiceRecorder}>
      {!isSupported && (
        <p className={styles.evaNotice}>
          Voice recognition is not supported in this browser. Please use typed
          interview mode.
        </p>
      )}

      <label>
        Your answer
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            isSupported
              ? "Use voice input or type your answer here..."
              : "Type your answer here..."
          }
          rows="5"
          disabled={disabled}
        />
      </label>

      {isSupported && (
        <div className={styles.voiceControls}>
          <button type="button" onClick={startListening} disabled={disabled || listening}>
            Start Answer
          </button>
          <button type="button" onClick={stopListening} disabled={disabled || !listening}>
            Stop Answer
          </button>
          {listening && <span>Listening...</span>}
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
