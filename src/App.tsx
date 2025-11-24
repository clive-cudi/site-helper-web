import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthForm } from "./components/AuthForm";
import { Dashboard } from "./components/Dashboard";
import { LandingPage } from "./components/LandingPage";
import { Loader2 } from "lucide-react";
import { useState } from "react";

function AppContent() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }


  if (user) {
    return <Dashboard />;
  }

  if (showAuth) {
    return <AuthForm />;
  }

  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
