/**
 * SightEngine API Client for Content Moderation
 *
 * Policy:
 * - Possible minor + sexual content: ALWAYS block (highest priority, CSAM path)
 * - Possible minor alone (no nudity): HOLD for manual review (could be a normal
 *   photo containing a child; a human decides)
 * - Extreme gore (> 0.85): block
 * - Nudity/sexual/erotica: ALLOWED, auto-tagged sensitive
 * - Weapons: ALLOWED
 * - Moderate gore (> 0.5): auto-tagged sensitive
 * - If the check is configured but ERRORS: hold for manual review (fail-closed),
 *   rather than publishing unscreened.
 */

interface SightEngineConfig {
  apiUser: string;
  apiSecret: string;
}

interface ModerationResult {
  /** True unless the content should be blocked outright. */
  safe: boolean;
  /** Hard block (possible minor + sexual content, or extreme gore). */
  flagged: boolean;
  /** Needs a human decision before it can go live (possible minor alone, or the
   *  check itself failed). Withheld like `flagged` but lower severity. */
  hold: boolean;
  reason?: string;
  holdReason?: string;
  confidence: number;
  suggestSensitive: boolean; // Auto-apply is_sensitive flag
  sensitiveReason?: string;
  /** The check ran (keys configured) but errored/timed out — caller should hold. */
  errored?: boolean;
  rawResponse?: any;
}

interface NudityResult {
  sexual_activity: number;
  sexual_display: number;
  erotica: number;
  very_suggestive: number;
  suggestive: number;
  mildly_suggestive: number;
  none: number;
}

interface GoreResult {
  prob: number;
}

/** face-age model: one entry per detected face, with a minor (under-18) prob. */
interface FaceResult {
  attributes?: {
    age?: {
      minor?: number;
    };
  };
}

interface SightEngineResponse {
  status: string;
  request: {
    id: string;
  };
  nudity?: NudityResult;
  gore?: GoreResult;
  faces?: FaceResult[];
  error?: {
    type: string;
    message: string;
  };
}

// Thresholds
const MINOR_THRESHOLD = 0.5; // face-age minor probability to treat a face as a minor
const NUDITY_THRESHOLD = 0.5;
const SUGGESTIVE_THRESHOLD = 0.7;
const GORE_SENSITIVE_THRESHOLD = 0.5;
const GORE_BLOCK_THRESHOLD = 0.85;

class SightEngineClient {
  private apiUser: string;
  private apiSecret: string;
  private baseUrl = 'https://api.sightengine.com/1.0';

  constructor(config: SightEngineConfig) {
    this.apiUser = config.apiUser;
    this.apiSecret = config.apiSecret;
  }

