import { useEffect, useState } from "react";
import styles from "../../pages/ProfileDashboard.module.css";

const emptyForm = {
  title: "",
  description: "",
  tech_stack: "",
  github_link: "",
  live_link: "",
  proof_link: "",
  screenshots: [],
};

const statusClassMap = {
  verified: styles.verifiedTag,
  under_review: styles.reviewTag,
  not_submitted: styles.mutedTag,
};

function ProjectsManager({ projects, onCreate, onUpdate, onDelete, saving }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isFormOpen) {
      setForm(emptyForm);
      setEditingProject(null);
    }
  }, [isFormOpen]);

  const openEdit = (project) => {
    setEditingProject(project);
    setForm({
      title: project.title || "",
      description: project.description || "",
      tech_stack: project.tech_stack || "",
      github_link: project.github_link || "",
      live_link: project.live_link || "",
      proof_link: project.proof_link || "",
      screenshots: [],
    });
    setIsFormOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildPayload = () => {
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "screenshots") {
        value.forEach((file) => payload.append("screenshots", file));
      } else {
        payload.append(key, value);
      }
    });
    return payload;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (editingProject) {
      await onUpdate(editingProject.id, buildPayload());
    } else {
      await onCreate(buildPayload());
    }
    setIsFormOpen(false);
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Projects</p>
          <h2>Portfolio proof</h2>
        </div>
        <button type="button" onClick={() => setIsFormOpen((current) => !current)}>
          {isFormOpen ? "Close" : "Add Project"}
        </button>
      </div>

      {isFormOpen && (
        <form className={styles.formGrid} onSubmit={submit}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Skill verification dashboard"
              required
            />
          </label>
          <label>
            Tech stack
            <input
              value={form.tech_stack}
              onChange={(event) => updateField("tech_stack", event.target.value)}
              placeholder="React, Django, SQLite"
              required
            />
          </label>
          <label className={styles.fullWidth}>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What did you build and why does it matter?"
              rows="4"
            />
          </label>
          <label>
            GitHub link
            <input
              type="url"
              value={form.github_link}
              onChange={(event) => updateField("github_link", event.target.value)}
              placeholder="https://github.com/..."
            />
          </label>
          <label>
            Live link
            <input
              type="url"
              value={form.live_link}
              onChange={(event) => updateField("live_link", event.target.value)}
              placeholder="https://project-demo.com"
            />
          </label>
          <label>
            Proof link
            <input
              type="url"
              value={form.proof_link}
              onChange={(event) => updateField("proof_link", event.target.value)}
              placeholder="https://case-study.com"
            />
          </label>
          <label>
            Screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                updateField("screenshots", Array.from(event.target.files || []))
              }
            />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingProject
                ? "Update Project"
                : "Create Project"}
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No projects yet</strong>
          <p>Add project proof to raise completion and unlock portfolio badges.</p>
        </div>
      ) : (
        <div className={styles.projectList}>
          {projects.map((project) => (
            <article className={styles.projectCard} key={project.id}>
              <div className={styles.projectHeader}>
                <div>
                  <h3>{project.title}</h3>
                  <p>{project.description || "No description added."}</p>
                </div>
                <span
                  className={`${styles.statusTag} ${
                    statusClassMap[project.verification_status] || styles.mutedTag
                  }`}
                >
                  {project.verification_status_label}
                </span>
              </div>
              <p className={styles.techStack}>{project.tech_stack}</p>
              {project.screenshots?.length > 0 && (
                <div className={styles.screenshotRow}>
                  {project.screenshots.slice(0, 3).map((screenshot) => (
                    <img src={screenshot} alt="" key={screenshot} />
                  ))}
                </div>
              )}
              <div className={styles.cardActions}>
                {project.live_link && (
                  <a href={project.live_link} target="_blank" rel="noreferrer">
                    View
                  </a>
                )}
                <button type="button" onClick={() => openEdit(project)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(project.id)}>
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

export default ProjectsManager;
