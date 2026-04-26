import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAccountType, isAuthenticated } from "../services/api";

function ProtectedRoute({ allowedAccountTypes }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    Array.isArray(allowedAccountTypes) &&
    allowedAccountTypes.length > 0 &&
    !allowedAccountTypes.includes(getAccountType())
  ) {
    return (
      <Navigate
        to={getAccountType() === "recruiter" ? "/recruiter-dashboard" : "/dashboard"}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
