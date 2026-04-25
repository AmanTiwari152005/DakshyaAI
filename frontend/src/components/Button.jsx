import { Link } from "react-router-dom";
import styles from "./Button.module.css";

function Button({
  children,
  to,
  variant = "primary",
  className = "",
  ...props
}) {
  const classNames = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <Link className={classNames} to={to} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classNames} type="button" {...props}>
      {children}
    </button>
  );
}

export default Button;
