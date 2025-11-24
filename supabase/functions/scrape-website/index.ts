import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { websiteId, url } = await req.json();

    if (!websiteId || !url) {
      return new Response(
        JSON.stringify({ error: "Missing websiteId or url" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase
      .from("websites")
      .update({ status: "processing" })
      .eq("id", websiteId);

    let content = "";
    let summary = "";
    let error = null;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SiteHelper Bot/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const html = await response.text();

      content = html
        .replace(/<script[^>]*>.*?<\/script>/gis, "")
        .replace(/<style[^>]*>.*?<\/style>/gis, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 10000);

      summary = `Knowledge base extracted from ${url}. Contains ${
        content.split(" ").length
      } words of content.`;

      await supabase
        .from("knowledge_bases")
        .update({
          content,
          summary,
          metadata: { url, scraped_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq("website_id", websiteId);

      await supabase
        .from("websites")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", websiteId);
    } catch (scrapeError: any) {
      error = scrapeError.message;
      await supabase
        .from("websites")
        .update({
          status: "failed",
          scrape_error: error,
          updated_at: new Date().toISOString(),
        })
        .eq("id", websiteId);
    }

    return new Response(
      JSON.stringify({
        success: !error,
        content: content.substring(0, 500),
        error,
      }),
      {
        status: error ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
