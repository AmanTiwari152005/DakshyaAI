import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AssessmentsPanel from "../components/profileDashboard/AssessmentsPanel";
import BadgesSection from "../components/profileDashboard/BadgesSection";
import BasicInfoCard from "../components/profileDashboard/BasicInfoCard";
import EndorsementsPanel from "../components/profileDashboard/EndorsementsPanel";
import LinksCard from "../components/profileDashboard/LinksCard";
import ProfileCompletion from "../components/profileDashboard/ProfileCompletion";
import ProjectsManager from "../components/profileDashboard/ProjectsManager";
import ResumeUpload from "../components/profileDashboard/ResumeUpload";
import SkillsManager from "../components/profileDashboard/SkillsManager";
import {
  clearAuthToken,
  getApiError,
  profileDashboardApi,
} from "../services/api";
import styles from "./ProfileDashboard.module.css";

const emptyData = {
  profile: null,
  links: null,
  skills: [],
  projects: [],
  assessments: [],
  suggested_tests: [],
  badges: [],
  endorsements: [],
  missing_items: [],
  completion_percentage: 0,
  dakshya_score: 0,
};

function getInitials(nameOrEmail) {
  return (nameOrEmail || "DA")
    .split(/[ @.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProfileDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleError = useCallback(
    (err, fallback) => {
      if (err?.response?.status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }
      setError(getApiError(err, fallback));
    },
    [navigate]
  );

  const loadProfileDashboard = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const response = await profileDashboardApi.get();
      setData({ ...emptyData, ...response.data });
    } catch (err) {
      handleError(err, "Unable to load profile dashboard.");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    loadProfileDashboard();
  }, [loadProfileDashboard]);

  const profileName = data.profile?.full_name || data.profile?.email || "DakshyaAI user";
  const avatarLabel = useMemo(() => getInitials(profileName), [profileName]);

  const logout = () => {
    clearAuthToken();
    navigate("/", { replace: true });
  };

  const runMutation = async (mutation, fallback) => {
    setError("");
    setSaving(true);
    try {
      await mutation();
      await loadProfileDashboard();
    } catch (err) {
      handleError(err, fallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link className={styles.brand} to="/dashboard">
            DakshyaAI
          </Link>
          <div className={styles.navActions}>
            <Link to="/dashboard">Main Dashboard</Link>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <section className={styles.hero}>
          <div className={styles.avatar}>
            {data.profile?.profile_picture ? (
              <img src={data.profile.profile_picture} alt="" />
            ) : (
              <span>{avatarLabel}</span>
            )}
          </div>
          <div>
            <p className={styles.heroEyebrow}>Profile Dashboard</p>
            <h1>{loading ? "Loading your portfolio..." : profileName}</h1>
            <p>
              {data.profile?.target_role || "Build your verified skill portfolio"}
            </p>
            <span className={styles.optionalNote}>
              GitHub is optional for the MVP. Analysis support is coming soon.
            </span>
          </div>
          <article className={styles.scoreCard}>
            <span>Dakshya Score</span>
            <strong>{loading ? "--" : data.dakshya_score}</strong>
            <small>/100</small>
          </article>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <section className={styles.loadingCard}>
            <span />
            <span />
            <span />
          </section>
        ) : (
          <div className={styles.layout}>
            <aside className={styles.sidebar}>
              <ProfileCompletion
                completion={data.completion_percentage}
                missingItems={data.missing_items}
              />
              <LinksCard
                links={data.links}
                saving={saving}
                onSave={(payload) =>
                  runMutation(
                    () => profileDashboardApi.updateLinks(payload),
                    "Unable to update links."
                  )
                }
              />
              <ResumeUpload onSaved={loadProfileDashboard} />
              <EndorsementsPanel endorsements={data.endorsements} />
            </aside>

            <section className={styles.contentStack}>
              <BasicInfoCard
                profile={data.profile}
                saving={saving}
                onSave={(payload) =>
                  runMutation(
                    () => profileDashboardApi.updateBasicInfo(payload),
                    "Unable to update profile details."
                  )
                }
              />
              <SkillsManager
                skills={data.skills}
                saving={saving}
                onCreate={(payload) =>
                  runMutation(
                    () => profileDashboardApi.createSkill(payload),
                    "Unable to create skill."
                  )
                }
                onUpdate={(id, payload) =>
                  runMutation(
                    () => profileDashboardApi.updateSkill(id, payload),
                    "Unable to update skill."
                  )
                }
                onDelete={(id) =>
                  runMutation(
                    () => profileDashboardApi.deleteSkill(id),
                    "Unable to delete skill."
                  )
                }
              />
              <ProjectsManager
                projects={data.projects}
                saving={saving}
                onCreate={(payload) =>
                  runMutation(
                    () => profileDashboardApi.createProject(payload),
                    "Unable to create project."
                  )
                }
                onUpdate={(id, payload) =>
                  runMutation(
                    () => profileDashboardApi.updateProject(id, payload),
                    "Unable to update project."
                  )
                }
                onDelete={(id) =>
                  runMutation(
                    () => profileDashboardApi.deleteProject(id),
                    "Unable to delete project."
                  )
                }
              />
              <AssessmentsPanel
                assessments={data.assessments}
              />
              <BadgesSection badges={data.badges} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default ProfileDashboard;
