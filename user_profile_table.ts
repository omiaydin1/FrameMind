/**
 * ===============================================================================
 * Enhanced Farcaster API Integration - Multi-Source with Advanced Reliability
 * ===============================================================================
 * 
 * This module provides comprehensive Farcaster data fetching with:
 * - Multiple API sources with intelligent fallback
 * - Exponential backoff retry logic
 * - Rate limit detection and handling
 * - Connection status monitoring
 * - Detailed error logging for debugging
 * 
 * API Sources (in priority order):
 * 1. Neynar API - Primary source for user casts and engagement data
 * 2. Warpcast API - Fallback for cast data
 * 3. Simulated Data - Last resort for demo/testing
 */

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
}

export interface FarcasterCast {
  hash: string;
  text: string;
  timestamp: number;
  author: FarcasterUser;
  reactions: {
    likes: number;
    recasts: number;
    replies: number;
  };
  embeds?: string[];
  url?: string;
}

export interface EngagementTrend {
  metric: 'likes' | 'recasts' | 'replies';
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source?: 'neynar' | 'warpcast' | 'simulated';
  retries?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  source?: string;
  latency?: number;
  error?: string;
}

/**
 * Exponential backoff retry utility
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Generate Warpcast URL for any cast
 */
export function getCastUrl(castHash: string, authorUsername: string = 'user'): string {
  const hash = castHash.startsWith('0x') ? castHash.slice(2) : castHash;
  return `https://warpcast.com/${authorUsername}/${hash}`;
}

/**
 * Fetch user casts from Neynar API (Primary Source)
 */
