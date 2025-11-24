import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitationRequest {
  email: string;
  role: "admin" | "editor";
  businessAccountId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const { email, role, businessAccountId }: InvitationRequest = await req.json();

    // Validate required fields
    if (!email || !role || !businessAccountId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, role, or businessAccountId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate role
    if (!["admin", "editor"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'admin' or 'editor'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify requester is owner or admin
    const { data: requester, error: requesterError } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("business_account_id", businessAccountId)
      .eq("status", "active")
      .single();

    if (requesterError || !requester) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this business account" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["owner", "admin"].includes(requester.role)) {
      return new Response(
        JSON.stringify({ error: "Only owners and admins can send invitations" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user with this email already exists in the business account
    // Note: We can't directly check by email in team_members, so we check invitations
    // The actual duplicate check will happen when the user accepts the invitation

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("business_account_id", businessAccountId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "An invitation has already been sent to this email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique invitation token
    const token = crypto.randomUUID();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .insert({
        business_account_id: businessAccountId,
        email,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get business account name for email
    const { data: businessAccount } = await supabase
      .from("business_accounts")
      .select("name")
      .eq("id", businessAccountId)
      .single();

    const businessName = businessAccount?.name || "a team";

    // Construct invitation acceptance URL
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const inviteLink = `${appUrl}/accept-invite/${token}`;

    // Send invitation email
    try {
      await sendInvitationEmail(email, role, businessName, inviteLink, expiresAt);
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      
      // Delete the invitation if email fails
      await supabase
        .from("invitations")
        .delete()
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ 
          error: "Failed to send invitation email. Please try again.",
          details: emailError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Send invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendInvitationEmail(
  email: string,
  role: string,
  businessName: string,
  inviteLink: string,
  expiresAt: Date
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const expirationDate = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            You've been invited to join <strong>${businessName}</strong> on SiteHelper as an <strong>${role}</strong>.
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              <strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Click the button below to accept your invitation and join the team:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: 600; 
                      font-size: 16px;
                      display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 13px; color: #667eea; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px;">
            ${inviteLink}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #ef4444; margin-bottom: 10px;">
              ⏰ <strong>Important:</strong> This invitation expires on ${expirationDate}
            </p>
            <p style="font-size: 13px; color: #6b7280; margin: 0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">SiteHelper - AI-Powered Customer Support</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </body>
    </html>
  `;

  const emailText = `
You've been invited to join ${businessName} on SiteHelper!

Role: ${role.charAt(0).toUpperCase() + role.slice(1)}

Accept your invitation by visiting this link:
${inviteLink}

This invitation expires on ${expirationDate}.

If you didn't expect this invitation, you can safely ignore this email.

---
SiteHelper - AI-Powered Customer Support
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SiteHelper <invitations@sitehelper.app>",
      to: [email],
      subject: `You've been invited to join ${businessName} on SiteHelper`,
      html: emailHtml,
      text: emailText,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Email service error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log("Email sent successfully:", result);
}
