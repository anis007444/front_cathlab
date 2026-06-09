import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";
import { initCornerstone } from "@/lib/cornerstoneConfig";
initCornerstone();

import SecretaryRiskPage from "./pages/SecretaryRiskPage.tsx";
import { AdminUsersPage } from "./pages/AdminUsersPage.tsx";
import { PharmacyPage } from "./pages/PharmacyPage.tsx";
import PharmacyDashboard from "./pages/PharmacyDashboard.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import StudyPage from "./pages/StudyPage.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = String(user?.role ?? "").trim().toLowerCase();

  if (role === "pharmacien") return <Navigate to="/pharmacie-dashboard" replace />;
  if (role === "medecin" || role === "médecin") return <Navigate to="/dashboard" replace />;
  if (role === "secretaire") return <Navigate to="/secretary" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/examens" element={<ProtectedRoute><StudyPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/secretary" element={<ProtectedRoute><SecretaryRiskPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/pharmacie-dashboard" element={<ProtectedRoute><PharmacyDashboard /></ProtectedRoute>} />
            <Route path="/pharmacie" element={<ProtectedRoute><PharmacyPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
