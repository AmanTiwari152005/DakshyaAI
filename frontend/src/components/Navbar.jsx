import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Contact", href: "/#contact" },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link className={styles.logo} to="/" onClick={closeMenu}>
          DakshyaAI
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {navItems.map((item) => (
            <a className={styles.navLink} href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link className={styles.loginLink} to="/login">
            Login
          </Link>
          <Link className={styles.getStartedLink} to="/register">
            Get Started
          </Link>
        </div>

        <button
          className={`${styles.menuButton} ${isMenuOpen ? styles.open : ""}`}
          type="button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav
        className={`${styles.mobileMenu} ${
          isMenuOpen ? styles.mobileMenuOpen : ""
        }`}
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => (
          <a
            className={styles.mobileNavLink}
            href={item.href}
            key={item.label}
            onClick={closeMenu}
          >
            {item.label}
          </a>
        ))}
        <div className={styles.mobileActions}>
          <Link className={styles.mobileLoginLink} to="/login" onClick={closeMenu}>
            Login
          </Link>
          <Link
            className={styles.mobileGetStartedLink}
            to="/register"
            onClick={closeMenu}
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