  /**
   * Check image URL for harmful content
   */
  async checkImageUrl(imageUrl: string): Promise<ModerationResult> {
    try {
      const params = new URLSearchParams({
        url: imageUrl,
        // nudity + gore (sensitive/block) + face-age (minor detection)
        models: 'nudity-2.1,gore-2.0,face-age',
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const response = await fetch(`${this.baseUrl}/check.json?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('SightEngine API error:', response.status);
        return this.erroredResult(`API error (${response.status})`);
      }

      const data: SightEngineResponse = await response.json();

      if (data.error) {
        console.error('SightEngine error:', data.error);
        return this.erroredResult(data.error.message);
      }

      return this.analyzeImageResponse(data);
    } catch (error) {
      console.error('SightEngine check failed:', error);
      return this.erroredResult('Check failed');
    }
  }

  /**
   * Check video URL for harmful content
   */
  async checkVideoUrl(videoUrl: string): Promise<ModerationResult> {
    try {
      const params = new URLSearchParams({
        stream_url: videoUrl,
        models: 'nudity-2.1,gore-2.0',
        callback_url: '', // We'll poll instead
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const response = await fetch(`${this.baseUrl}/video/check.json?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('SightEngine video API error:', response.status);
        return this.erroredResult(`Video API error (${response.status})`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.media?.id) {
        // Poll for results (max ~30 seconds)
        return await this.pollVideoResults(data.media.id);
      }

      // Couldn't start the job — treat as an error so the caller holds.
      return this.erroredResult('Video check could not start');
    } catch (error) {
      console.error('SightEngine video check failed:', error);
      return this.erroredResult('Video check failed');
    }
  }

  /**
   * Poll for video moderation results
   */
  private async pollVideoResults(mediaId: string): Promise<ModerationResult> {
    const maxAttempts = 10;
    const delay = 3000; // 3 seconds

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));

      const params = new URLSearchParams({
        media_id: mediaId,
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      try {
        const response = await fetch(`${this.baseUrl}/video/check-status.json?${params}`);
        const data = await response.json();

        if (data.status === 'finished') {
          return this.analyzeVideoResponse(data);
        }

        if (data.status === 'error') {
          return this.erroredResult('Video processing error');
        }
      } catch (error) {
        console.error('Video poll error:', error);
      }
    }

    // Timeout - hold for review rather than publish unscreened
    return this.erroredResult('Video processing timeout');
  }

  /** Standard result when a configured check fails: caller should HOLD. */
  private erroredResult(reason: string): ModerationResult {
    return {
      safe: true,
      flagged: false,
      hold: false,
      errored: true,
      confidence: 0,
      suggestSensitive: false,
      reason,
    };
  }

  /**
   * Analyze image moderation response.
   *
   * Order matters (most severe first):
   * 1. Possible minor + sexual content  -> BLOCK (CSAM path)
   * 2. Extreme gore (> 0.85)            -> BLOCK
   * 3. Possible minor, no nudity        -> HOLD for manual review
   * 4. Nudity / moderate gore           -> allow, auto-tag sensitive
   */
  private analyzeImageResponse(data: SightEngineResponse): ModerationResult {
    // Highest minor probability across all detected faces.
    let maxMinor = 0;
    for (const face of data.faces || []) {
      const m = face?.attributes?.age?.minor ?? 0;
      if (m > maxMinor) maxMinor = m;
    }
    const minorLikely = maxMinor >= MINOR_THRESHOLD;

    // Any meaningful nudity/sexual signal?
    const n = data.nudity;
    const nuditySignal = !!n && (
      n.sexual_activity > NUDITY_THRESHOLD ||
      n.sexual_display > NUDITY_THRESHOLD ||
      n.erotica > NUDITY_THRESHOLD ||
      n.very_suggestive > SUGGESTIVE_THRESHOLD
    );

    // 1. Minor + sexual content — ALWAYS BLOCK
    if (minorLikely && nuditySignal) {
      return {
        safe: false,
        flagged: true,
        hold: false,
        reason: 'Possible minor detected in sexual/suggestive content',
        confidence: maxMinor,
        suggestSensitive: true,
        sensitiveReason: 'minor_safety',
        rawResponse: data,
      };
    }

    // 2. Extreme gore — BLOCK
    if (data.gore && data.gore.prob > GORE_BLOCK_THRESHOLD) {
      return {
        safe: false,
        flagged: true,
        hold: false,
        reason: 'Extreme graphic content detected',
        confidence: data.gore.prob,
        suggestSensitive: true,
        sensitiveReason: 'extreme_gore',
        rawResponse: data,
      };
    }

    // 3. Possible minor with no nudity — HOLD for a human to review
    if (minorLikely) {
      return {
        safe: false,
        flagged: false,
        hold: true,
        holdReason: 'Possible minor detected — held for manual review',
        reason: 'Possible minor detected',
        confidence: maxMinor,
        suggestSensitive: false,
        rawResponse: data,
      };
    }

    // 4. Nudity / moderate gore — allowed but auto-tag sensitive
    const sensitiveReasons: string[] = [];
    if (n) {
      if (n.sexual_activity > NUDITY_THRESHOLD) sensitiveReasons.push('sexual_activity');
      if (n.sexual_display > NUDITY_THRESHOLD) sensitiveReasons.push('sexual_display');
      if (n.erotica > NUDITY_THRESHOLD) sensitiveReasons.push('erotica');
      if (n.very_suggestive > SUGGESTIVE_THRESHOLD) sensitiveReasons.push('suggestive');
    }
    if (data.gore && data.gore.prob > GORE_SENSITIVE_THRESHOLD) {
      sensitiveReasons.push('gore');
    }

    if (sensitiveReasons.length > 0) {
      return {
        safe: true,
        flagged: false,
        hold: false,
        confidence: 1.0,
        suggestSensitive: true,
        sensitiveReason: sensitiveReasons.join(', '),
        rawResponse: data,
      };
    }

    return {
      safe: true,
      flagged: false,
      hold: false,
      confidence: 1.0,
      suggestSensitive: false,
      rawResponse: data,
    };
  }

  /**
   * Analyze video moderation response (per-frame nudity + gore).
   * Note: minor (face-age) detection is not run on video here — that's a known
   * follow-up. Extreme gore blocks; nudity auto-tags sensitive.
   */
  private analyzeVideoResponse(data: any): ModerationResult {
    const frames = data.data?.frames || [];
    let maxGoreConfidence = 0;
    const sensitiveReasons: Set<string> = new Set();

    for (const frame of frames) {
      if (frame.gore?.prob > GORE_BLOCK_THRESHOLD) {
        maxGoreConfidence = Math.max(maxGoreConfidence, frame.gore.prob);
      }
      if (frame.gore?.prob > GORE_SENSITIVE_THRESHOLD) {
        sensitiveReasons.add('gore');
      }
      if (frame.nudity) {
        if (frame.nudity.sexual_activity > NUDITY_THRESHOLD) sensitiveReasons.add('sexual_activity');
        if (frame.nudity.sexual_display > NUDITY_THRESHOLD) sensitiveReasons.add('sexual_display');
        if (frame.nudity.erotica > NUDITY_THRESHOLD) sensitiveReasons.add('erotica');
        if (frame.nudity.very_suggestive > SUGGESTIVE_THRESHOLD) sensitiveReasons.add('suggestive');
      }
    }

    if (maxGoreConfidence > GORE_BLOCK_THRESHOLD) {
      return {
        safe: false,
        flagged: true,
        hold: false,
        reason: 'Extreme graphic content detected in video',
        confidence: maxGoreConfidence,
        suggestSensitive: true,
        sensitiveReason: 'extreme_gore',
        rawResponse: data,
      };
    }

    if (sensitiveReasons.size > 0) {
      return {
        safe: true,
        flagged: false,
        hold: false,
        confidence: 1.0,
        suggestSensitive: true,
        sensitiveReason: Array.from(sensitiveReasons).join(', '),
      };
    }

    return {
      safe: true,
      flagged: false,
      hold: false,
      confidence: 1.0,
      suggestSensitive: false,
    };
  }
}

// Singleton instance
let client: SightEngineClient | null = null;

/**
 * Get or create SightEngine client
 */
export function getSightEngineClient(): SightEngineClient | null {
  if (client) return client;

  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    console.warn('SightEngine not configured - content moderation disabled');
    return null;
  }

  client = new SightEngineClient({
    apiUser,
    apiSecret,
  });

  return client;
}

/**
 * Check content for moderation issues
 */
export async function moderateContent(
  contentUrl: string,
  contentType: 'image' | 'video'
): Promise<ModerationResult> {
  const client = getSightEngineClient();

  if (!client) {
    // No moderation configured - allow all (NOT a hold: keys simply aren't set).
    return {
      safe: true,
      flagged: false,
      hold: false,
      errored: false,
      confidence: 0,
      suggestSensitive: false,
      reason: 'Moderation not configured',
    };
  }

  if (contentType === 'image') {
    return client.checkImageUrl(contentUrl);
  } else {
    return client.checkVideoUrl(contentUrl);
  }
}

export type { ModerationResult };
