// lib/features.ts
//
// On/off switches for parts of the site.
//
// ONLINE_PAYMENTS: card payments through the site (Stripe), and the
// cook pages that go with it (Bank setup, Orders, Billing). Off for now:
// Meal Prep Market is enquiries only, and customers pay cooks directly.
// Set to true to bring those pages back (Stripe must be set up first).

export const ONLINE_PAYMENTS = false;
