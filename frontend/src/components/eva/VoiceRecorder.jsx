import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../pages/Dashboard.module.css";

function safeStopRecognition(recognition) {
  try {
    recognition?.stop?.();
  } catch (error) {
    // Browser speech APIs throw if stop is called while already inactive.
  }
}

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function VoiceRecorder({ value, onChange, disabled }) {
  const recognitionRef = useRef(null);
  const micStreamRef = useRef(null);
  const isRecordingRef = useRef(false);
  const disabledRef = useRef(disabled);
  const committedTranscriptRef = useRef("");
  const restartTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [micReady, setMicReady] = useState(false);
  const SpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }, []);
  const isSupported = Boolean(SpeechRecognition);

  const stopMicrophone = () => {
    stopStream(micStreamRef.current);
    micStreamRef.current = null;
    setMicReady(false);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    window.clearTimeout(restartTimerRef.current);
    safeStopRecognition(recognitionRef.current);
    stopMicrophone();
  };

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled && isRecordingRef.current) {
      stopRecording();
    }
  }, [disabled]);

  useEffect(() => {
    if (!isRecordingRef.current || !value) {
      committedTranscriptRef.current = value || "";
    }
  }, [value]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      window.clearTimeout(restartTimerRef.current);
      safeStopRecognition(recognitionRef.current);
      stopMicrophone();
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone permission is not available in this browser.");
    }

    if (micStreamRef.current?.getAudioTracks().some((track) => track.readyState === "live")) {
      return micStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;
    setMicReady(true);
    return stream;
  };

  const createRecognition = () => {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk = `${finalChunk} ${transcript}`.trim();
        } else {
          interimChunk = `${interimChunk} ${transcript}`.trim();
        }
      }

      if (finalChunk) {
        committedTranscriptRef.current = `${committedTranscriptRef.current} ${finalChunk}`.trim();
      }

      const liveTranscript =
        `${committedTranscriptRef.current} ${interimChunk}`.trim();
      onChange(liveTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechError("Microphone permission is required for voice input.");
        stopRecording();
        return;
      }

      if (event.error === "audio-capture") {
        setSpeechError("No microphone was detected. Please connect or allow a microphone.");
        stopRecording();
        return;
      }

      if (event.error && event.error !== "no-speech") {
        setSpeechError("Voice recognition paused. Keep speaking or press Start Answer again.");
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current && !disabledRef.current) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            // The browser may still be transitioning between recognition states.
          }
        }, 180);
        return;
      }

      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startRecording = async () => {
    if (!isSupported || disabled || isRecordingRef.current) {
      return;
    }

    setSpeechError("");

    try {
      await requestMicrophonePermission();
    } catch (error) {
      setSpeechError("Microphone permission is required for voice input.");
      return;
    }

    const recognition = recognitionRef.current || createRecognition();
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      recognition.start();
    } catch (error) {
      // Calling start while active can throw; keep the current session alive.
    }
  };

  return (
    <div className={styles.voiceRecorder}>
      {!isSupported && (
        <p className={styles.evaNotice}>
          Voice input not supported in this browser. Please type your answer.
        </p>
      )}

      {speechError && <p className={styles.evaError}>{speechError}</p>}

      <label>
        Your answer
        <textarea
          value={value}
          onChange={(event) => {
            committedTranscriptRef.current = event.target.value;
            onChange(event.target.value);
          }}
          placeholder={
            isSupported
              ? "Click Start Answer and speak in English. Your words will appear here..."
              : "Type your answer here..."
          }
          rows="5"
          disabled={disabled}
        />
      </label>

      <div className={styles.transcriptStatus}>
        <strong>Live English transcript</strong>
        <span>
          {isRecording
            ? "Listening to your microphone..."
            : value.trim()
              ? `${value.trim().length} characters captured`
              : "Empty"}
        </span>
      </div>

      {isSupported && (
        <div className={styles.voiceControls}>
          <button type="button" onClick={startRecording} disabled={disabled || isRecording}>
            Start Answer
          </button>
          <button type="button" onClick={stopRecording} disabled={disabled || !isRecording}>
            Stop Answer
          </button>
          {isRecording && (
            <span className={styles.recordingIndicator}>
              <i />
              Listening...
            </span>
          )}
          {micReady && !isRecording && (
            <span className={styles.micReadyIndicator}>Microphone allowed</span>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
