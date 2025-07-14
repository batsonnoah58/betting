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
    
    // Validate minimum withdrawal amount
    if (amount < 2000) {
      throw new Error("Minimum withdrawal amount is KES 2,000");
    }

    // Check user wallet balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (!profile || Number(profile.wallet_balance) < amount) {
      throw new Error("Insufficient wallet balance");
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

    // Create B2C (Business to Customer) request for withdrawal
    const b2cData = {
      InitiatorName: "BetWise",
      SecurityCredential: password, // This should be encrypted in production
      CommandID: "BusinessPayment",
      Amount: amount,
      PartyA: environment === "live" ? "174379" : "174379", // Business shortcode
      PartyB: phoneNumber,
      Remarks: "BetWise withdrawal",
      QueueTimeOutURL: `${req.headers.get("origin")}/api/mpesa-timeout`,
      ResultURL: `${req.headers.get("origin")}/api/mpesa-result`,
      Occasion: "Withdrawal"
    };

    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(b2cData),
    });

    if (!b2cResponse.ok) {
      const errorText = await b2cResponse.text();
      console.error("M-Pesa B2C error:", errorText);
      throw new Error(`Failed to initiate withdrawal: ${b2cResponse.status} - ${errorText}`);
    }

    const b2cResult = await b2cResponse.json();
    
    if (b2cResult.ResponseCode !== "0") {
      throw new Error(`M-Pesa withdrawal error: ${b2cResult.ResponseDescription}`);
    }

    // Update wallet balance immediately (will be reversed if withdrawal fails)
    const newBalance = Number(profile.wallet_balance) - amount;
    await supabaseClient
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    // Store withdrawal record
    await supabaseClient.from("transactions").insert({
      user_id: userId,
      type: 'withdrawal',
      amount: amount,
      description: `M-Pesa withdrawal to ${phoneNumber} - Transaction: ${b2cResult.ConversationID}`
    });

    return new Response(JSON.stringify({
      success: true,
      conversation_id: b2cResult.ConversationID,
      originator_conversation_id: b2cResult.OriginatorConversationID,
      user_id: userId,
      message: "Withdrawal initiated successfully. Funds will be sent to your M-Pesa account."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("M-Pesa withdrawal error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Withdrawal failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 