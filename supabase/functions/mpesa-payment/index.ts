// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to generate timestamp in YYYYMMDDHHMMSS format
function getTimestamp() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Daraja credentials from environment variables
    const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");
    const environment = Deno.env.get("DARAJA_ENVIRONMENT") || "sandbox";
    const shortcode = Deno.env.get("DARAJA_SHORTCODE") || "174379"; // Default test shortcode
    const passkey = Deno.env.get("DARAJA_PASSKEY") || "bfb279f9aa9bdbcf15e97dd71a467cd2c90b1e8a3c8c1e2e5b8b3c1e2e5b8b3c"; // Default test passkey

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      throw new Error("Daraja (M-Pesa) credentials not configured");
    }

    const baseUrl = environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Parse request body
    const { amount, phoneNumber, userId } = await req.json();
    if (!amount || !phoneNumber) {
      throw new Error("Amount and phone number are required");
    }

    // Step 1: Get access token
    const authResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
      },
    });

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with Safaricom Daraja API");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Step 2: Prepare STK Push payload
    const timestamp = getTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const callbackUrl = Deno.env.get("DARAJA_CALLBACK_URL") || "https://webhook.site/your-callback-url";

    const stkPushPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: userId || "BetWiseDeposit",
      TransactionDesc: "Deposit to BetWise wallet"
    };

    // Step 3: Send STK Push request
    const stkPushResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(stkPushPayload),
    });

    const stkPushResult = await stkPushResponse.json();

    if (!stkPushResponse.ok || stkPushResult.ResponseCode !== "0") {
      throw new Error(stkPushResult.errorMessage || stkPushResult.ResponseDescription || 'Failed to initiate STK Push');
    }

    return new Response(JSON.stringify({
      success: true,
      ...stkPushResult,
      message: "STK Push sent. Please check your phone to complete the payment."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Daraja payment error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Daraja payment failed",
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
