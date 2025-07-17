import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const { amount, email, userId } = await req.json();
    if (!amount || !email) {
      throw new Error("Amount and email are required");
    }

    // Paystack expects amount in kobo (for NGN) or the lowest currency unit
    // For KES, Paystack expects the amount as is (no conversion)
    const paymentResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: amount, // For KES, send as is
        email,
        currency: "KES",
        reference: userId || undefined,
        callback_url: "https://your-frontend-url.com/payment/success" // Update to your frontend success URL
      }),
    });

    let paymentResult;
    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("Paystack API error response:", errorText);
      return new Response(JSON.stringify({
        error: errorText,
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    } else {
      paymentResult = await paymentResponse.json();
    }
    if (!paymentResult.data || !paymentResult.data.authorization_url) {
      throw new Error(paymentResult.message || "Failed to create Paystack payment");
    }

    return new Response(JSON.stringify({
      success: true,
      authorization_url: paymentResult.data.authorization_url,
      message: "Redirect to Paystack to complete your payment."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Paystack payment error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Paystack payment failed",
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
