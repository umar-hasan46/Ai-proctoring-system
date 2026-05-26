import React from "react";
import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const role = localStorage.getItem("role") || localStorage.getItem("userRole");

  if (!token || isAuthenticated !== "true") {
    return <Navigate to="/login" replace />;
  }
  
  if (role !== "admin") {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
}

export default AdminProtectedRoute;
