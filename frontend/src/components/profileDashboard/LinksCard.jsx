import { useEffect, useState } from "react";
import styles from "../../pages/ProfileDashboard.module.css";

function LinksCard({ links, onSave, saving }) {
  const [form, setForm] = useState({
    github_url: "",
    linkedin_url: "",
  });

  useEffect(() => {
    setForm({
      github_url: links?.github_url || "",
      linkedin_url: links?.linkedin_url || "",
    });
  }, [links]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Portfolio Links</p>
          <h2>Proof channels</h2>
        </div>
      </div>

      <form className={styles.formGrid} onSubmit={submit}>
        <label className={styles.fullWidth}>
          GitHub
          <input
            type="url"
            value={form.github_url}
            onChange={(event) => updateField("github_url", event.target.value)}
            placeholder="https://github.com/username"
          />
          <small>Optional for MVP. GitHub analysis is coming soon.</small>
        </label>
        <label className={styles.fullWidth}>
          LinkedIn
          <input
            type="url"
            value={form.linkedin_url}
            onChange={(event) => updateField("linkedin_url", event.target.value)}
            placeholder="https://linkedin.com/in/username"
          />
        </label>
        <button className={styles.primaryButton} type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Links"}
        </button>
      </form>
    </section>
  );
}

export default LinksCard;
