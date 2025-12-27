import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price configuration (VND)
const PRICES = {
  premium: {
    1: 299000,    // 1 month
    6: 1500000,   // 6 months (20% discount)
    12: 2500000,  // 12 months (40% discount)
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { tier, months } = await req.json();

    // Validate input
    if (tier !== "premium" || ![1, 6, 12].includes(months)) {
      throw new Error("Invalid tier or months");
    }

    const amount = PRICES.premium[months as 1 | 6 | 12];
    const orderId = `ORDER_${Date.now()}_${user.id.slice(0, 8)}`;

    // Get Payverse credentials
    const mid = Deno.env.get("PAYVERSE_MID");
    const clientKey = Deno.env.get("PAYVERSE_CLIENT_KEY");
    const secretKey = Deno.env.get("PAYVERSE_SECRET_KEY");

    if (!mid || !clientKey || !secretKey) {
      console.log("Payverse credentials not configured yet");
      throw new Error("Payment system not configured. Please contact support.");
    }

    // Prepare payment data
    const returnUrl = `${supabaseUrl.replace('.supabase.co', '')}/pricing?payment=complete`;
    const webhookUrl = `${supabaseUrl}/functions/v1/payment-webhook`;
    
    // mallReserved stores additional data for webhook processing
    const mallReserved = JSON.stringify({
      tier,
      months,
      userId: user.id,
    });

    // Create signature (SHA-512)
    const signData = `${mid}${orderId}${amount}${secretKey}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signData);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Build payment request
    const paymentRequest = {
      mid,
      orderId,
      amount,
      goodsName: `TOPIKBOT Premium ${months}개월`,
      buyerName: user.email?.split("@")[0] || "User",
      buyerEmail: user.email,
      returnUrl,
      webhookUrl,
      mallReserved,
      signature,
    };

    // Call Payverse API (Production URL - will change to sandbox for testing)
    const isProduction = Deno.env.get("PAYVERSE_PRODUCTION") === "true";
    const payverseUrl = isProduction
      ? "https://api.payverse.io/v1/payment/create"
      : "https://sandbox-api.payverse.io/v1/payment/create";

    console.log("Creating payment:", { orderId, amount, tier, months, userId: user.id });

    const payverseResponse = await fetch(payverseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Key": clientKey,
      },
      body: JSON.stringify(paymentRequest),
    });

    const payverseResult = await payverseResponse.json();

    if (!payverseResponse.ok || payverseResult.resultCode !== "0000") {
      console.error("Payverse error:", payverseResult);
      throw new Error(payverseResult.resultMsg || "Payment creation failed");
    }

    console.log("Payment created successfully:", { orderId, paymentUrl: payverseResult.paymentUrl });

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: payverseResult.paymentUrl,
        orderId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Create payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Payment creation failed";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
