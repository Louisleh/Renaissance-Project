import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: 'Stripe is not configured on the server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { price_id, mode, success_url, cancel_url } = await req.json();

    if (!price_id) {
      return new Response(
        JSON.stringify({ error: 'price_id is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price_id, quantity: 1 }],
      mode: mode || 'subscription',
      success_url: success_url || `${req.headers.get('origin')}/profile?checkout=success`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/pricing?checkout=cancelled`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
