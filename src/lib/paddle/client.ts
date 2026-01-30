/**
 * Paddle Payment Integration
 *
 * Environment variables required:
 * - PADDLE_VENDOR_ID: Your Paddle vendor ID
 * - PADDLE_API_KEY: Your Paddle API key
 * - NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: Your Paddle client-side token
 * - PADDLE_WEBHOOK_SECRET: Webhook signature secret
 */

export interface PaddleProduct {
  id: string;
  name: string;
  description: string;
  priceId: string;
}

export interface PaddleCheckoutData {
  customerId?: string;
  customerEmail?: string;
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customData?: Record<string, string>;
  successUrl?: string;
  returnUrl?: string;
}

export interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: any;
}

// Product IDs for different tip amounts
export const TIP_PRODUCTS = {
  small: {
    id: "tip_small",
    name: "Small Tip",
    description: "Show your appreciation with a small tip",
    amount: 2,
  },
  medium: {
    id: "tip_medium",
    name: "Medium Tip",
    description: "Support this creator",
    amount: 5,
  },
  large: {
    id: "tip_large",
    name: "Large Tip",
    description: "Make their day!",
    amount: 10,
  },
  custom: {
    id: "tip_custom",
    name: "Custom Tip",
    description: "Choose your own amount",
    amount: 0,
  },
};

// Verification badge product
export const VERIFICATION_PRODUCT = {
  id: "verification_badge",
  name: "Verification Badge",
  description: "Get verified on be.vocl - one-time purchase",
  amount: 8,
};

/**
 * Server-side Paddle API client
 */
export class PaddleServer {
  private apiKey: string;
  private vendorId: string;
  private baseUrl = "https://api.paddle.com";

  constructor() {
    this.apiKey = process.env.PADDLE_API_KEY || "";
    this.vendorId = process.env.PADDLE_VENDOR_ID || "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Paddle API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Create a checkout session for tipping
   */
  async createTipCheckout(data: {
    recipientId: string;
    recipientUsername: string;
    tipAmount: number;
    senderEmail?: string;
    senderId?: string;
  }): Promise<{ checkoutUrl: string; transactionId: string }> {
    // In production, you would create a transaction using Paddle's API
    // For now, return a placeholder that will be handled client-side
    return {
      checkoutUrl: "",
      transactionId: `tip_${Date.now()}`,
    };
  }

  /**
   * Create a checkout session for verification
   */
  async createVerificationCheckout(data: {
    userId: string;
    userEmail: string;
  }): Promise<{ checkoutUrl: string; transactionId: string }> {
    // In production, you would create a transaction using Paddle's API
    return {
      checkoutUrl: "",
      transactionId: `verify_${Date.now()}`,
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!webhookSecret) return false;

    // Paddle uses HMAC-SHA256 for webhook signatures
    // In production, implement proper signature verification
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }
}

/**
 * Client-side Paddle initialization
 */
export function initializePaddle(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Paddle can only be initialized on the client"));
      return;
    }

    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!clientToken) {
      reject(new Error("Paddle client token not configured"));
      return;
    }

    // Check if Paddle is already loaded
    if ((window as any).Paddle) {
      resolve((window as any).Paddle);
      return;
    }

    // Load Paddle.js
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      const Paddle = (window as any).Paddle;
      Paddle.Initialize({
        token: clientToken,
        eventCallback: (event: any) => {
          console.log("Paddle event:", event);
        },
      });
      resolve(Paddle);
    };
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.body.appendChild(script);
  });
}

/**
 * Open Paddle checkout
 */
export async function openPaddleCheckout(options: {
  items: Array<{ priceId: string; quantity: number }>;
  customData?: Record<string, string>;
  customerEmail?: string;
  successCallback?: () => void;
  closeCallback?: () => void;
}): Promise<void> {
  const Paddle = await initializePaddle();

  Paddle.Checkout.open({
    items: options.items,
    customData: options.customData,
    customer: options.customerEmail
      ? { email: options.customerEmail }
      : undefined,
    settings: {
      displayMode: "overlay",
      theme: "dark",
      locale: "en",
    },
    successCallback: options.successCallback,
    closeCallback: options.closeCallback,
  });
}
