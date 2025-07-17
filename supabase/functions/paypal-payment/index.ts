import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENVIRONMENT VARIABLES REQUIRED:
// PAYPAL_CLIENT_ID - Your PayPal REST API client ID (live)
// PAYPAL_CLIENT_SECRET - Your PayPal REST API secret (live)
// PAYPAL_ENVIRONMENT - Set to 'live' for production, 'sandbox' for testing (default: 'live')
// SUPABASE_URL - Your Supabase project URL
// SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? "",
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { amount, userId } = await req.json();
    
    // Validate minimum deposit amount
    if (amount < 100) {
      throw new Error("Minimum deposit amount is KES 100");
    }

    // Validate maximum deposit amount
    if (amount > 100000) {
      throw new Error("Maximum deposit amount is KES 100,000");
    }

    // Load PayPal credentials from environment variables
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? "";
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? "";
    const environment = Deno.env.get('PAYPAL_ENVIRONMENT') ?? "live";

    // Log presence of PayPal environment variables for debugging
    console.log("PayPal ENV:", {
      PAYPAL_CLIENT_ID: !!paypalClientId,
      PAYPAL_CLIENT_SECRET: !!paypalClientSecret,
      PAYPAL_ENVIRONMENT: environment
    });
    
    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("We are experiencing an issue with PayPal payments and are working to fix it as soon as possible. Please try again later or use another payment method if available.");
    }

    const baseUrl = environment === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    // Get PayPal access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with PayPal");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create PayPal order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
        amount: {
            currency_code: "KES",
            value: amount.toString(),
        },
          description: `BetWise deposit for user ${userId}`,
          custom_id: userId,
        },
      ],
      application_context: {
        return_url: `${req.headers.get("origin")}/payment/success`,
        cancel_url: `${req.headers.get("origin")}/payment/cancel`,
        brand_name: "BetWise",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
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
      console.error("PayPal order creation error:", errorText);
      throw new Error(`Failed to create PayPal order: ${orderResponse.status}`);
    }

    const orderResult = await orderResponse.json();

    if (orderResult.status !== "CREATED") {
      throw new Error(`PayPal order creation failed: ${orderResult.status}`);
    }

    // Store pending payment record
    await supabaseClient.from("transactions").insert({
      user_id: userId,
      type: 'deposit_pending',
      amount: amount,
      description: `PayPal deposit request - Order ID: ${orderResult.id}`,
      metadata: {
        paypal_order_id: orderResult.id,
        payment_method: 'paypal',
        environment: environment
      }
    });

    return new Response(JSON.stringify({
      success: true,
      order_id: orderResult.id,
      approval_url: (orderResult.links as PayPalLink[]).find((link) => link.rel === "approve")?.href,
      user_id: userId,
      message: "PayPal payment initiated. Please complete the payment to add funds to your wallet."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("PayPal payment error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Payment failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}