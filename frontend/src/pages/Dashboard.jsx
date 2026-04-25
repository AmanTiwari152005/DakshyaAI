import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BadgesPanel from "../components/dashboard/BadgesPanel";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import ProjectsList from "../components/dashboard/ProjectsList";
import QuickActions from "../components/dashboard/QuickActions";
import SkillProgress from "../components/dashboard/SkillProgress";
import StatsCards from "../components/dashboard/StatsCards";
import {
  clearAuthToken,
  dashboardApi,
  getApiError,
  projectsApi,
  skillsApi,
} from "../services/api";
import styles from "./Dashboard.module.css";

const initialProjectForm = {
  title: "",
  description: "",
  tech_stack: "",
  live_link: "",
  proof_link: "",
};

const initialSkillForm = {
  name: "",
  level: "Intermediate",
  progress_score: 75,
  verification_status: "not_tested",
  source: "manual",
};

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeForm, setActiveForm] = useState(null);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [skillForm, setSkillForm] = useState(initialSkillForm);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);

  const loadDashboard = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const [summaryResponse, skillsResponse, projectsResponse, badgesResponse] =
        await Promise.all([
          dashboardApi.summary(),
          dashboardApi.skills(),
          dashboardApi.projects(),
          dashboardApi.badges(),
        ]);

      setSummary(summaryResponse.data);
      setSkills(skillsResponse.data);
      setProjects(projectsResponse.data);
      setBadges(badgesResponse.data);
    } catch (err) {
      setError(getApiError(err, "Unable to load dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => summary?.stats || {}, [summary]);

  const logout = () => {
    clearAuthToken();
    navigate("/", { replace: true });
  };

  const openProjectForm = (project = null) => {
    setEditingProject(project);
    setProjectForm(
      project
        ? {
            title: project.title || "",
            description: project.description || "",
            tech_stack: project.tech_stack || "",
            live_link: project.live_link || "",
            proof_link: project.proof_link || "",
          }
        : initialProjectForm
    );
    setActiveForm("project");
  };

  const openSkillForm = () => {
    setSkillForm(initialSkillForm);
    setActiveForm("skill");
  };

  const closeForm = () => {
    setActiveForm(null);
    setEditingProject(null);
    setError("");
  };

  const updateProjectForm = (field, value) => {
    setProjectForm((current) => ({ ...current, [field]: value }));
  };

  const updateSkillForm = (field, value) => {
    setSkillForm((current) => ({ ...current, [field]: value }));
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, projectForm);
      } else {
        await projectsApi.create(projectForm);
      }
      closeForm();
      await loadDashboard();
    } catch (err) {
      setError(getApiError(err, "Unable to save project."));
    } finally {
      setSaving(false);
    }
  };

  const saveSkill = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await skillsApi.create({
        ...skillForm,
        progress_score: Number(skillForm.progress_score),
      });
      closeForm();
      await loadDashboard();
    } catch (err) {
      setError(getApiError(err, "Unable to save skill."));
    } finally {
      setSaving(false);
    }
  };

  const submitProjectReview = async (projectId) => {
    setError("");
    setSubmittingId(projectId);

    try {
      await projectsApi.submitReview(projectId);
      await loadDashboard();
    } catch (err) {
      setError(getApiError(err, "Unable to submit project for review."));
    } finally {
      setSubmittingId(null);
    }
  };

  const scrollToBadges = () => {
    document.getElementById("badges")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DashboardHeader
          summary={summary}
          loading={loading}
          onAddProject={() => openProjectForm()}
          onAddSkill={openSkillForm}
          onLogout={logout}
        />

        {error && <p className={styles.error}>{error}</p>}

        {activeForm && (
          <section className={styles.formPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrowDark}>
                  {activeForm === "project" ? "Project Proof" : "Skill Proof"}
                </p>
                <h2>
                  {activeForm === "project"
                    ? editingProject
                      ? "Edit Project"
                      : "Add New Project"
                    : "Add Skill"}
                </h2>
              </div>
              <button type="button" onClick={closeForm}>
                Close
              </button>
            </div>

            {activeForm === "project" ? (
              <form className={styles.entityForm} onSubmit={saveProject}>
                <label>
                  Project title
                  <input
                    value={projectForm.title}
                    onChange={(event) => updateProjectForm("title", event.target.value)}
                    placeholder="AI Resume Analyzer"
                    required
                  />
                </label>
                <label>
                  Tech stack
                  <input
                    value={projectForm.tech_stack}
                    onChange={(event) =>
                      updateProjectForm("tech_stack", event.target.value)
                    }
                    placeholder="React, Django, SQLite"
                    required
                  />
                </label>
                <label className={styles.fullWidth}>
                  Description
                  <textarea
                    value={projectForm.description}
                    onChange={(event) =>
                      updateProjectForm("description", event.target.value)
                    }
                    placeholder="What problem does this project solve?"
                    rows="3"
                  />
                </label>
                <label>
                  Live link
                  <input
                    type="url"
                    value={projectForm.live_link}
                    onChange={(event) =>
                      updateProjectForm("live_link", event.target.value)
                    }
                    placeholder="https://example.com"
                  />
                </label>
                <label>
                  Proof link
                  <input
                    type="url"
                    value={projectForm.proof_link}
                    onChange={(event) =>
                      updateProjectForm("proof_link", event.target.value)
                    }
                    placeholder="https://github.com/..."
                  />
                </label>
                <button className={styles.primaryButton} type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingProject ? "Save Project" : "Add Project"}
                </button>
              </form>
            ) : (
              <form className={styles.entityForm} onSubmit={saveSkill}>
                <label>
                  Skill name
                  <input
                    value={skillForm.name}
                    onChange={(event) => updateSkillForm("name", event.target.value)}
                    placeholder="React"
                    required
                  />
                </label>
                <label>
                  Level
                  <select
                    value={skillForm.level}
                    onChange={(event) => updateSkillForm("level", event.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </label>
                <label>
                  Progress score
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={skillForm.progress_score}
                    onChange={(event) =>
                      updateSkillForm("progress_score", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Status
                  <select
                    value={skillForm.verification_status}
                    onChange={(event) =>
                      updateSkillForm("verification_status", event.target.value)
                    }
                  >
                    <option value="verified">Verified</option>
                    <option value="in_review">In Review</option>
                    <option value="not_tested">Not Tested</option>
                  </select>
                </label>
                <label>
                  Source
                  <select
                    value={skillForm.source}
                    onChange={(event) => updateSkillForm("source", event.target.value)}
                  >
                    <option value="ai">AI</option>
                    <option value="test">Test</option>
                    <option value="peer">Peer</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>
                <button className={styles.primaryButton} type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Add Skill"}
                </button>
              </form>
            )}
          </section>
        )}

        <StatsCards stats={stats} loading={loading} />

        <div className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <QuickActions
              onAddProject={() => openProjectForm()}
              onAddSkill={openSkillForm}
              onViewBadges={scrollToBadges}
            />
            <SkillProgress
              skills={skills}
              loading={loading}
              onAddSkill={openSkillForm}
            />
          </div>

          <div className={styles.rightColumn}>
            <ProjectsList
              projects={projects}
              loading={loading}
              submittingId={submittingId}
              onAddProject={() => openProjectForm()}
              onEditProject={openProjectForm}
              onSubmitReview={submitProjectReview}
            />
            <BadgesPanel badges={badges} loading={loading} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
