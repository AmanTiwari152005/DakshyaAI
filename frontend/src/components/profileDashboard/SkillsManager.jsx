import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../pages/ProfileDashboard.module.css";

const emptyForm = {
  name: "",
  level: "Intermediate",
  progress_score: 70,
  verification_status: "not_tested",
  source: "manual",
};

const statusClassMap = {
  verified: styles.verifiedTag,
  in_review: styles.reviewTag,
  not_tested: styles.mutedTag,
};

function SkillsManager({ skills, onCreate, onUpdate, onDelete, saving }) {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isFormOpen) {
      setForm(emptyForm);
      setEditingSkill(null);
    }
  }, [isFormOpen]);

  const openEdit = (skill) => {
    setEditingSkill(skill);
    setForm({
      name: skill.name || "",
      level: skill.level || "Intermediate",
      progress_score: skill.progress_score || 0,
      verification_status: skill.verification_status || "not_tested",
      source: skill.source || "manual",
    });
    setIsFormOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      progress_score: Number(form.progress_score),
    };
    if (editingSkill) {
      await onUpdate(editingSkill.id, payload);
    } else {
      await onCreate(payload);
    }
    setIsFormOpen(false);
  };

  const openSkillTest = (skillName) => {
    navigate(`/skill-test/${encodeURIComponent(skillName)}`);
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Skills</p>
          <h2>Skill proof</h2>
        </div>
        <button type="button" onClick={() => setIsFormOpen((current) => !current)}>
          {isFormOpen ? "Close" : "Add Skill"}
        </button>
      </div>

      {isFormOpen && (
        <form className={styles.formGrid} onSubmit={submit}>
          <label>
            Skill
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="React"
              required
            />
          </label>
          <label>
            Level
            <select
              value={form.level}
              onChange={(event) => updateField("level", event.target.value)}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
          <label>
            Progress
            <input
              type="number"
              min="0"
              max="100"
              value={form.progress_score}
              onChange={(event) => updateField("progress_score", event.target.value)}
            />
          </label>
          <label>
            Verification
            <select
              value={form.verification_status}
              onChange={(event) =>
                updateField("verification_status", event.target.value)
              }
            >
              <option value="verified">Verified</option>
              <option value="in_review">In Review</option>
              <option value="not_tested">Not Tested</option>
            </select>
          </label>
          <button className={styles.primaryButton} type="submit" disabled={saving}>
            {saving ? "Saving..." : editingSkill ? "Update Skill" : "Create Skill"}
          </button>
        </form>
      )}

      {skills.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No skills yet</strong>
          <p>Add skills to make your portfolio searchable and score-ready.</p>
        </div>
      ) : (
        <div className={styles.tagList}>
          {skills.map((skill) => (
            <article className={styles.skillCard} key={skill.id}>
              <div>
                <strong>{skill.name}</strong>
                <span>{skill.level}</span>
              </div>
              <span
                className={`${styles.statusTag} ${
                  statusClassMap[skill.verification_status] || styles.mutedTag
                }`}
              >
                {skill.verification_status_label}
              </span>
              <div className={styles.cardActions}>
                <button type="button" onClick={() => openSkillTest(skill.name)}>
                  Take Test
                </button>
                <button type="button" onClick={() => openEdit(skill)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(skill.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SkillsManager;
