import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { amount, type, description, phoneNumber } = await req.json();
    
    // Get PayPal credentials
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_SECRET");
    const environment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    
    console.log("PayPal Environment:", environment);
    console.log("Client ID exists:", !!clientId);
    console.log("Client Secret exists:", !!clientSecret);
    
    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_SECRET in Edge Functions settings.");
    }

    const baseUrl = environment === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    // Get access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error("PayPal auth error:", errorText);
      throw new Error(`Failed to authenticate with PayPal: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create PayPal order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: (amount / 100).toFixed(2) // Convert cents to dollars
        },
        description: description || "Payment"
      }],
      application_context: {
        return_url: `${req.headers.get("origin")}/payment-callback?success=true`,
        cancel_url: `${req.headers.get("origin")}/payment-callback?success=false`,
        brand_name: "Sure Odds Platform",
        landing_page: "LOGIN",
        user_action: "PAY_NOW"
      }
    };

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("PayPal order error:", errorText);
      throw new Error(`Failed to create PayPal order: ${orderResponse.status} - ${errorText}`);
    }

    const orderResult = await orderResponse.json();
    const approvalUrl = orderResult.links.find(link => link.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL found in PayPal response");
    }

    // Store payment metadata for verification
    await supabaseClient.from("transactions").insert({
      user_id: user.id,
      amount: amount,
      type: type,
      description: `${description || "Payment"} - PayPal Order: ${orderResult.id}`,
    });

    return new Response(JSON.stringify({
      payment_url: approvalUrl,
      order_tracking_id: orderResult.id,
      user_id: user.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Payment failed" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});