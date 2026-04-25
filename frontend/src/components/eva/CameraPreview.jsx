import { useEffect, useRef, useState } from "react";
import styles from "../../pages/Dashboard.module.css";

function CameraPreview({ stream }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Camera stream loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!stream) {
      setStatus("Camera stream loading...");
      return;
    }

    const videoTracks = stream.getVideoTracks();
    if (!videoTracks.length) {
      setStatus("Camera not found");
      setError("No camera video track is available.");
      return;
    }

    const [track] = videoTracks;
    if (track.readyState === "ended") {
      setStatus("Camera permission denied");
      setError("Camera track stopped. Please restart the interview.");
      return;
    }

    setError("");
    setStatus("Camera active");
    video.srcObject = stream;
    video.play?.().catch(() => {
      setStatus("Camera stream loading...");
    });

    const handleEnded = () => {
      setStatus("Camera permission denied");
      setError("Camera stream stopped.");
    };

    track.addEventListener?.("ended", handleEnded);

    return () => {
      track.removeEventListener?.("ended", handleEnded);
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className={styles.evaCameraPreview}>
      <div className={styles.evaCameraHeader}>
        <span>Camera Preview</span>
        <strong>{status}</strong>
      </div>
      <video ref={videoRef} autoPlay muted playsInline />
      {error && <small className={styles.cameraError}>{error}</small>}
      <small>No audio, video, or frames are stored.</small>
    </div>
  );
}

export default CameraPreview;
