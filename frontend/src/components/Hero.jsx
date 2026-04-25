import { useNavigate } from "react-router-dom";
import Button from "./Button";
import { isAuthenticated } from "../services/api";
import styles from "./Hero.module.css";

const trustBadges = ["AI Verified", "Test Validated", "Recruiter Ready"];

function Hero() {
  const navigate = useNavigate();

  const handleProtectedCta = () => {
    navigate(isAuthenticated() ? "/dashboard" : "/login");
  };

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>Trusted skill intelligence</p>
          <h1>Proving Skills. Not Just Resumes.</h1>
          <p className={styles.subtext}>
            DakshyaAI uses AI to verify your skills, validate them through
            real-time tests, and generate a trusted employability score.
          </p>

          <div className={styles.ctaGroup}>
            <Button onClick={handleProtectedCta} variant="primary">
              Analyze My Skills
            </Button>
            <Button onClick={handleProtectedCta} variant="secondary">
              Try Skill Test
            </Button>
          </div>

          <div className={styles.badges} aria-label="DakshyaAI trust signals">
            {trustBadges.map((badge) => (
              <span className={styles.badge} key={badge}>
                <span className={styles.badgeIcon} aria-hidden="true">
                  ✓
                </span>
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.visualWrap} aria-hidden="true">
          <div className={styles.dashboard}>
            <div className={styles.dashboardHeader}>
              <span />
              <span />
              <span />
            </div>

            <div className={styles.scorePanel}>
              <div>
                <p>Employability Score</p>
                <strong>91</strong>
              </div>
              <div className={styles.scoreRing}>AI</div>
            </div>

            <div className={styles.skillRows}>
              <div className={styles.skillRow}>
                <span>React</span>
                <div>
                  <span className={styles.barReact} />
                </div>
                <strong>96%</strong>
              </div>
              <div className={styles.skillRow}>
                <span>Problem Solving</span>
                <div>
                  <span className={styles.barProblem} />
                </div>
                <strong>89%</strong>
              </div>
              <div className={styles.skillRow}>
                <span>Communication</span>
                <div>
                  <span className={styles.barCommunication} />
                </div>
                <strong>84%</strong>
              </div>
            </div>

            <div className={styles.validationStrip}>
              <span>Live Test</span>
              <span>Verified</span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
