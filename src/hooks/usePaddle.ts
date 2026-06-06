import { useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PADDLE CONFIG — Replace with real values from Paddle Dashboard
// Sandbox: https://sandbox-vendors.paddle.com
// Production: https://vendors.paddle.com
// ─────────────────────────────────────────────────────────────────────────────

export const PADDLE_CONFIG = {
  // Sandbox client-side token (starts with test_)
  // Replace with your token from: Paddle Dashboard → Developer Tools → Authentication
  clientToken: import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'test_REPLACE_WITH_YOUR_TOKEN',

  environment: (import.meta.env.VITE_PADDLE_ENV || 'sandbox') as 'sandbox' | 'production',

  // Price IDs — create these in Paddle Dashboard → Catalog → Products
  priceIds: {
    pro_monthly:   import.meta.env.VITE_PADDLE_PRO_MONTHLY   || 'pri_REPLACE_PRO_MONTHLY',
    pro_yearly:    import.meta.env.VITE_PADDLE_PRO_YEARLY    || 'pri_REPLACE_PRO_YEARLY',
    ultra_monthly: import.meta.env.VITE_PADDLE_ULTRA_MONTHLY || 'pri_REPLACE_ULTRA_MONTHLY',
    ultra_yearly:  import.meta.env.VITE_PADDLE_ULTRA_YEARLY  || 'pri_REPLACE_ULTRA_YEARLY',
  },
};

/** Get the correct Price ID for a given plan + billing combo */
export function getPriceId(plan: 'pro' | 'ultra', billing: 'monthly' | 'yearly'): string {
  const key = `${plan}_${billing}` as keyof typeof PADDLE_CONFIG.priceIds;
  return PADDLE_CONFIG.priceIds[key];
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (minimal — Paddle types for window.Paddle)
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: 'sandbox' | 'production') => void };
      Setup: (opts: { token: string; eventCallback?: (data: any) => void }) => void;
      Checkout: {
        open: (opts: PaddleCheckoutOptions) => void;
        close: () => void;
      };
    };
  }
}

export interface PaddleCheckoutOptions {
  items: Array<{ priceId: string; quantity: number }>;
  customer?: { email: string };
  customData?: Record<string, string>;
  settings?: {
    displayMode?: 'overlay' | 'inline';
    theme?: 'dark' | 'light';
    locale?: string;
    successUrl?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

let scriptLoaded = false;
let scriptLoading = false;
const listeners: Array<() => void> = [];

function loadPaddleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptLoaded && window.Paddle) { resolve(); return; }
    if (scriptLoading) { listeners.push(resolve); return; }

    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      if (!window.Paddle) { reject(new Error('Paddle script loaded but window.Paddle is undefined')); return; }

      // Configure environment
      if (PADDLE_CONFIG.environment === 'sandbox') {
        window.Paddle.Environment.set('sandbox');
      }

      // Initialize Paddle
      window.Paddle.Setup({ token: PADDLE_CONFIG.clientToken });

      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      listeners.forEach(fn => fn());
      listeners.length = 0;
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load Paddle.js'));
    };
    document.head.appendChild(script);
  });
}

interface UsePaddleReturn {
  ready: boolean;
  openCheckout: (opts: PaddleCheckoutOptions) => Promise<void>;
  closeCheckout: () => void;
}

export function usePaddle(
  onEvent?: (eventName: string, data: any) => void
): UsePaddleReturn {
  const readyRef = useRef(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadPaddleScript()
      .then(() => {
        readyRef.current = true;
        loadedRef.current = true;
        // Re-setup with event callback if provided
        if (onEvent && window.Paddle) {
          window.Paddle.Setup({
            token: PADDLE_CONFIG.clientToken,
            eventCallback: (data: any) => {
              onEvent(data?.name || data?.event || 'unknown', data);
            },
          });
        }
      })
      .catch(err => console.error('[usePaddle] Failed to load Paddle:', err));
  }, []);

  const openCheckout = useCallback(async (opts: PaddleCheckoutOptions) => {
    if (!scriptLoaded) {
      await loadPaddleScript();
    }
    window.Paddle?.Checkout.open(opts);
  }, []);

  const closeCheckout = useCallback(() => {
    window.Paddle?.Checkout.close();
  }, []);

  return { ready: loadedRef.current, openCheckout, closeCheckout };
}
