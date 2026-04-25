import { useState } from "react";
import {
  confirmResumeSave,
  getApiError,
  uploadResume,
} from "../../services/api";
import styles from "../../pages/ProfileDashboard.module.css";

const infoFields = [
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["location", "Location"],
  ["role", "Role"],
];

function SectionList({ title, items }) {
  return (
    <article className={styles.resumeSectionCard}>
      <h3>{title}</h3>
      {items?.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{typeof item === "string" ? item : item.title}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.resumeEmpty}>No data detected.</p>
      )}
    </article>
  );
}

function ResumeUpload({ onSaved }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const structuredData = result?.structured_data || {};

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select a PDF resume.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF resumes are supported.");
      return;
    }

    setLoading(true);
    try {
      const response = await uploadResume(file);
      setResult(response.data);
      setShowRaw(false);
    } catch (err) {
      setError(getApiError(err, "Unable to extract resume data."));
    } finally {
      setLoading(false);
    }
  };

  const saveExtractedData = async () => {
    if (!result?.resume_upload_id || !result?.structured_data) {
      setError("Analyze a resume before saving extracted data.");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await confirmResumeSave({
        resumeUploadId: result.resume_upload_id,
        structuredData: result.structured_data,
      });
      setSuccess(response.data.message || "Extracted data saved.");
      onSaved?.();
    } catch (err) {
      setError(getApiError(err, "Unable to save extracted resume data."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Resume Upload</p>
          <h2>Extract resume data</h2>
        </div>
      </div>

      <form className={styles.resumeForm} onSubmit={submit}>
        <label>
          Upload PDF resume
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        <button className={styles.primaryButton} type="submit" disabled={loading}>
          {loading ? "Extracting resume..." : "Analyze Resume"}
        </button>
      </form>

      {error && <p className={styles.localError}>{error}</p>}
      {success && <p className={styles.localSuccess}>{success}</p>}

      {result && (
        <div className={styles.resumeStructuredResult}>
          <div className={styles.resumeResultHeader}>
            <div>
              <strong>Extracted Resume Data</strong>
              {result.file_url && (
                <a href={result.file_url} target="_blank" rel="noreferrer">
                  View saved resume
                </a>
              )}
            </div>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={saveExtractedData}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Extracted Data to Profile"}
            </button>
          </div>

          <div className={styles.resumeSectionGrid}>
            <article className={styles.resumeSectionCard}>
              <h3>Basic Info</h3>
              <dl className={styles.basicInfoList}>
                {infoFields.map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{structuredData.basic_info?.[key] || "Not detected"}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className={styles.resumeSectionCard}>
              <h3>Skills</h3>
              {structuredData.skills?.length ? (
                <div className={styles.resumeSkillChips}>
                  {structuredData.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              ) : (
                <p className={styles.resumeEmpty}>No skills detected.</p>
              )}
            </article>

            <SectionList title="Certifications" items={structuredData.certifications} />
            <SectionList title="Education" items={structuredData.education} />
            <SectionList title="Experience" items={structuredData.experience} />
            <SectionList title="Projects" items={structuredData.projects} />

            <article className={styles.resumeSectionCard}>
              <h3>Links</h3>
              <dl className={styles.basicInfoList}>
                <div>
                  <dt>GitHub</dt>
                  <dd>{structuredData.links?.github || "Not detected"}</dd>
                </div>
                <div>
                  <dt>LinkedIn</dt>
                  <dd>{structuredData.links?.linkedin || "Not detected"}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div className={styles.rawTextWrap}>
            <button
              className={styles.rawToggle}
              type="button"
              onClick={() => setShowRaw((current) => !current)}
            >
              {showRaw ? "Hide Raw Extracted Text" : "View Raw Extracted Text"}
            </button>
            {showRaw && (
              <pre className={styles.resumeTextBox}>
                {result.extracted_text || "No extracted text returned."}
              </pre>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ResumeUpload;
