import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiError, recruiterApi } from "../services/api";
import styles from "./Recruiter.module.css";

const initialJob = {
  title: "",
  role: "",
  description: "",
  required_skills: "",
  experience_level: "",
  location: "",
  job_type: "full-time",
  is_active: true,
};

function RecruiterJobs() {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(initialJob);
  const [editingJob, setEditingJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await recruiterApi.jobs();
      setJobs(response.data);
    } catch (err) {
      setError(getApiError(err, "Unable to load jobs."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEdit = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title || "",
      role: job.role || "",
      description: job.description || "",
      required_skills: job.required_skills || "",
      experience_level: job.experience_level || "",
      location: job.location || "",
      job_type: job.job_type || "full-time",
      is_active: Boolean(job.is_active),
    });
  };

  const resetForm = () => {
    setEditingJob(null);
    setForm(initialJob);
  };

  const submitJob = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingJob) {
        await recruiterApi.updateJob(editingJob.id, form);
      } else {
        await recruiterApi.createJob(form);
      }
      resetForm();
      await loadJobs();
    } catch (err) {
      setError(getApiError(err, "Unable to save job."));
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (jobId) => {
    setError("");
    try {
      await recruiterApi.deleteJob(jobId);
      await loadJobs();
    } catch (err) {
      setError(getApiError(err, "Unable to delete job."));
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar}>
          <Link className={styles.brand} to="/recruiter-dashboard">
            DakshyaAI Recruiter
          </Link>
          <div className={styles.navActions}>
            <Link to="/recruiter-dashboard">Dashboard</Link>
            <Link to="/recruiter/applications">Applications</Link>
          </div>
        </nav>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.grid}>
          <section className={styles.formCard}>
            <p className={styles.eyebrowDark}>Job Posting</p>
            <h2>{editingJob ? "Edit job" : "Create job"}</h2>
            <form className={styles.form} onSubmit={submitJob}>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  required
                />
              </label>
              <label>
                Role
                <input
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  required
                />
              </label>
              <label className={styles.fullWidth}>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  required
                />
              </label>
              <label>
                Required skills
                <input
                  value={form.required_skills}
                  onChange={(event) =>
                    updateField("required_skills", event.target.value)
                  }
                  placeholder="React, Django, REST API"
                  required
                />
              </label>
              <label>
                Experience level
                <input
                  value={form.experience_level}
                  onChange={(event) =>
                    updateField("experience_level", event.target.value)
                  }
                />
              </label>
              <label>
                Location
                <input
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                />
              </label>
              <label>
                Job type
                <select
                  value={form.job_type}
                  onChange={(event) => updateField("job_type", event.target.value)}
                >
                  <option value="internship">Internship</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                />
                Active job
              </label>
              <button className={styles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Saving..." : editingJob ? "Save Job" : "Post Job"}
              </button>
              {editingJob && (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrowDark}>Posted Jobs</p>
            <h2>Open roles</h2>
            {loading ? (
              <div className={styles.empty}>Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className={styles.empty}>No jobs posted yet.</div>
            ) : (
              <div className={styles.list}>
                {jobs.map((job) => (
                  <article className={styles.item} key={job.id}>
                    <div className={styles.itemHeader}>
                      <div>
                        <h3>{job.title}</h3>
                        <p>{job.role} · {job.location || "Flexible"}</p>
                      </div>
                      <span className={job.is_active ? styles.tagGreen : styles.tag}>
                        {job.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p>{job.description}</p>
                    <div className={styles.meta}>
                      <span>{job.required_skills}</span>
                      <span>{job.applications_count || 0} applications</span>
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => startEdit(job)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.dangerButton}
                        type="button"
                        onClick={() => deleteJob(job.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default RecruiterJobs;
