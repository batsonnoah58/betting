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

    const { orderId } = await req.json();
    
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Get PayPal credentials
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const environment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    
    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("PayPal credentials not configured");
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

    // Capture the payment
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error("PayPal capture error:", errorText);
      throw new Error(`Failed to capture PayPal payment: ${captureResponse.status}`);
    }

    const captureResult = await captureResponse.json();
    
    if (captureResult.status !== "COMPLETED") {
      throw new Error(`PayPal payment not completed: ${captureResult.status}`);
    }

    // Extract payment details
    const purchaseUnit = captureResult.purchase_units[0];
    const amount = parseFloat(purchaseUnit.amount.value);
    const userId = purchaseUnit.custom_id;

    // Find the pending transaction
    const { data: pendingTransaction } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq('metadata->paypal_order_id', orderId)
      .eq('type', 'deposit_pending')
      .single();

    if (!pendingTransaction) {
      throw new Error("Pending transaction not found");
    }

    // Update transaction to successful
    await supabaseClient
      .from("transactions")
      .update({ 
        type: 'deposit',
        description: `PayPal deposit successful - Transaction ID: ${captureResult.id}`,
        metadata: {
          ...pendingTransaction.metadata,
          paypal_transaction_id: captureResult.id,
          capture_status: captureResult.status,
          payment_time: new Date().toISOString()
        }
      })
      .eq('id', pendingTransaction.id);

    // Update user wallet balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (profile) {
      const newBalance = Number(profile.wallet_balance) + amount;
      await supabaseClient
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);
    }

    console.log("PayPal payment captured successfully:", {
      userId,
      amount,
      transactionId: captureResult.id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      transaction_id: captureResult.id,
      amount: amount,
      message: "Payment captured successfully. Funds have been added to your wallet."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("PayPal capture error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Payment capture failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 