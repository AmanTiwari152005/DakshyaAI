import { useCallback, useEffect, useRef, useState } from "react";
import { sendAntiCheatWarning } from "../../services/api";

const VISION_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm";
const FACE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const CHECK_INTERVAL_MS = 2500;
const WARNING_COOLDOWN_MS = 6000;

function getDetectionScore(detection) {
  return detection?.categories?.[0]?.score ?? detection?.score ?? 1;
}

function hasLiveVideoTrack(video) {
  const stream = video?.srcObject;
  if (!stream || typeof stream.getVideoTracks !== "function") {
    return false;
  }
  return stream.getVideoTracks().some((track) => track.readyState === "live");
}

function canReadVideoFrame(video) {
  return Boolean(video && video.readyState >= 2 && video.videoWidth && video.videoHeight);
}

export function useFaceMonitor({
  active,
  skillName,
  videoRef,
  onWarning,
  onLocked,
  onError,
}) {
  const detectorRef = useRef(null);
  const activeRef = useRef(active);
  const warningInFlightRef = useRef(false);
  const lastWarningAtRef = useRef(0);
  const [monitorStatus, setMonitorStatus] = useState("Starting monitor...");

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      setMonitorStatus("Starting monitor...");
    }
  }, [active]);

  const issueWarning = useCallback(
    async (reason, fallbackMessage) => {
      if (!activeRef.current || warningInFlightRef.current || !skillName) {
        return;
      }

      const now = Date.now();
      if (now - lastWarningAtRef.current < WARNING_COOLDOWN_MS) {
        return;
      }

      warningInFlightRef.current = true;
      lastWarningAtRef.current = now;

      try {
        const response = await sendAntiCheatWarning(skillName, reason);
        if (response.data.locked) {
          onLocked?.(response.data);
        } else {
          onWarning?.(response.data, reason, fallbackMessage);
        }
      } catch (err) {
        onError?.("Unable to record anti-cheating warning.");
      } finally {
        warningInFlightRef.current = false;
      }
    },
    [onError, onLocked, onWarning, skillName]
  );

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let cancelled = false;

    async function startDetector() {
      try {
        setMonitorStatus("Loading face monitor...");
        const { FaceDetector, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(VISION_WASM_PATH);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_MODEL_PATH,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });

        if (cancelled) {
          detector.close?.();
          return;
        }

        detectorRef.current = detector;
        setMonitorStatus("Monitoring Active");
      } catch (err) {
        setMonitorStatus("Monitor unavailable");
        onError?.("Face monitoring could not start. Check your connection and retry.");
      }
    }

    startDetector();

    return () => {
      cancelled = true;
      detectorRef.current?.close?.();
      detectorRef.current = null;
    };
  }, [active, onError]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const checkFrame = () => {
      const video = videoRef.current;

      if (!hasLiveVideoTrack(video)) {
        issueWarning("camera_stream_stopped", "Warning: Camera stream stopped.");
        return;
      }

      if (!detectorRef.current || !canReadVideoFrame(video)) {
        return;
      }

      try {
        const result = detectorRef.current.detectForVideo(video, performance.now());
        const detections = result?.detections || [];

        if (detections.length === 0) {
          issueWarning("no_face_detected", "Warning: Face not clearly visible.");
          return;
        }

        if (detections.length > 1) {
          issueWarning("multiple_faces_detected", "Warning: Multiple faces detected.");
          return;
        }

        if (getDetectionScore(detections[0]) < 0.5) {
          issueWarning("low_face_confidence", "Warning: Face not clearly visible.");
        }
      } catch (err) {
        onError?.("Face monitoring paused unexpectedly.");
      }
    };

    const intervalId = window.setInterval(checkFrame, CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [active, issueWarning, onError, videoRef]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        issueWarning("tab_switched", "Warning: Do not switch tabs during the test.");
      }
    };

    const onWindowBlur = () => {
      issueWarning("window_blur", "Warning: Keep the test window focused.");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [active, issueWarning]);

  return { monitorStatus };
}
