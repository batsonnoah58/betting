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

    const { amount, phoneNumber, userId } = await req.json();
    
    // Validate minimum deposit amount
    if (amount < 100) {
      throw new Error("Minimum deposit amount is KES 100");
    }

    // Validate maximum deposit amount
    if (amount > 100000) {
      throw new Error("Maximum deposit amount is KES 100,000");
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^254[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error("Please enter a valid Kenyan phone number (e.g., 254700000000)");
    }

    // Get M-Pesa credentials
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const environment = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";
    
    if (!consumerKey || !consumerSecret || !passkey) {
      throw new Error("M-Pesa credentials not configured");
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
      throw new Error("Failed to authenticate with M-Pesa");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
    const password = btoa(`${consumerKey}:${passkey}:${timestamp}`);

    // Create STK Push request
    const stkPushData = {
      BusinessShortCode: environment === "live" ? "174379" : "174379", // Business shortcode
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: environment === "live" ? "174379" : "174379", // Business shortcode
      PhoneNumber: phoneNumber,
      CallBackURL: `${req.headers.get("origin")}/api/mpesa-callback`,
      AccountReference: `BetWise-${userId}`,
      TransactionDesc: "BetWise deposit"
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
      throw new Error(`Failed to initiate deposit: ${stkPushResponse.status} - ${errorText}`);
    }

    const stkPushResult = await stkPushResponse.json();
    
    if (stkPushResult.ResponseCode !== "0") {
      throw new Error(`M-Pesa deposit error: ${stkPushResult.ResponseDescription}`);
    }

    // Store pending deposit record
    await supabaseClient.from("transactions").insert({
      user_id: userId,
      type: 'deposit_pending',
      amount: amount,
      description: `M-Pesa deposit request - CheckoutRequestID: ${stkPushResult.CheckoutRequestID}`,
      metadata: {
        checkout_request_id: stkPushResult.CheckoutRequestID,
        merchant_request_id: stkPushResult.MerchantRequestID,
        phone_number: phoneNumber
      }
    });

    return new Response(JSON.stringify({
      success: true,
      checkout_request_id: stkPushResult.CheckoutRequestID,
      merchant_request_id: stkPushResult.MerchantRequestID,
      user_id: userId,
      message: "STK Push sent to your phone. Please check your M-Pesa and enter the PIN to complete the deposit."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("M-Pesa deposit error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Deposit failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 