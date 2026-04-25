import styles from "../../pages/Dashboard.module.css";

const statusClassMap = {
  verified: styles.statusVerified,
  under_review: styles.statusReview,
  not_submitted: styles.statusMuted,
};

function ProjectsList({
  projects,
  loading,
  submittingId,
  onAddProject,
  onEditProject,
  onSubmitReview,
}) {
  const openProject = (project) => {
    const link = project.live_link || project.proof_link;
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrowDark}>Projects</p>
          <h2>Uploaded proof</h2>
        </div>
        <button type="button" onClick={onAddProject}>
          Add Project
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          <span />
          <span />
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No projects uploaded yet</strong>
          <p>Add a project to improve your profile completion and score.</p>
          <button type="button" onClick={onAddProject}>
            Add First Project
          </button>
        </div>
      ) : (
        <div className={styles.projectList}>
          {projects.map((project) => (
            <article className={styles.projectCard} key={project.id}>
              <div className={styles.projectTopline}>
                <div>
                  <h3>{project.title}</h3>
                  <p>{project.description || "No description added yet."}</p>
                </div>
                <span
                  className={`${styles.statusTag} ${
                    statusClassMap[project.verification_status] || styles.statusMuted
                  }`}
                >
                  {project.verification_status_label}
                </span>
              </div>

              <p className={styles.techStack}>{project.tech_stack}</p>

              <div className={styles.projectActions}>
                <button
                  type="button"
                  onClick={() => openProject(project)}
                  disabled={!project.live_link && !project.proof_link}
                >
                  View
                </button>
                <button type="button" onClick={() => onEditProject(project)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onSubmitReview(project.id)}
                  disabled={
                    submittingId === project.id ||
                    project.verification_status !== "not_submitted"
                  }
                >
                  {submittingId === project.id ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProjectsList;
