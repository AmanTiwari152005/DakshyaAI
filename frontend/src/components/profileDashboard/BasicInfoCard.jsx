import { useEffect, useState } from "react";
import styles from "../../pages/ProfileDashboard.module.css";

function BasicInfoCard({ profile, onSave, saving }) {
  const [form, setForm] = useState({
    full_name: "",
    role: "",
    college_or_company: "",
    location: "",
    short_bio: "",
    profile_picture: null,
  });

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      role: profile?.target_role || "",
      college_or_company: profile?.college_or_company || "",
      location: profile?.location || "",
      short_bio: profile?.short_bio || "",
      profile_picture: null,
    });
  }, [profile]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "profile_picture") {
        if (value) {
          payload.append(key, value);
        }
      } else {
        payload.append(key, value);
      }
    });
    onSave(payload);
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Basic Information</p>
          <h2>Identity details</h2>
        </div>
      </div>

      <form className={styles.formGrid} onSubmit={submit}>
        <label>
          Name
          <input
            value={form.full_name}
            onChange={(event) => updateField("full_name", event.target.value)}
            placeholder="Your full name"
          />
        </label>
        <label>
          Role
          <input
            value={form.role}
            onChange={(event) => updateField("role", event.target.value)}
            placeholder="Frontend Developer"
          />
        </label>
        <label>
          College / Company
          <input
            value={form.college_or_company}
            onChange={(event) =>
              updateField("college_or_company", event.target.value)
            }
            placeholder="Your college or workplace"
          />
        </label>
        <label>
          Location
          <input
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="City, country"
          />
        </label>
        <label className={styles.fullWidth}>
          Bio / About
          <textarea
            value={form.short_bio}
            onChange={(event) => updateField("short_bio", event.target.value)}
            placeholder="Briefly describe your skills, goals, and work style"
            rows="4"
          />
        </label>
        <label className={styles.fullWidth}>
          Profile picture
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              updateField("profile_picture", event.target.files?.[0] || null)
            }
          />
        </label>
        <button className={styles.primaryButton} type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Basic Info"}
        </button>
      </form>
    </section>
  );
}

export default BasicInfoCard;
