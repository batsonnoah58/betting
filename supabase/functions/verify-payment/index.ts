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

    const { orderTrackingId, userId, amount, type } = await req.json();
    
    console.log('Payment verification request:', { orderTrackingId, userId, amount, type });

    // Get PayPal credentials
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_SECRET");
    const environment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    
    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials not configured");
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
      throw new Error("Failed to authenticate with PayPal");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Get order details from PayPal
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderTrackingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!orderResponse.ok) {
      throw new Error("Failed to get order status from PayPal");
    }

    const orderData = await orderResponse.json();
    console.log('PayPal order status:', orderData);

    // If payment is successful, update user account
    if (orderData.status === "COMPLETED") {
      if (type === 'wallet_deposit') {
        // Update wallet balance for deposits (amount is in cents, convert to dollars)
        const dollarAmount = amount / 100;
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        if (profile) {
          const newBalance = Number(profile.wallet_balance) + dollarAmount;
          
          await supabaseClient
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', userId);

          // Add transaction record
          await supabaseClient
            .from('transactions')
            .insert({
              user_id: userId,
              type: 'deposit',
              amount: dollarAmount,
              description: `PayPal deposit - $${dollarAmount}`
            });
        }
      } else if (type === 'daily_access') {
        // Grant daily access for subscription payments
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        
        await supabaseClient
          .from('profiles')
          .update({ 
            daily_access_granted_until: tomorrow.toISOString()
          })
          .eq('id', userId);

        // Add transaction record
        await supabaseClient
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'subscription',
            amount: amount / 100, // Convert cents to dollars
            description: 'Daily odds access subscription'
          });
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        message: 'Payment processed successfully'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: false,
      status: orderData.status,
      message: 'Payment not completed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Payment verification failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});