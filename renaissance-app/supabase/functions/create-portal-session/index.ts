import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Server is not configured.' }, 500);
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization header.' }, 401);
  }

  // Resolve the caller from their JWT. We trust auth.uid() and *never* the
  // request body for the customer id — accepting a client-supplied customer
  // id would let any authed user open the billing portal of any other
  // customer whose id they could guess or scrape.
  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authedClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Invalid session.' }, 401);
  }

  const { data: profile, error: profileError } = await authedClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return json({ error: 'Could not load profile.' }, 500);
  }

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return json({ error: 'No billing account on file.' }, 404);
  }

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.get('origin')}/profile`,
    });
    return json({ url: session.url }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
