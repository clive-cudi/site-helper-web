import { supabase, type BusinessAccount, type KnowledgeBase, type Website } from "../lib/supabase";

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function getOrCreateCanonicalWebsite(
  businessAccount: BusinessAccount,
  options?: { createIfMissing?: boolean }
): Promise<Website | null> {
  const createIfMissing = options?.createIfMissing ?? true;

  const { data: existing, error: existingError } = await supabase
    .from("websites")
    .select("*")
    .eq("business_account_id", businessAccount.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;
  if (!createIfMissing) return null;

  const { data: created, error: createError } = await supabase
    .from("websites")
    .insert({
      business_account_id: businessAccount.id,
      name: businessAccount.name,
      url: null,
      status: "pending",
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
}

export async function ensureKnowledgeBase(
  websiteId: string
): Promise<KnowledgeBase> {
  const { data: existing, error: existingError } = await supabase
    .from("knowledge_bases")
    .select("*")
    .eq("website_id", websiteId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("knowledge_bases")
    .insert({
      website_id: websiteId,
      content: "",
      summary: "Knowledge base is ready. Add content manually or scrape your website.",
      metadata: {},
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
}

export async function updateWebsiteUrl(websiteId: string, rawUrl: string) {
  const normalizedUrl = normalizeUrl(rawUrl);

  const { data, error } = await supabase
    .from("websites")
    .update({
      url: normalizedUrl ? normalizedUrl : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", websiteId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Website;
}
