import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { TeamProvider, useTeam } from "./contexts/TeamContext";
import { AuthForm } from "./components/AuthForm";
import { Dashboard } from "./components/Dashboard";
import { LandingPage } from "./components/LandingPage";
import { AcceptInvite } from "./components/AcceptInvite";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { loading: teamLoading } = useTeam();
  const [showAuth, setShowAuth] = useState(false);

  // Wait for both auth and team data to load
  if (authLoading || (user && teamLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route
        path="/"
        element={
          user ? (
            <Dashboard />
          ) : showAuth ? (
            <AuthForm />
          ) : (
            <LandingPage onGetStarted={() => setShowAuth(true)} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <AppContent />
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
