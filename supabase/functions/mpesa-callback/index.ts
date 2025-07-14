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

    const callbackData = await req.json();
    console.log("M-Pesa callback received:", callbackData);

    // Extract the callback data
    const {
      Body: {
        stkCallback: {
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        }
      }
    } = callbackData;

    if (ResultCode !== 0) {
      console.error("M-Pesa payment failed:", ResultDesc);
      
      // Update transaction status to failed
      await supabaseClient
        .from("transactions")
        .update({ 
          type: 'deposit_failed',
          description: `M-Pesa deposit failed: ${ResultDesc}`
        })
        .eq('metadata->checkout_request_id', CheckoutRequestID);

      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment failed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract payment details from callback metadata
    let amount = 0;
    let mpesaReceiptNumber = "";
    let transactionDate = "";

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "Amount") {
          amount = parseFloat(item.Value);
        } else if (item.Name === "MpesaReceiptNumber") {
          mpesaReceiptNumber = item.Value;
        } else if (item.Name === "TransactionDate") {
          transactionDate = item.Value;
        }
      }
    }

    // Find the pending transaction
    const { data: pendingTransaction } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq('metadata->checkout_request_id', CheckoutRequestID)
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
        description: `M-Pesa deposit successful - Receipt: ${mpesaReceiptNumber}`,
        metadata: {
          ...pendingTransaction.metadata,
          mpesa_receipt_number: mpesaReceiptNumber,
          transaction_date: transactionDate,
          result_code: ResultCode,
          result_desc: ResultDesc
        }
      })
      .eq('id', pendingTransaction.id);

    // Update user wallet balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', pendingTransaction.user_id)
      .single();

    if (profile) {
      const newBalance = Number(profile.wallet_balance) + amount;
      await supabaseClient
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', pendingTransaction.user_id);
    }

    console.log("Deposit processed successfully:", {
      userId: pendingTransaction.user_id,
      amount,
      receiptNumber: mpesaReceiptNumber
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment processed successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Callback processing failed",
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 