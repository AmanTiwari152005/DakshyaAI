import { useState } from "react";
import {
  confirmResumeSave,
  getApiError,
  uploadResume,
} from "../../services/api";
import styles from "../../pages/ProfileDashboard.module.css";

const sectionLabels = {
  certifications: "Certifications",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
};

function ResumeListSection({ title, items }) {
  return (
    <article className={styles.resumeSectionCard}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.resumeEmpty}>No items detected.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ResumeUpload({ onSaved }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resumeUploadId, setResumeUploadId] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [structuredData, setStructuredData] = useState(null);
  const [showRawText, setShowRawText] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setError("");
    setMessage("");
    setExtractedText("");
    setStructuredData(null);
    setResumeUploadId(null);
    setFileUrl("");
    setShowRawText(false);

    const isPdf =
      selectedFile &&
      (selectedFile.type === "application/pdf" ||
        selectedFile.name.toLowerCase().endsWith(".pdf"));

    if (selectedFile && !isPdf) {
      setFile(null);
      setError("Only PDF resumes are supported.");
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!file) {
      setError("Please select a PDF resume file.");
      return;
    }

    setLoading(true);
    try {
      const response = await uploadResume(file);
      setResumeUploadId(response.data.resume_upload_id);
      setFileUrl(response.data.file_url || "");
      setExtractedText(response.data.extracted_text || "");
      setStructuredData(response.data.structured_data || null);
    } catch (err) {
      setError(getApiError(err, "Unable to extract resume text."));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExtractedData = async () => {
    setError("");
    setMessage("");

    if (!resumeUploadId || !structuredData) {
      setError("Analyze a resume before saving extracted data.");
      return;
    }

    setSaving(true);
    try {
      await confirmResumeSave({
        resumeUploadId,
        structuredData,
      });
      setMessage("Extracted resume data saved to your profile.");
      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      setError(getApiError(err, "Unable to save extracted resume data."));
    } finally {
      setSaving(false);
    }
  };

  const basicInfo = structuredData?.basic_info || {};
  const links = structuredData?.links || {};

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Resume Upload</p>
          <h2>Extract resume data</h2>
        </div>
      </div>

      <form className={styles.resumeForm} onSubmit={handleSubmit}>
        <label>
          Upload PDF resume
          <input type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
        </label>

        {error && <p className={styles.localError}>{error}</p>}
        {message && <p className={styles.localSuccess}>{message}</p>}

        <button className={styles.primaryButton} type="submit" disabled={loading}>
          {loading ? "Extracting resume..." : "Analyze Resume"}
        </button>
      </form>

      {structuredData && (
        <div className={styles.resumeStructuredResult}>
          <div className={styles.resumeResultHeader}>
            <div>
              <strong>Extracted Resume Data</strong>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  View saved resume
                </a>
              )}
            </div>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handleSaveExtractedData}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Extracted Data to Profile"}
            </button>
          </div>

          <div className={styles.resumeSectionGrid}>
            <article className={styles.resumeSectionCard}>
              <h3>Basic Info</h3>
              <dl className={styles.basicInfoList}>
                <div>
                  <dt>Name</dt>
                  <dd>{basicInfo.name || "Not detected"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{basicInfo.email || "Not detected"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{basicInfo.phone || "Not detected"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{basicInfo.location || "Not detected"}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{basicInfo.role || "Not detected"}</dd>
                </div>
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

            {Object.entries(sectionLabels).map(([key, label]) => (
              <ResumeListSection
                title={label}
                items={structuredData[key] || []}
                key={key}
              />
            ))}

            <article className={styles.resumeSectionCard}>
              <h3>Links</h3>
              <dl className={styles.basicInfoList}>
                <div>
                  <dt>GitHub</dt>
                  <dd>{links.github || "Not detected"}</dd>
                </div>
                <div>
                  <dt>LinkedIn</dt>
                  <dd>{links.linkedin || "Not detected"}</dd>
                </div>
              </dl>
            </article>
          </div>

          {extractedText && (
            <div className={styles.rawTextWrap}>
              <button
                className={styles.rawToggle}
                type="button"
                onClick={() => setShowRawText((current) => !current)}
              >
                {showRawText ? "Hide Raw Extracted Text" : "View Raw Extracted Text"}
              </button>
              {showRawText && (
                <pre className={styles.resumeTextBox}>{extractedText}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ResumeUpload;
