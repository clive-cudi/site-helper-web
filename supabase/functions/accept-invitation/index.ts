import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AcceptInvitationRequest {
  token: string;
  userId: string;
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
    const { token, userId }: AcceptInvitationRequest = await req.json();

    // Validate required fields
    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: token or userId" }),
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

    // Verify the userId matches the authenticated user
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query invitations table for matching token with 'pending' status
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();

    // Return 404 if invitation not found
    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found or already used" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (expiresAt < now) {
      // Update invitation status to 'expired' if past expiration date
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      // Return 400 if invitation is expired
      return new Response(
        JSON.stringify({ 
          error: "Invitation has expired",
          expired_at: invitation.expires_at 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is already a member of this business account
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("business_account_id", invitation.business_account_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "You are already a member of this business account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert team_member record with specified role
    const { data: teamMember, error: teamMemberError } = await supabase
      .from("team_members")
      .insert({
        business_account_id: invitation.business_account_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(), // Set joined_at timestamp to current time
        status: "active",
      })
      .select()
      .single();

    if (teamMemberError) {
      console.error("Error creating team member:", teamMemberError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create team member",
          details: teamMemberError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update invitation status to 'accepted' and set accepted_at
    const { error: updateError } = await supabase
      .from("invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      // Note: Team member was created, so we don't fail the request
      // The invitation status update is secondary
    }

    // Get business account details for response
    const { data: businessAccount } = await supabase
      .from("business_accounts")
      .select("id, name")
      .eq("id", invitation.business_account_id)
      .single();

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        teamMember: {
          id: teamMember.id,
          role: teamMember.role,
          business_account_id: teamMember.business_account_id,
          joined_at: teamMember.joined_at,
        },
        businessAccount: businessAccount || { id: invitation.business_account_id },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Accept invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
