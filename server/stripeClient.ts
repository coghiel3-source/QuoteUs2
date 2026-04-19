import Stripe from 'stripe';
import { pool } from './db';

async function getKeyFromDb(key: string): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      [key]
    );
    return result.rows[0]?.value || null;
  } catch {
    return null;
  }
}

async function getCredentials() {
  // 1. Plain env vars (highest priority — works in any environment)
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY,
    };
  }

  // 2. Admin-saved keys in system_settings (saved via Connections tab)
  const dbSecret = await getKeyFromDb('stripe_secret_key');
  const dbPublishable = await getKeyFromDb('stripe_publishable_key');
  if (dbSecret) {
    return {
      publishableKey: dbPublishable || '',
      secretKey: dbSecret,
    };
  }

  // 3. Replit Connector (development or production environment)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (xReplitToken && hostname) {
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const environments = isProduction ? ['production', 'development'] : ['development', 'production'];

    for (const targetEnvironment of environments) {
      try {
        const url = new URL(`https://${hostname}/api/v2/connection`);
        url.searchParams.set('include_secrets', 'true');
        url.searchParams.set('connector_names', 'stripe');
        url.searchParams.set('environment', targetEnvironment);

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'X_REPLIT_TOKEN': xReplitToken
          }
        });

        const data = await response.json();
        const conn = data.items?.[0];

        if (conn?.settings?.publishable && conn?.settings?.secret) {
          return {
            publishableKey: conn.settings.publishable,
            secretKey: conn.settings.secret,
          };
        }
      } catch {
        // Try next environment
      }
    }
  }

  throw new Error('Stripe not configured. Enter your keys in Settings → Connections or set STRIPE_SECRET_KEY.');
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
