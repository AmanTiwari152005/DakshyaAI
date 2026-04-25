import styles from "../../pages/Dashboard.module.css";

function EvaMessageBubble({ message }) {
  return (
    <article
      className={`${styles.evaMessage} ${
        message.role === "user" ? styles.evaUserMessage : styles.evaAssistantMessage
      }`}
    >
      <span>{message.role === "user" ? "You" : "Eva"}</span>
      <p>{message.content}</p>
    </article>
  );
}

export default EvaMessageBubble;
