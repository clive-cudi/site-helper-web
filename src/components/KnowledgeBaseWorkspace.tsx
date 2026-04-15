import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { useTeam } from "../contexts/TeamContext";
import { supabase, type KnowledgeBase, type Website } from "../lib/supabase";
import {
  ensureKnowledgeBase,
  getOrCreateCanonicalWebsite,
  updateWebsiteUrl,
} from "../services/website";

type ScrapeMode = "append" | "replace";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export function KnowledgeBaseWorkspace() {
  const { businessAccount, hasPermission, currentMember } = useTeam();
  const canEditKb = hasPermission("edit_knowledge_bases");
  const canEditBusinessInfo = currentMember?.role === "owner";
  const canReplace = useMemo(() => {
    return currentMember?.role === "owner" || currentMember?.role === "admin";
  }, [currentMember?.role]);

  const [website, setWebsite] = useState<Website | null>(null);
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [websiteUrlInput, setWebsiteUrlInput] = useState("");
  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    phone: "",
    contactEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateRegion: "",
    postalCode: "",
    country: "",
    supportHours: "",
    businessDescription: "",
  });
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadWorkspace = useCallback(async () => {
    if (!businessAccount) return;

    try {
      setLoading(true);
      setError("");

      const websiteData = await getOrCreateCanonicalWebsite(businessAccount, {
        createIfMissing: true,
      });
      if (!websiteData) {
        throw new Error("Failed to initialize website workspace");
      }

      setWebsite(websiteData);
      setWebsiteUrlInput(websiteData.url ?? "");

      const kbData = await ensureKnowledgeBase(websiteData.id);
      setKb(kbData);
      setContent(kbData.content || "");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load knowledge base workspace"));
    } finally {
      setLoading(false);
    }
  }, [businessAccount]);

  useEffect(() => {
    if (businessAccount) {
      void loadWorkspace();
    } else {
      setLoading(false);
    }
  }, [businessAccount, loadWorkspace]);

  useEffect(() => {
    if (!businessAccount) return;
    setBusinessInfo({
      name: businessAccount.name || "",
      phone: businessAccount.phone || "",
      contactEmail: businessAccount.contact_email || "",
      addressLine1: businessAccount.address_line_1 || "",
      addressLine2: businessAccount.address_line_2 || "",
      city: businessAccount.city || "",
      stateRegion: businessAccount.state_region || "",
      postalCode: businessAccount.postal_code || "",
      country: businessAccount.country || "",
      supportHours: businessAccount.support_hours || "",
      businessDescription: businessAccount.business_description || "",
    });
  }, [businessAccount]);

  const handleSaveContent = async () => {
    if (!kb || !canEditKb) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { error: updateError } = await supabase
        .from("knowledge_bases")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", kb.id);

      if (updateError) throw updateError;
      setMessage("Knowledge base saved.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save knowledge base"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWebsiteUrl = async () => {
    if (!website || !canEditKb) return;

    try {
      setError("");
      setMessage("");
      const updated = await updateWebsiteUrl(website.id, websiteUrlInput);
      setWebsite(updated);
      setWebsiteUrlInput(updated.url ?? "");
      setMessage("Website URL updated.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update website URL"));
    }
  };

  const handleSaveBusinessInfo = async () => {
    if (!businessAccount || !canEditBusinessInfo) return;

    try {
      setSavingBusinessInfo(true);
      setError("");
      setMessage("");

      const { error: updateError } = await supabase
        .from("business_accounts")
        .update({
          name: businessInfo.name.trim(),
          phone: businessInfo.phone.trim() || null,
          contact_email: businessInfo.contactEmail.trim() || null,
          address_line_1: businessInfo.addressLine1.trim() || null,
          address_line_2: businessInfo.addressLine2.trim() || null,
          city: businessInfo.city.trim() || null,
          state_region: businessInfo.stateRegion.trim() || null,
          postal_code: businessInfo.postalCode.trim() || null,
          country: businessInfo.country.trim() || null,
          support_hours: businessInfo.supportHours.trim() || null,
          business_description: businessInfo.businessDescription.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessAccount.id);

      if (updateError) throw updateError;
      setMessage("Business information updated.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update business information"));
    } finally {
      setSavingBusinessInfo(false);
    }
  };

  const handleScrape = async (mode: ScrapeMode) => {
    if (!website || !canEditKb) return;
    if (!websiteUrlInput.trim()) {
      setError("Enter a website URL before scraping.");
      return;
    }
    if (mode === "replace" && !canReplace) {
      setError("You don't have permission to replace existing KB content.");
      return;
    }

    try {
      setScraping(true);
      setError("");
      setMessage("");

      const updatedWebsite = await updateWebsiteUrl(
        website.id,
        websiteUrlInput,
      );
      setWebsite(updatedWebsite);
      setWebsiteUrlInput(updatedWebsite.url ?? "");

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-website`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId: website.id,
          url: updatedWebsite.url,
          mode,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Scrape request failed");
      }

      const refreshedKb = await ensureKnowledgeBase(website.id);
      setKb(refreshedKb);
      setContent(refreshedKb.content || "");
      setMessage(
        mode === "replace"
          ? "Website content scraped and replaced successfully."
          : "Website content scraped and appended successfully.",
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to scrape website"));
    } finally {
      setScraping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Knowledge Base</h2>
          <button
            onClick={() => void loadWorkspace()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Edit your business knowledge directly. Scrape your website content
          when needed.
        </p>

        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {message}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Business Information
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Add detailed business details that can be used in customer responses
          and internal knowledge context.
        </p>

        {!canEditBusinessInfo && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Only the business owner can edit business information.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessInfo.name}
              onChange={(e) =>
                setBusinessInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={businessInfo.contactEmail}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  contactEmail: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="support@business.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={businessInfo.phone}
              onChange={(e) =>
                setBusinessInfo((prev) => ({ ...prev, phone: e.target.value }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Support Hours
            </label>
            <input
              type="text"
              value={businessInfo.supportHours}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  supportHours: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Mon-Fri, 8:00 AM - 6:00 PM"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 1
            </label>
            <input
              type="text"
              value={businessInfo.addressLine1}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  addressLine1: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Street address"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={businessInfo.addressLine2}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  addressLine2: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Suite, unit, building (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              value={businessInfo.city}
              onChange={(e) =>
                setBusinessInfo((prev) => ({ ...prev, city: e.target.value }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State / Region
            </label>
            <input
              type="text"
              value={businessInfo.stateRegion}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  stateRegion: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="State or region"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              value={businessInfo.postalCode}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  postalCode: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Postal code"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              value={businessInfo.country}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  country: e.target.value,
                }))
              }
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Country"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Description
            </label>
            <textarea
              value={businessInfo.businessDescription}
              onChange={(e) =>
                setBusinessInfo((prev) => ({
                  ...prev,
                  businessDescription: e.target.value,
                }))
              }
              rows={4}
              disabled={!canEditBusinessInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              placeholder="Share what your business does, who you serve, and key details."
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => void handleSaveBusinessInfo()}
            disabled={savingBusinessInfo || !canEditBusinessInfo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingBusinessInfo && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {savingBusinessInfo ? "Saving..." : "Save Business Information"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Knowledge Base Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={22}
          disabled={!canEditKb}
          placeholder="Add policies, FAQs, product details, and support guidance for your assistant."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:opacity-60"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={() => void handleSaveContent()}
            disabled={saving || !canEditKb}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Website Scraper</h2>
          <button
            onClick={() => void loadWorkspace()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Scrape your website content and automatically add it to your Knowledge
          Base.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Website URL (optional)
            </label>
            <input
              type="url"
              value={websiteUrlInput}
              onChange={(e) => setWebsiteUrlInput(e.target.value)}
              placeholder="https://example.com"
              disabled={!canEditKb}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
            />
          </div>
          <button
            onClick={() => void handleSaveWebsiteUrl()}
            disabled={!canEditKb}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save URL
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => void handleScrape("append")}
            disabled={scraping || !canEditKb}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scraping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Scrape and Append
          </button>
          <button
            onClick={() => void handleScrape("replace")}
            disabled={scraping || !canEditKb || !canReplace}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scraping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Replace with Scrape
          </button>
        </div>

        {kb?.summary && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-1">Summary</h3>
            <p className="text-sm text-blue-800">{kb.summary}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
