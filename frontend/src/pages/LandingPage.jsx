import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import styles from "./LandingPage.module.css";

function LandingPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <Hero />
        <span id="features" className={styles.anchor} aria-hidden="true" />
        <span id="how-it-works" className={styles.anchor} aria-hidden="true" />
        <span id="contact" className={styles.anchor} aria-hidden="true" />
      </main>
    </div>
  );
}

export default LandingPage;
