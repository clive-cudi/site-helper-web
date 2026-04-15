import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTeam } from "../contexts/TeamContext";
import { type Website } from "../lib/supabase";
import { getOrCreateCanonicalWebsite } from "../services/website";
import { WidgetCodeModal } from "./WidgetCodeModal";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Failed to load widget setup";
}

export function SettingsPanel() {
  const { businessAccount } = useTeam();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loadingWidget, setLoadingWidget] = useState(false);
  const [error, setError] = useState("");
  const [showWidgetCode, setShowWidgetCode] = useState(false);

  const handleOpenWidgetCode = async () => {
    if (!businessAccount) return;

    try {
      setLoadingWidget(true);
      setError("");
      const canonicalWebsite = await getOrCreateCanonicalWebsite(businessAccount, {
        createIfMissing: true,
      });
      setWebsite(canonicalWebsite);
      setShowWidgetCode(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingWidget(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600 mb-6">Manage deployment and installation options.</p>

        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-1">Install Widget</h3>
          <p className="text-sm text-gray-600 mb-4">
            Copy the script/component snippet and install SiteHelper on your website.
          </p>
          <button
            onClick={() => void handleOpenWidgetCode()}
            disabled={loadingWidget}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingWidget && <Loader2 className="w-4 h-4 animate-spin" />}
            Open Install Widget
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {showWidgetCode && website && (
        <WidgetCodeModal
          website={website}
          onClose={() => {
            setShowWidgetCode(false);
          }}
        />
      )}
    </>
  );
}
