import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import ProfileDashboard from "./pages/ProfileDashboard";
import ProfileSetup from "./pages/ProfileSetup";
import Register from "./pages/Register";
import RecruiterApplicationDetail from "./pages/RecruiterApplicationDetail";
import RecruiterApplications from "./pages/RecruiterApplications";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterJobs from "./pages/RecruiterJobs";
import RecruiterProfileSetup from "./pages/RecruiterProfileSetup";
import SkillTest from "./pages/SkillTest";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/signup" element={<Navigate to="/register" replace />} />

      <Route element={<ProtectedRoute allowedAccountTypes={["candidate"]} />}>
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/profile-dashboard" element={<ProfileDashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/skill-test/:skillName" element={<SkillTest />} />
      </Route>

      <Route element={<ProtectedRoute allowedAccountTypes={["recruiter"]} />}>
        <Route path="/recruiter-profile-setup" element={<RecruiterProfileSetup />} />
        <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
        <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
        <Route path="/recruiter/applications" element={<RecruiterApplications />} />
        <Route
          path="/recruiter/applications/:id"
          element={<RecruiterApplicationDetail />}
        />
      </Route>
    </Routes>
  );
}

export default App;
