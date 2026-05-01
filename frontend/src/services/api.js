import axios from "axios";

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL.replace(/\/$/, "")}/api`;

export const AUTH_TOKEN_KEY = "dakshyaai_auth_token";
export const ACCOUNT_TYPE_KEY = "dakshyaai_account_type";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else {
      delete config.headers["Content-Type"];
    }
  }
  return config;
});

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function setAccountType(accountType) {
  if (accountType) {
    localStorage.setItem(ACCOUNT_TYPE_KEY, accountType);
  }
}

export function getAccountType() {
  return localStorage.getItem(ACCOUNT_TYPE_KEY) || "candidate";
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_TYPE_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function getApiError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];

    if (Array.isArray(firstValue)) {
      return firstValue[0];
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return fallback;
}

export const authApi = {
  signup: ({ email, password, confirmPassword, accountType }) =>
    api.post("/auth/signup/", {
      email,
      password,
      confirm_password: confirmPassword,
      account_type: accountType,
      role: accountType,
  }),
  login: ({ email, password }) => api.post("/auth/login/", { email, password }),
  logout: () => api.post("/auth/logout/"),
};

export const profileApi = {
  setup: (payload) => api.post("/profile/setup/", payload),
  me: () => api.get("/profile/me/"),
};

export const dashboardApi = {
  summary: () => api.get("/dashboard/summary/"),
  skills: () => api.get("/dashboard/skills/"),
  projects: () => api.get("/dashboard/projects/"),
  badges: () => api.get("/dashboard/badges/"),
};

export const candidateApi = {
  jobs: () => api.get("/candidate/jobs/"),
  applyToJob: (id, payload) => api.post(`/candidate/jobs/${id}/apply/`, payload),
  applications: () => api.get("/candidate/applications/"),
  projectValidations: () => api.get("/candidate/project-validations/"),
};

export const recruiterApi = {
  getProfile: () => api.get("/recruiter/profile/"),
  saveProfile: (payload) => api.post("/recruiter/profile/", payload),
  jobs: () => api.get("/recruiter/jobs/"),
  createJob: (payload) => api.post("/recruiter/jobs/", payload),
  updateJob: (id, payload) => api.patch(`/recruiter/jobs/${id}/`, payload),
  deleteJob: (id) => api.delete(`/recruiter/jobs/${id}/`),
  applications: () => api.get("/recruiter/applications/"),
  applicationDetail: (id) => api.get(`/recruiter/applications/${id}/`),
  validateProject: (payload) => api.post("/recruiter/project-validation/", payload),
};

export const skillsApi = {
  create: (payload) => api.post("/skills/", payload),
  update: (id, payload) => api.patch(`/skills/${id}/`, payload),
};

export const projectsApi = {
  create: (payload) => api.post("/projects/", payload),
  update: (id, payload) => api.patch(`/projects/${id}/`, payload),
  submitReview: (id) => api.post(`/projects/${id}/submit-review/`),
};

export function generateQuiz(skillName, difficulty = "intermediate") {
  return api.post("/quiz/generate/", {
    skill_name: skillName,
    difficulty,
  });
}

export function submitQuiz(skillName, answers, quiz) {
  return api.post("/quiz/submit/", {
    skill_name: skillName,
    answers,
    quiz,
  });
}

export function checkQuizLock(skillName) {
  return api.post("/quiz/check-lock/", {
    skill_name: skillName,
  });
}

export function sendAntiCheatWarning(skillName, reason) {
  return api.post("/quiz/anti-cheat-warning/", {
    skill_name: skillName,
    reason,
  });
}

export function resetQuizWarnings(skillName) {
  return api.post("/quiz/reset-warnings/", {
    skill_name: skillName,
  });
}

export function sendEvaMessage(message) {
  return api.post("/eva/chat/", { message });
}

export function startEvaInterview(mode = "voice") {
  return api.post("/eva/interview/start/", { mode });
}

export function submitEvaInterviewAnswer(payload) {
  return api.post("/eva/interview/answer/", payload);
}

export function endEvaInterview(payload) {
  return api.post("/eva/interview/end/", payload);
}

export function uploadResume(file) {
  const payload = new FormData();
  payload.append("resume", file);
  return api.post("/resume-upload/", payload);
}

export function confirmResumeSave({ resumeUploadId, structuredData }) {
  return api.post("/resume-confirm-save/", {
    resume_upload_id: resumeUploadId,
    structured_data: structuredData,
  });
}

export const profileDashboardApi = {
  get: () => api.get("/profile-dashboard/"),
  updateBasicInfo: (payload) =>
    api.patch("/profile-dashboard/basic-info/", payload),
  updateLinks: (payload) => api.patch("/profile-dashboard/links/", payload),
  createSkill: (payload) => api.post("/profile-dashboard/skills/", payload),
  updateSkill: (id, payload) =>
    api.patch(`/profile-dashboard/skills/${id}/`, payload),
  deleteSkill: (id) => api.delete(`/profile-dashboard/skills/${id}/`),
  createProject: (payload) => api.post("/profile-dashboard/projects/", payload),
  updateProject: (id, payload) =>
    api.patch(`/profile-dashboard/projects/${id}/`, payload),
  deleteProject: (id) => api.delete(`/profile-dashboard/projects/${id}/`),
  assessments: () => api.get("/profile-dashboard/assessments/"),
  endorsements: () => api.get("/profile-dashboard/endorsements/"),
};

export default api;
