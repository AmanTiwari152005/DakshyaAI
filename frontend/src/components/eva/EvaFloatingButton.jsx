import styles from "../../pages/Dashboard.module.css";

function EvaFloatingButton({ onClick, isOpen }) {
  return (
    <button
      className={styles.evaFloatingButton}
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close Eva assistant" : "Open Eva assistant"}
    >
      <span>AI</span>
      Eva
    </button>
  );
}

export default EvaFloatingButton;
