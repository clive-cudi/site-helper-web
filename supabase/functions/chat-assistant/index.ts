import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function buildBusinessContext(websiteRow: Record<string, unknown> | null): string {
  if (!websiteRow) return "Business details are not available.";

  const websiteName = (websiteRow.name as string | null) || "";
  const websiteUrl = (websiteRow.url as string | null) || "";

  const business = websiteRow.business_accounts as Record<string, unknown> | null;

  const businessName = (business?.name as string | null) || websiteName || "";
  const phone = (business?.phone as string | null) || "";
  const contactEmail = (business?.contact_email as string | null) || "";
  const addressLine1 = (business?.address_line_1 as string | null) || "";
  const addressLine2 = (business?.address_line_2 as string | null) || "";
  const city = (business?.city as string | null) || "";
  const stateRegion = (business?.state_region as string | null) || "";
  const postalCode = (business?.postal_code as string | null) || "";
  const country = (business?.country as string | null) || "";
  const supportHours = (business?.support_hours as string | null) || "";
  const description = (business?.business_description as string | null) || "";

  const location = [addressLine1, addressLine2, city, stateRegion, postalCode, country]
    .filter(Boolean)
    .join(", ");

  return [
    `Business Name: ${businessName || "Not provided"}`,
    `Website: ${websiteUrl || "Not provided"}`,
    `Support Email: ${contactEmail || "Not provided"}`,
    `Phone: ${phone || "Not provided"}`,
    `Location: ${location || "Not provided"}`,
    `Support Hours: ${supportHours || "Not provided"}`,
    `Business Description: ${description || "Not provided"}`,
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { websiteId, conversationId, message, visitorId } = await req.json();

    if (!websiteId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          website_id: websiteId,
          visitor_id: visitorId || `visitor_${Date.now()}`,
          started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;
      currentConversationId = newConversation.id;
    }

    await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role: "user",
      content: message,
    });

    const { data: kb } = await supabase
      .from("knowledge_bases")
      .select("content, summary")
      .eq("website_id", websiteId)
      .single();

    const { data: websiteData } = await supabase
      .from("websites")
      .select(
        `
        name,
        url,
        business_accounts (
          name,
          phone,
          contact_email,
          address_line_1,
          address_line_2,
          city,
          state_region,
          postal_code,
          country,
          support_hours,
          business_description
        )
      `
      )
      .eq("id", websiteId)
      .maybeSingle();

    const knowledgeBaseContent = kb?.content || "No knowledge base available.";
    const kbSummary = kb?.summary || "";
    const businessContext = buildBusinessContext(
      (websiteData as Record<string, unknown> | null) ?? null
    );

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    let assistantMessage = "";

    if (!openaiApiKey) {
      assistantMessage =
        "I'm here to help! However, the OpenAI API key hasn't been configured yet. Please contact the website administrator to set up the AI assistant.";
    } else {
      try {
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a helpful customer service assistant for a website. Use the following business and knowledge-base context to answer questions accurately and helpfully.

Business Profile:
${businessContext}

Knowledge Base Summary: ${kbSummary}

Knowledge Base Content:
${knowledgeBaseContent.substring(
                    0,
                    8000
                  )}

If the customer asks about contact details, hours, or location, prioritize Business Profile information.
If you don't know the answer based on this context, politely say so and offer to help in other ways.
Keep responses brief, practical, and conversational.`,
                },
                {
                  role: "user",
                  content: message,
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          }
        );

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }

        const openaiData = await openaiResponse.json();
        assistantMessage =
          openaiData.choices[0]?.message?.content ||
          "I apologize, but I encountered an error processing your request.";
      } catch (openaiError: any) {
        console.error("OpenAI error:", openaiError);
        assistantMessage =
          "I apologize, but I encountered an error processing your request. Please try again.";
      }
    }

    await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role: "assistant",
      content: assistantMessage,
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", currentConversationId);

    return new Response(
      JSON.stringify({
        conversationId: currentConversationId,
        message: assistantMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Chat assistant error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
