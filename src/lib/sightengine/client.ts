/**
 * SightEngine API Client for Content Moderation
 *
 * Policy:
 * - Child safety issues: ALWAYS flag (highest priority)
 * - Nudity/sexual/erotica: ALLOWED (users can mark as NSFW)
 * - Weapons: ALLOWED
 * - Gore: Only flag if extreme (> 0.85)
 */

interface SightEngineConfig {
  apiUser: string;
  apiSecret: string;
}

interface ModerationResult {
  safe: boolean;
  flagged: boolean;
  reason?: string;
  confidence: number;
  suggestSensitive: boolean; // Auto-apply is_sensitive flag
  sensitiveReason?: string;
  rawResponse?: any;
}

interface NudityResult {
  sexual_activity: number;
  sexual_display: number;
  erotica: number;
  very_suggestive: number;
  suggestive: number;
  mildly_suggestive: number;
  suggestive_classes?: {
    male_chest: number;
    cleavage: number;
    lingerie: number;
    miniskirt: number;
    other: number;
  };
  none: number;
  context?: {
    sea_lake_pool: number;
    outdoor_other: number;
    indoor_other: number;
  };
}

interface WeaponResult {
  classes: {
    firearm: number;
    firearm_gesture: number;
    firearm_toy: number;
    knife: number;
    animated_firearm: number;
    animated_knife: number;
  };
}

interface GoreResult {
  prob: number;
}

interface ChildResult {
  context: 'safe' | 'not_safe' | 'unknown';
}

