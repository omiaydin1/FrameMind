/**
 * ===============================================================================
 * Farcaster Data Caching System - Ensures Stable Analytics
 * ===============================================================================
 * 
 * This module provides stable, persistent caching for Farcaster data to prevent
 * fluctuating metrics across page reloads. Features:
 * - localStorage-based persistence
 * - FID-specific cache keys
 * - TTL (time-to-live) management
 * - Cache validation and invalidation
 * - Deterministic fallback data generation
 */

import type { FarcasterCast } from './farcaster-api-verified';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  fid: number;
  source: 'neynar' | 'warpcast' | 'deterministic';
  ttl: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache validity
const CACHE_PREFIX = 'framemind_farcaster_';

/**
 * Get cached data for a specific FID
 */
export function getCachedCasts(fid: number): FarcasterCast[] | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${fid}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log('[Cache] No cached data found for FID:', fid);
      return null;
    }
    
    const entry: CacheEntry<FarcasterCast[]> = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Check if cache is still valid
    if (age > entry.ttl) {
      console.log('[Cache] Cached data expired (age:', Math.round(age / 1000), 'seconds)');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('[Cache] ✓ Using cached data (age:', Math.round(age / 1000), 'seconds, source:', entry.source + ')');
    return entry.data;
    
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Store casts in cache
 */
export function setCachedCasts(
  fid: number, 
  casts: FarcasterCast[], 
  source: 'neynar' | 'warpcast' | 'deterministic'
): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${fid}`;
    const entry: CacheEntry<FarcasterCast[]> = {
      data: casts,
      timestamp: Date.now(),
      fid,
      source,
      ttl: CACHE_TTL,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log('[Cache] ✓ Cached', casts.length, 'casts for FID:', fid, '(source:', source + ')');
    
  } catch (error) {
    console.error('[Cache] Error writing cache:', error);
    // If localStorage is full, clear old entries
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearOldCache();
      // Try again
      try {
        const cacheKey = `${CACHE_PREFIX}${fid}`;
        const entry: CacheEntry<FarcasterCast[]> = {
          data: casts,
          timestamp: Date.now(),
          fid,
          source,
          ttl: CACHE_TTL,
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (retryError) {
        console.error('[Cache] Failed to cache even after cleanup:', retryError);
      }
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCache(): void {
  try {
    const now = Date.now();
    let cleared = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}');
          const age = now - entry.timestamp;
          
          if (age > entry.ttl) {
            localStorage.removeItem(key);
            cleared++;
          }
        } catch {
          // Invalid entry, remove it
          localStorage.removeItem(key);
          cleared++;
        }
      }
    }
    
    console.log('[Cache] Cleared', cleared, 'old cache entries');
  } catch (error) {
    console.error('[Cache] Error clearing old cache:', error);
  }
}

/**
 * Clear all cache for a specific FID
 */
export function clearCacheForFID(fid: number): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${fid}`;
    localStorage.removeItem(cacheKey);
    console.log('[Cache] Cleared cache for FID:', fid);
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}

/**
 * Generate deterministic casts for a specific FID
 * Same FID always produces same data (stable across reloads)
 */
export function generateDeterministicCasts(fid: number): FarcasterCast[] {
  console.log('\n[Deterministic] 🎲 Generating stable data for FID:', fid);
  console.log('[Deterministic] ℹ️ Same FID always produces same data');
  
  // Use FID as seed for deterministic randomness
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
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
  
  // Deterministic number of casts (based on FID)
  const numCasts = 10 + (fid % 6); // Between 10-15 casts, stable for same FID
  const casts: FarcasterCast[] = [];
  
  console.log('[Deterministic] Generating', numCasts, 'casts (deterministic count based on FID)');
  
  for (let i = 0; i < numCasts; i++) {
    // Use FID + index as seed for deterministic selection
    const topicSeed = fid * 100 + i;
    const topicIndex = Math.floor(seededRandom(topicSeed) * topics.length);
    const topic = topics[topicIndex];
    
    // Deterministic timestamp within 7 days
    const timeSeed = fid * 1000 + i;
    const timeOffset = seededRandom(timeSeed) * (now - sevenDaysAgo);
    const timestamp = sevenDaysAgo + timeOffset;
    
    // Deterministic engagement numbers
    let likes: number, recasts: number, replies: number;
    const engagementSeed = fid * 50 + i;
    
    if (topic.viral) {
      likes = Math.floor(seededRandom(engagementSeed) * 50) + 30;
      recasts = Math.floor(seededRandom(engagementSeed + 1) * 20) + 10;
      replies = Math.floor(seededRandom(engagementSeed + 2) * 25) + 8;
    } else if (topic.popular) {
      likes = Math.floor(seededRandom(engagementSeed) * 25) + 10;
      recasts = Math.floor(seededRandom(engagementSeed + 1) * 10) + 3;
      replies = Math.floor(seededRandom(engagementSeed + 2) * 12) + 3;
    } else {
      likes = Math.floor(seededRandom(engagementSeed) * 15) + 2;
      recasts = Math.floor(seededRandom(engagementSeed + 1) * 5) + 1;
      replies = Math.floor(seededRandom(engagementSeed + 2) * 8) + 1;
    }
    
    const castHash = `deterministic_${fid}_${i}`;
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
      url: `https://warpcast.com/${username}/${castHash}`,
    });
  }
  
  // Sort by timestamp (newest first)
  const sortedCasts = casts.sort((a, b) => b.timestamp - a.timestamp);
  
  // Calculate totals for verification
  const totalEngagement = sortedCasts.reduce(
    (sum, cast) => sum + cast.reactions.likes + cast.reactions.recasts + cast.reactions.replies,
    0
  );
  
  console.log('[Deterministic] ✓ Generated', sortedCasts.length, 'deterministic casts');
  console.log('[Deterministic] Total Engagement:', totalEngagement);
  console.log('[Deterministic] These values will remain stable across reloads for FID:', fid);
  
  return sortedCasts;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  try {
    let entries = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        entries++;
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}');
          const timestamp = entry.timestamp;
          
          if (oldestEntry === null || timestamp < oldestEntry) {
            oldestEntry = timestamp;
          }
          if (newestEntry === null || timestamp > newestEntry) {
            newestEntry = timestamp;
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    
    return { entries, oldestEntry, newestEntry };
  } catch {
    return { entries: 0, oldestEntry: null, newestEntry: null };
  }
}
