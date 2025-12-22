import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, userId, plan } = await req.json();

    if (action === "list") {
      // Get all users from auth.users with pagination
      let allUsers: any[] = [];
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers({
          page: page,
          perPage: perPage,
        });

        if (authError) {
          throw authError;
        }

        allUsers = allUsers.concat(authUsers.users);
        
        // If we got less than perPage, we've reached the end
        if (authUsers.users.length < perPage) {
          break;
        }
        page++;
      }

      console.log(`Total users fetched: ${allUsers.length}`);

      // Get profiles
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("*");

      // Get subscriptions
      const { data: subscriptions } = await supabaseClient
        .from("user_subscriptions")
        .select("*");

      // Merge data
      const usersWithDetails = allUsers.map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        const subscription = subscriptions?.find((s) => s.user_id === authUser.id);
        
        return {
          id: authUser.id,
          email: authUser.email,
          username: profile?.username || "Unknown",
          points: profile?.points || 0,
          money: profile?.money || 0,
          hp: profile?.hp || 100,
          created_at: authUser.created_at,
          subscription_plan: subscription?.plan || "free",
          subscription_expires: subscription?.expires_at,
        };
      });

      // Sort by created_at descending
      usersWithDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return new Response(
        JSON.stringify({ users: usersWithDetails }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_subscription") {
      if (!userId || !plan) {
        return new Response(
          JSON.stringify({ error: "userId and plan are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if subscription exists
      const { data: existingSub } = await supabaseClient
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabaseClient
          .from("user_subscriptions")
          .update({
            plan: plan,
            expires_at: plan === "free" ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } else {
        // Insert new subscription
        const { error: insertError } = await supabaseClient
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            plan: plan,
            expires_at: plan === "free" ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, message: `Subscription updated to ${plan}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Admin users error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
