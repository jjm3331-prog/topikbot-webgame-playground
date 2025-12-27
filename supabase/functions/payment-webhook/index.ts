import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const secretKey = Deno.env.get("PAYVERSE_SECRET_KEY");

    if (!secretKey) {
      console.error("PAYVERSE_SECRET_KEY not configured");
      throw new Error("Payment system not configured");
    }

    // Use service role for webhook processing (no user auth)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    const {
      resultCode,
      resultMsg,
      mid,
      orderId,
      amount,
      signature: receivedSignature,
      mallReserved,
    } = payload;

    // Verify signature
    const signData = `${mid}${orderId}${amount}${resultCode}${secretKey}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signData);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (receivedSignature !== expectedSignature) {
      console.error("Signature verification failed", {
        received: receivedSignature,
        expected: expectedSignature,
      });
      throw new Error("Invalid signature");
    }

    // Check if payment was successful
    if (resultCode !== "0000") {
      console.log("Payment failed:", resultMsg);
      return new Response(
        JSON.stringify({ receiveResult: "SUCCESS" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse mallReserved to get user data
    let reservedData;
    try {
      reservedData = JSON.parse(mallReserved);
    } catch (e) {
      console.error("Failed to parse mallReserved:", mallReserved);
      throw new Error("Invalid mallReserved data");
    }

    const { tier, months, userId } = reservedData;

    if (!userId || !tier || !months) {
      console.error("Missing required data in mallReserved:", reservedData);
      throw new Error("Missing required payment data");
    }

    // Calculate subscription period
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    console.log("Processing subscription:", {
      userId,
      tier,
      months,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // Upsert subscription
    const { error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: tier,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (subscriptionError) {
      console.error("Failed to update subscription:", subscriptionError);
      throw new Error("Failed to update subscription");
    }

    console.log("Subscription updated successfully for user:", userId);

    // Return success response (Payverse format)
    return new Response(
      JSON.stringify({ receiveResult: "SUCCESS" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    // Still return success to prevent Payverse from retrying
    // Log the error for debugging
    return new Response(
      JSON.stringify({ receiveResult: "SUCCESS" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