async function fetchFromNeynar(fid: number): Promise<APIResponse<FarcasterCast[]>> {
  const startTime = Date.now();
  
  try {
    console.log('[Neynar] Starting fetch for FID:', fid);
    
    const result = await retryWithBackoff(async () => {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: 'api.neynar.com',
          path: `/v2/farcaster/feed?fid=${fid}&limit=25&filter_type=casts`,
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api_key': 'NEYNAR_API_DOCS',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    }, 3, 1000);

    const latency = Date.now() - startTime;
    console.log(`[Neynar] Response received in ${latency}ms`);

    if (!result.casts || !Array.isArray(result.casts)) {
      throw new Error('Invalid Neynar response format: missing casts array');
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const casts: FarcasterCast[] = result.casts
      .filter((cast: any) => {
        const timestamp = cast.timestamp ? new Date(cast.timestamp).getTime() : 0;
        return timestamp >= sevenDaysAgo;
      })
      .map((cast: any) => {
        const author = cast.author || {};
        const username = author.username || 'user';
        const castHash = cast.hash || String(Date.now());
        
        return {
          hash: castHash,
          text: cast.text || '',
          timestamp: cast.timestamp ? new Date(cast.timestamp).getTime() : Date.now(),
          author: {
            fid: author.fid || fid,
            username,
            displayName: author.display_name || author.username || 'User',
            pfpUrl: author.pfp_url || '',
            bio: author.profile?.bio?.text || '',
          },
          reactions: {
            likes: cast.reactions?.likes_count || 0,
            recasts: cast.reactions?.recasts_count || 0,
            replies: cast.replies?.count || 0,
          },
          embeds: cast.embeds || [],
          url: getCastUrl(castHash, username),
        };
      });

    console.log(`[Neynar] ✓ Successfully fetched ${casts.length} casts (${latency}ms)`);
    return { success: true, data: casts, source: 'neynar' };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[Neynar] ✗ Error after ${latency}ms:`, error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'neynar'
    };
  }
}

/**
 * Fetch user casts from Warpcast API (Fallback Source)
 */
async function fetchFromWarpcast(fid: number): Promise<APIResponse<FarcasterCast[]>> {
  const startTime = Date.now();
  
  try {
    console.log('[Warpcast] Starting fetch for FID:', fid);
    
    const result = await retryWithBackoff(async () => {
      const response = await fetch(`https://client.warpcast.com/v2/user-casts?fid=${fid}&limit=25`, {
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Warpcast API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    }, 2, 1000);

    const latency = Date.now() - startTime;
    console.log(`[Warpcast] Response received in ${latency}ms`);

    if (!result.result?.casts || !Array.isArray(result.result.casts)) {
      throw new Error('Invalid Warpcast response format: missing casts array');
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const casts: FarcasterCast[] = result.result.casts
      .filter((cast: any) => {
        const timestamp = cast.timestamp || 0;
        return timestamp >= sevenDaysAgo;
      })
      .map((cast: any) => {
        const author = cast.author || {};
        const username = author.username || 'user';
        const castHash = cast.hash || String(Date.now());
        const reactions = cast.reactions || {};
        const replies = cast.replies || {};
        
        return {
          hash: castHash,
          text: cast.text || '',
          timestamp: cast.timestamp || Date.now(),
          author: {
            fid: author.fid || fid,
            username,
            displayName: author.displayName || username || 'User',
            pfpUrl: author.pfp?.url || '',
          },
          reactions: {
            likes: reactions.count || 0,
            recasts: cast.recasts?.count || 0,
            replies: replies.count || 0,
          },
          embeds: cast.embeds || [],
          url: getCastUrl(castHash, username),
        };
      });

    console.log(`[Warpcast] ✓ Successfully fetched ${casts.length} casts (${latency}ms)`);
    return { success: true, data: casts, source: 'warpcast' };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[Warpcast] ✗ Error after ${latency}ms:`, error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'warpcast'
    };
  }
}

/**
 * Generate realistic simulated casts (Last Resort Fallback)
 */
function generateSimulatedCasts(fid: number): FarcasterCast[] {
  console.log('[Simulator] Generating demo data for FID:', fid);
  
  const topics = [
    { text: 'Just deployed a new smart contract on Base! The gas fees are incredibly low and the UX is smooth. This is the future of web3. 🚀', category: 'web3', viral: true },
    { text: 'Building in public is the best way to learn. Every bug teaches you something new, every feature shipped is a victory. Keep shipping! 💪', category: 'building', popular: true },
    { text: 'The Farcaster community is amazing. Met so many talented builders today. This is what decentralized social should feel like. 🎯', category: 'community', popular: true },
    { text: 'Hot take: The best crypto projects focus on solving real problems, not just hype. User experience matters more than fancy tokenomics.', category: 'opinion', viral: false },
    { text: 'gm everyone! Working on something exciting today. Can\'t wait to share it with you all. The builder energy is real! ☀️', category: 'daily', popular: false },
    { text: 'Just tested out a new DeFi protocol on Base. The speed is impressive - transactions confirm in seconds. This is game-changing.', category: 'defi', popular: true },
    { text: 'Reminder: Your network is your net worth. Connect with builders, learn from everyone, and share what you know. We grow together! 🌱', category: 'wisdom', viral: false },
    { text: 'The intersection of AI and crypto is fascinating. Imagine autonomous agents managing your portfolio while you sleep. The future is wild.', category: 'innovation', viral: true },
    { text: 'NFT utility is evolving beyond JPEGs. Seeing real use cases in gaming, identity, and access control. This is just the beginning.', category: 'nft', popular: true },
    { text: 'Base is quietly becoming the go-to L2 for builders. Low fees + Coinbase backing + growing ecosystem = perfect storm for adoption.', category: 'base', viral: true },
    { text: 'Taking a moment to appreciate how far web3 has come. From early Bitcoin days to now - the innovation is incredible. 🙏', category: 'reflection', popular: false },
    { text: 'Pro tip: When building web3 apps, focus on making onboarding seamless. If grandma can\'t use it, it won\'t reach mass adoption.', category: 'tips', popular: true },
  ];

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const numCasts = Math.floor(Math.random() * 8) + 8;
  const casts: FarcasterCast[] = [];
  
  for (let i = 0; i < numCasts; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const timestamp = sevenDaysAgo + Math.random() * (now - sevenDaysAgo);
    
    let likes: number, recasts: number, replies: number;
    
    if (topic.viral) {
      likes = Math.floor(Math.random() * 50) + 30;
      recasts = Math.floor(Math.random() * 20) + 10;
      replies = Math.floor(Math.random() * 25) + 8;
    } else if (topic.popular) {
      likes = Math.floor(Math.random() * 25) + 10;
      recasts = Math.floor(Math.random() * 10) + 3;
      replies = Math.floor(Math.random() * 12) + 3;
    } else {
      likes = Math.floor(Math.random() * 15) + 2;
      recasts = Math.floor(Math.random() * 5) + 1;
      replies = Math.floor(Math.random() * 8) + 1;
    }
    
    const castHash = `simulated_${i}_${Date.now()}`;
    const username = 'builder';
    
    casts.push({
      hash: castHash,
      text: topic.text,
      timestamp,
      author: {
        fid,
        username,
        displayName: 'Web3 Builder',
        pfpUrl: '',
      },
      reactions: { likes, recasts, replies },
      embeds: [],
      url: getCastUrl(castHash, username),
    });
  }
  
  return casts.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Check Farcaster connection status
 */
export async function checkFarcasterConnection(): Promise<ConnectionStatus> {
  try {
    const startTime = Date.now();
    
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'api.neynar.com',
        path: '/v2/farcaster/user/bulk?fids=1',
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api_key': 'NEYNAR_API_DOCS',
        },
      }),
    });

    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        connected: true,
        source: 'neynar',
        latency,
      };
    }
    
    return {
      connected: false,
      error: `HTTP ${response.status}`,
      latency,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main function: Fetch user casts with intelligent fallback
 */
export async function fetchUserCasts(fid: number): Promise<FarcasterCast[]> {
  console.log('\n=== Farcaster Data Fetch Started ===');
  console.log('FID:', fid);
  console.log('Strategy: Neynar → Warpcast → Simulated Demo');
  console.log('Timestamp:', new Date().toISOString());
  
  // Check connection first
  const connectionStatus = await checkFarcasterConnection();
  console.log('Connection Status:', connectionStatus);
  
  // Try Neynar first (Primary Source)
  const neynarResult = await fetchFromNeynar(fid);
  if (neynarResult.success && neynarResult.data && neynarResult.data.length > 0) {
    console.log('✓ Using Neynar data');
    console.log('=== Fetch Complete ===\n');
    return neynarResult.data;
  }
  
  // Fallback to Warpcast
  console.log('⚠ Neynar unavailable, trying Warpcast...');
  const warpcastResult = await fetchFromWarpcast(fid);
  if (warpcastResult.success && warpcastResult.data && warpcastResult.data.length > 0) {
    console.log('✓ Using Warpcast data');
    console.log('=== Fetch Complete ===\n');
    return warpcastResult.data;
  }
  
  // Last resort: Simulated realistic data
  console.log('⚠ All APIs unavailable, using simulated demo data');
  console.log('=== Fetch Complete ===\n');
  return generateSimulatedCasts(fid);
}

/**
 * Get top casts by engagement score
 */
export function getTopCasts(casts: FarcasterCast[], limit: number = 5): FarcasterCast[] {
  return [...casts]
    .sort((a, b) => {
      const aScore = a.reactions.likes + a.reactions.recasts * 2 + a.reactions.replies;
      const bScore = b.reactions.likes + b.reactions.recasts * 2 + b.reactions.replies;
      return bScore - aScore;
    })
    .slice(0, limit);
}

/**
 * Calculate total engagement across all casts
 */
export function calculateTotalEngagement(casts: FarcasterCast[]): number {
  return casts.reduce((total, cast) => {
    return total + cast.reactions.likes + cast.reactions.recasts + cast.reactions.replies;
  }, 0);
}

/**
 * Get average engagement per cast
 */
export function getAverageEngagement(casts: FarcasterCast[]): number {
  if (casts.length === 0) return 0;
  const total = calculateTotalEngagement(casts);
  return Math.round(total / casts.length);
}

/**
 * Analyze engagement trends (recent vs older casts)
 */
export function analyzeEngagementTrends(casts: FarcasterCast[]): EngagementTrend[] {
  if (casts.length < 2) return [];

  const sortedCasts = [...casts].sort((a, b) => b.timestamp - a.timestamp);
  
  const midpoint = Math.floor(sortedCasts.length / 2);
  const recentCasts = sortedCasts.slice(0, midpoint);
  const olderCasts = sortedCasts.slice(midpoint);

  const recentAvg = {
    likes: recentCasts.reduce((sum, c) => sum + c.reactions.likes, 0) / recentCasts.length,
    recasts: recentCasts.reduce((sum, c) => sum + c.reactions.recasts, 0) / recentCasts.length,
    replies: recentCasts.reduce((sum, c) => sum + c.reactions.replies, 0) / recentCasts.length,
  };

  const olderAvg = {
    likes: olderCasts.reduce((sum, c) => sum + c.reactions.likes, 0) / olderCasts.length,
    recasts: olderCasts.reduce((sum, c) => sum + c.reactions.recasts, 0) / olderCasts.length,
    replies: olderCasts.reduce((sum, c) => sum + c.reactions.replies, 0) / olderCasts.length,
  };

  const trends: EngagementTrend[] = [];
  
  const metrics: Array<'likes' | 'recasts' | 'replies'> = ['likes', 'recasts', 'replies'];
  
  metrics.forEach(metric => {
    const change = ((recentAvg[metric] - olderAvg[metric]) / (olderAvg[metric] || 1)) * 100;
    const trend = change > 10 ? 'up' : change < -10 ? 'down' : 'stable';
    trends.push({ metric, trend, change: Math.round(change) });
  });

  return trends;
}

/**
 * Get most liked cast
 */
export function getMostLikedCast(casts: FarcasterCast[]): FarcasterCast | null {
  if (casts.length === 0) return null;
  return [...casts].sort((a, b) => b.reactions.likes - a.reactions.likes)[0] || null;
}

/**
 * Get highest comment activity cast
 */
export function getMostCommentedCast(casts: FarcasterCast[]): FarcasterCast | null {
  if (casts.length === 0) return null;
  return [...casts].sort((a, b) => b.reactions.replies - a.reactions.replies)[0] || null;
}
