import { useEffect, useRef } from "react";
import styles from "../../pages/Dashboard.module.css";

function CameraPreview({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
  }, [stream]);

  return (
    <div className={styles.evaCameraPreview}>
      <div className={styles.evaCameraHeader}>
        <span>Camera Preview</span>
        <strong>Local only</strong>
      </div>
      <video ref={videoRef} autoPlay muted playsInline />
      <small>No audio, video, or frames are stored.</small>
    </div>
  );
}

export default CameraPreview;
