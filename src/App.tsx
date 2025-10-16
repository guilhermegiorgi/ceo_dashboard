import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { LanguageProvider } from "./contexts/LanguageContext";
import BusinessIntelligenceHub from "./components/BusinessIntelligenceHub";

import KnowledgeGraphPage from "./pages/KnowledgeGraphPage";
import DecisionJournalPage from "./pages/DecisionJournalPage";
import ProjectsPage from "./pages/ProjectsPage";
import StrategicSessionPlanner from "./components/StrategicSessionPlanner";
import AgentsPage from "./pages/AgentsPage";
import { Toaster } from "react-hot-toast";

import { APIProvider } from "./hooks/useAPI";
import { SettingsModalProvider } from "./contexts/SettingsModalContext";

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = localStorage.getItem("token");
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <APIProvider>
      <SettingsModalProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              {/* Rotas aninhadas que serão renderizadas dentro do Outlet do DashboardLayout */}
              <Route index element={<BusinessIntelligenceHub />} />
              
              <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
              <Route
                path="decision-journal"
                element={<DecisionJournalPage />}
              />
              <Route path="projects" element={<ProjectsPage />} />
              <Route
                path="session-planner"
                element={<StrategicSessionPlanner />}
              />
              <Route path="agents" element={<AgentsPage />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#334155", // slate-700
                color: "#f1f5f9", // slate-100
                border: "1px solid #475569", // slate-600
              },
              success: {
                iconTheme: {
                  primary: "#10b981", // emerald-500
                  secondary: "#f1f5f9", // slate-100
                },
              },
              error: {
                iconTheme: {
                  primary: "#f43f5e", // rose-500
                  secondary: "#f1f5f9", // slate-100
                },
              },
            }}
          />
        </LanguageProvider>
      </SettingsModalProvider>
    </APIProvider>
  );
}

export default App;
