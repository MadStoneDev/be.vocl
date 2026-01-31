/**
 * SightEngine API Client for Content Moderation
 *
 * Used to scan images and videos for:
 * - Minor safety (nudity involving minors)
 * - Violence
 * - Harmful content
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
        models: 'nudity-2.1,weapon,gore,child',
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
        models: 'nudity-2.1,weapon,gore',
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
        reason: 'Video check initiated',
      };
    } catch (error) {
      console.error('SightEngine video check failed:', error);
      return {
        safe: true,
        flagged: false,
        confidence: 0,
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
      reason: 'Video processing timeout',
    };
  }

  /**
   * Analyze image moderation response
   */
  private analyzeImageResponse(data: SightEngineResponse): ModerationResult {
    const issues: string[] = [];
    let maxConfidence = 0;

    // Check for child safety issues - HIGHEST PRIORITY
    if (data.child?.context === 'not_safe') {
      return {
        safe: false,
        flagged: true,
        reason: 'Potential minor safety concern detected',
        confidence: 1.0,
        rawResponse: data,
      };
    }

    // Check nudity with context
    if (data.nudity) {
      const nudity = data.nudity;

      // High severity nudity
      if (nudity.sexual_activity > 0.5) {
        issues.push('sexual_activity');
        maxConfidence = Math.max(maxConfidence, nudity.sexual_activity);
      }
      if (nudity.sexual_display > 0.5) {
        issues.push('sexual_display');
        maxConfidence = Math.max(maxConfidence, nudity.sexual_display);
      }
      if (nudity.erotica > 0.7) {
        issues.push('erotica');
        maxConfidence = Math.max(maxConfidence, nudity.erotica);
      }
    }

    // Check weapons
    if (data.weapon) {
      const weapon = data.weapon.classes;
      if (weapon.firearm > 0.7 || weapon.knife > 0.7) {
        issues.push('weapon');
        maxConfidence = Math.max(maxConfidence, Math.max(weapon.firearm, weapon.knife));
      }
    }

    // Check gore/violence
    if (data.gore && data.gore.prob > 0.5) {
      issues.push('violence');
      maxConfidence = Math.max(maxConfidence, data.gore.prob);
    }

    if (issues.length > 0) {
      return {
        safe: false,
        flagged: true,
        reason: `Content flagged: ${issues.join(', ')}`,
        confidence: maxConfidence,
        rawResponse: data,
      };
    }

    return {
      safe: true,
      flagged: false,
      confidence: 1 - maxConfidence,
      rawResponse: data,
    };
  }

  /**
   * Analyze video moderation response
   */
  private analyzeVideoResponse(data: any): ModerationResult {
    // Check frames for issues
    const frames = data.data?.frames || [];
    let maxIssueConfidence = 0;
    const issues: string[] = [];

    for (const frame of frames) {
      if (frame.nudity) {
        if (frame.nudity.sexual_activity > 0.5) {
          issues.push('sexual_activity');
          maxIssueConfidence = Math.max(maxIssueConfidence, frame.nudity.sexual_activity);
        }
        if (frame.nudity.sexual_display > 0.5) {
          issues.push('sexual_display');
          maxIssueConfidence = Math.max(maxIssueConfidence, frame.nudity.sexual_display);
        }
      }

      if (frame.weapon?.classes) {
        const weapon = frame.weapon.classes;
        if (weapon.firearm > 0.7 || weapon.knife > 0.7) {
          issues.push('weapon');
          maxIssueConfidence = Math.max(maxIssueConfidence, Math.max(weapon.firearm, weapon.knife));
        }
      }

      if (frame.gore?.prob > 0.5) {
        issues.push('violence');
        maxIssueConfidence = Math.max(maxIssueConfidence, frame.gore.prob);
      }
    }

    if (issues.length > 0) {
      return {
        safe: false,
        flagged: true,
        reason: `Video content flagged: ${[...new Set(issues)].join(', ')}`,
        confidence: maxIssueConfidence,
        rawResponse: data,
      };
    }

    return {
      safe: true,
      flagged: false,
      confidence: 1 - maxIssueConfidence,
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
