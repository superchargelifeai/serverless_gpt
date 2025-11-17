const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Airtable = require('airtable');
const { authenticateApiKey } = require('../middleware/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Create checkout session
router.post('/create-checkout-session', authenticateApiKey, async (req, res) => {
  try {
    const { email, plan = 'pro' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get or create customer
    let customer;
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          source: 'gpt_paywall'
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Your Stripe price ID
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.CANCEL_URL || 'https://chat.openai.com',
      metadata: {
        email: email,
        plan: plan
      }
    });

    // Store or update user in Airtable
    try {
      const records = await base('Users').select({
        filterByFormula: `LOWER({Email}) = LOWER('${email.toLowerCase()}')`,
        maxRecords: 1
      }).firstPage();

      if (records.length === 0) {
        // Create new user
        await base('Users').create([
          {
            fields: {
              Email: email,
              StripeCustomerId: customer.id,
              Status: 'pending',
              Plan: plan,
              CreatedAt: new Date().toISOString()
            }
          }
        ]);
      } else {
        // Update existing user
        await base('Users').update([
          {
            id: records[0].id,
            fields: {
              StripeCustomerId: customer.id,
              UpdatedAt: new Date().toISOString()
            }
          }
        ]);
      }
    } catch (airtableError) {
      console.error('Airtable error:', airtableError);
      // Don't fail the checkout if Airtable fails
    }

    res.json({
      session_id: session.id,
      checkout_url: session.url
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
router.post('/create-portal-session', authenticateApiKey, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get customer from Stripe
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No subscription found for this email' });
    }

    const customer = customers.data[0];

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: process.env.RETURN_URL || 'https://chat.openai.com'
    });

    res.json({
      portal_url: session.url
    });

  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to handle checkout completion
async function handleCheckoutComplete(session) {
  const customer = await stripe.customers.retrieve(session.customer);
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  // Update user in Airtable
  const records = await base('Users').select({
    filterByFormula: `LOWER({Email}) = LOWER('${customer.email.toLowerCase()}')`,
    maxRecords: 1
  }).firstPage();

  if (records.length > 0) {
    await base('Users').update([
      {
        id: records[0].id,
        fields: {
          Status: 'active',
          SubscriptionId: subscription.id,
          CurrentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          UpdatedAt: new Date().toISOString()
        }
      }
    ]);
  }
}

// Helper function to handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  
  // Update user in Airtable
  const records = await base('Users').select({
    filterByFormula: `{StripeCustomerId} = '${subscription.customer}'`,
    maxRecords: 1
  }).firstPage();

  if (records.length > 0) {
    await base('Users').update([
      {
        id: records[0].id,
        fields: {
          Status: subscription.status,
          CurrentPeriodEnd: subscription.current_period_end ? 
            new Date(subscription.current_period_end * 1000).toISOString() : null,
          UpdatedAt: new Date().toISOString()
        }
      }
    ]);
  }
}

module.exports = router;
