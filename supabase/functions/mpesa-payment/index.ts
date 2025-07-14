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
    
    // Get M-Pesa credentials
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const environment = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";
    
    if (!consumerKey || !consumerSecret || !passkey) {
      throw new Error("M-Pesa credentials not configured. Please add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_PASSKEY in Edge Functions settings.");
    }

    const baseUrl = environment === "live" 
      ? "https://api.safaricom.co.ke" 
      : "https://sandbox.safaricom.co.ke";

    // Get access token
    const authResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
      },
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error("M-Pesa auth error:", errorText);
      throw new Error(`Failed to authenticate with M-Pesa: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
    const password = btoa(`${consumerKey}:${passkey}:${timestamp}`);

    // Create STK Push request
    const stkPushData = {
      BusinessShortCode: environment === "live" ? "174379" : "174379", // Use appropriate shortcode
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: environment === "live" ? "174379" : "174379", // Business shortcode
      PhoneNumber: phoneNumber,
      CallBackURL: `${req.headers.get("origin")}/api/mpesa-callback`,
      AccountReference: "BetWise",
      TransactionDesc: description || "Payment"
    };

    const stkPushResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(stkPushData),
    });

    if (!stkPushResponse.ok) {
      const errorText = await stkPushResponse.text();
      console.error("M-Pesa STK Push error:", errorText);
      throw new Error(`Failed to initiate M-Pesa payment: ${stkPushResponse.status} - ${errorText}`);
    }

    const stkPushResult = await stkPushResponse.json();
    
    if (stkPushResult.ResponseCode !== "0") {
      throw new Error(`M-Pesa error: ${stkPushResult.ResponseDescription}`);
    }

    // Store payment metadata for verification
    await supabaseClient.from("transactions").insert({
      user_id: user.id,
      amount: amount,
      type: type,
      description: `${description || "Payment"} - M-Pesa Checkout: ${stkPushResult.CheckoutRequestID}`,
    });

    return new Response(JSON.stringify({
      success: true,
      checkout_request_id: stkPushResult.CheckoutRequestID,
      user_id: user.id,
      message: "M-Pesa payment initiated. Check your phone for payment prompt."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("M-Pesa payment error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Payment failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 