interface SightEngineResponse {
  status: string;
  request: {
    id: string;
  };
  nudity?: NudityResult;
  weapon?: WeaponResult;
  gore?: GoreResult;
  child?: ChildResult;
  error?: {
    type: string;
    message: string;
  };
}

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
        models: 'nudity-2.1,gore,child', // Check for sensitive content + child safety
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const response = await fetch(`${this.baseUrl}/check.json?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('SightEngine API error:', response.status);
        return {
          safe: true, // Fail open to not block legitimate content
          flagged: false,
          confidence: 0,
          suggestSensitive: false,
          reason: 'API error',
        };
      }

      const data: SightEngineResponse = await response.json();

      if (data.error) {
        console.error('SightEngine error:', data.error);
        return {
          safe: true,
          flagged: false,
          confidence: 0,
          suggestSensitive: false,
          reason: data.error.message,
        };
      }

      return this.analyzeImageResponse(data);
    } catch (error) {
      console.error('SightEngine check failed:', error);
      return {
        safe: true,
        flagged: false,
        confidence: 0,
        suggestSensitive: false,
        reason: 'Check failed',
      };
    }
  }

  /**
   * Check video URL for harmful content
   */
  async checkVideoUrl(videoUrl: string): Promise<ModerationResult> {
    try {
      // Start video moderation job
      const params = new URLSearchParams({
        stream_url: videoUrl,
        models: 'nudity-2.1,gore', // Check for sensitive content
        callback_url: '', // We'll poll instead
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const response = await fetch(`${this.baseUrl}/video/check.json?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('SightEngine video API error:', response.status);
        return {
          safe: true,
          flagged: false,
          confidence: 0,
          suggestSensitive: false,
          reason: 'Video API error',
        };
      }

      const data = await response.json();

      if (data.status === 'success' && data.media?.id) {
        // Poll for results (max 30 seconds)
        return await this.pollVideoResults(data.media.id);
      }

      return {
        safe: true,
        flagged: false,
        confidence: 0,
        suggestSensitive: false,
        reason: 'Video check initiated',
      };
    } catch (error) {
      console.error('SightEngine video check failed:', error);
      return {
        safe: true,
        flagged: false,
        confidence: 0,
        suggestSensitive: false,
        reason: 'Video check failed',
      };
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
          return {
            safe: true,
            flagged: false,
            confidence: 0,
            suggestSensitive: false,
            reason: 'Video processing error',
          };
        }
      } catch (error) {
        console.error('Video poll error:', error);
      }
    }

    // Timeout - fail open
    return {
      safe: true,
      flagged: false,
      confidence: 0,
      suggestSensitive: false,
      reason: 'Video processing timeout',
    };
  }

  /**
   * Analyze image moderation response
   *
   * Policy:
   * - Child safety: ALWAYS flag (block)
   * - Extreme gore (> 0.85): Flag (block)
   * - Nudity/sexual/erotica (> 0.5): Auto-tag as sensitive
   * - Moderate gore (> 0.5): Auto-tag as sensitive
   * - Weapons: Allowed without auto-tag
   */
  private analyzeImageResponse(data: SightEngineResponse): ModerationResult {
    // Check for child safety issues - HIGHEST PRIORITY, ALWAYS FLAG
    if (data.child?.context === 'not_safe') {
      return {
        safe: false,
        flagged: true,
        reason: 'Potential minor safety concern detected',
        confidence: 1.0,
        suggestSensitive: true,
        sensitiveReason: 'child_safety',
        rawResponse: data,
      };
    }

    // Check for extreme gore (> 0.85) - FLAG/BLOCK
    if (data.gore && data.gore.prob > 0.85) {
      return {
        safe: false,
        flagged: true,
        reason: 'Extreme graphic content detected',
        confidence: data.gore.prob,
        suggestSensitive: true,
        sensitiveReason: 'extreme_gore',
        rawResponse: data,
      };
    }

    // Check for sensitive content that should be auto-tagged
    const sensitiveReasons: string[] = [];

    // Nudity/sexual content detection
    if (data.nudity) {
      const nudity = data.nudity;
      if (nudity.sexual_activity > 0.5) sensitiveReasons.push('sexual_activity');
      if (nudity.sexual_display > 0.5) sensitiveReasons.push('sexual_display');
      if (nudity.erotica > 0.5) sensitiveReasons.push('erotica');
      if (nudity.very_suggestive > 0.7) sensitiveReasons.push('suggestive');
    }

    // Moderate gore detection
    if (data.gore && data.gore.prob > 0.5) {
      sensitiveReasons.push('gore');
    }

    // Content is allowed but should be marked sensitive
    if (sensitiveReasons.length > 0) {
      return {
        safe: true,
        flagged: false,
        confidence: 1.0,
        suggestSensitive: true,
        sensitiveReason: sensitiveReasons.join(', '),
        rawResponse: data,
      };
    }

    // Safe, no sensitive content detected
    return {
      safe: true,
      flagged: false,
      confidence: 1.0,
      suggestSensitive: false,
      rawResponse: data,
    };
  }

  /**
   * Analyze video moderation response
   *
   * Policy:
   * - Extreme gore (> 0.85): Flag (block)
   * - Nudity/sexual/erotica (> 0.5): Auto-tag as sensitive
   * - Moderate gore (> 0.5): Auto-tag as sensitive
   */
  private analyzeVideoResponse(data: any): ModerationResult {
    const frames = data.data?.frames || [];
    let maxGoreConfidence = 0;
    const sensitiveReasons: Set<string> = new Set();

    for (const frame of frames) {
      // Check for extreme gore (block threshold)
      if (frame.gore?.prob > 0.85) {
        maxGoreConfidence = Math.max(maxGoreConfidence, frame.gore.prob);
      }

      // Check for sensitive content (auto-tag threshold)
      if (frame.gore?.prob > 0.5) {
        sensitiveReasons.add('gore');
      }

      if (frame.nudity) {
        if (frame.nudity.sexual_activity > 0.5) sensitiveReasons.add('sexual_activity');
        if (frame.nudity.sexual_display > 0.5) sensitiveReasons.add('sexual_display');
        if (frame.nudity.erotica > 0.5) sensitiveReasons.add('erotica');
        if (frame.nudity.very_suggestive > 0.7) sensitiveReasons.add('suggestive');
      }
    }

    // Flag/block if extreme gore detected
    if (maxGoreConfidence > 0.85) {
      return {
        safe: false,
        flagged: true,
        reason: 'Extreme graphic content detected in video',
        confidence: maxGoreConfidence,
        suggestSensitive: true,
        sensitiveReason: 'extreme_gore',
        rawResponse: data,
      };
    }

    // Auto-tag as sensitive if nudity/gore detected
    if (sensitiveReasons.size > 0) {
      return {
        safe: true,
        flagged: false,
        confidence: 1.0,
        suggestSensitive: true,
        sensitiveReason: Array.from(sensitiveReasons).join(', '),
      };
    }

    // Safe, no sensitive content
    return {
      safe: true,
      flagged: false,
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
    // No moderation configured - allow all
    return {
      safe: true,
      flagged: false,
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
