'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import type { FarcasterCast } from '../lib/farcaster-api-verified';
import { 
  fetchUserCasts, 
  getTopCasts, 
  calculateTotalEngagement, 
  getAverageEngagement,
  analyzeEngagementTrends,
  getMostLikedCast,
  getMostCommentedCast,
  checkFarcasterConnection,
} from '../lib/farcaster-api-verified';
import { analyzeCasts } from '../lib/ai-analysis';
import type { AIInsights } from '../lib/ai-analysis';
import { TrendingUp, TrendingDown, MessageSquare, Users, Sparkles, Heart, Repeat2, MessageCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { ShareButtons } from './share-buttons';
import { AccountPanelSimplified } from './account-panel-simplified';
import { AITweetGenerator } from './ai-tweet-generator';

interface DashboardProps {
  fid: number;
  username?: string;
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

interface DataTimestamp {
  lastUpdated: number;
  source: string;
  verified: boolean;
}

export function Dashboard({ fid, username, user }: DashboardProps) {
  const [casts, setCasts] = useState<FarcasterCast[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<DataTimestamp | null>(null);

  useEffect(() => {
    loadData();
  }, [fid]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      console.log('\n' + '='.repeat(80));
      console.log('🚀 DASHBOARD DATA LOAD STARTED');
      console.log('='.repeat(80));
      console.log('FID:', fid);
      console.log('Username:', username || 'N/A');
      console.log('Timestamp:', new Date().toISOString());
      console.log('='.repeat(80));
      
      // Check connection status first
      console.log('\n📡 Step 1: Checking Farcaster connection health...');
      const connectionStatus = await checkFarcasterConnection();
      
      if (connectionStatus.connected) {
        console.log('✅ Connection healthy:', {
          source: connectionStatus.source,
          latency: `${connectionStatus.latency}ms`,
        });
      } else {
        console.warn('⚠️ Connection check failed:', connectionStatus.error);
        console.warn('⚠️ Will attempt data fetch anyway with fallback strategy');
      }
      
      // Fetch verified cast data with engagement metrics
      console.log('\n📊 Step 2: Fetching verified user casts...');
      const userCasts = await fetchUserCasts(fid);
      
      if (userCasts.length === 0) {
        console.warn('⚠️ No casts found for this user');
      } else {
        console.log(`✅ Loaded ${userCasts.length} verified casts`);
        
        // Log summary statistics for verification
        const totalEngagement = calculateTotalEngagement(userCasts);
        const avgEngagement = getAverageEngagement(userCasts);
        
        console.log('\n📊 Data Verification Summary:');
        console.log('- Total Casts:', userCasts.length);
        console.log('- Total Engagement:', totalEngagement);
        console.log('- Avg Engagement/Cast:', avgEngagement);
        console.log('- Date Range:', {
          oldest: new Date(Math.min(...userCasts.map(c => c.timestamp))).toISOString(),
          newest: new Date(Math.max(...userCasts.map(c => c.timestamp))).toISOString(),
        });
      }
      
      setCasts(userCasts);
      
      // Set timestamp for data freshness tracking
      setTimestamp({
        lastUpdated: Date.now(),
        source: connectionStatus.source || 'verified',
        verified: true,
      });
      
      // Generate AI insights based on verified data
      console.log('\n🤖 Step 3: Generating AI insights from verified data...');
      const aiInsights = await analyzeCasts(fid, userCasts);
      setInsights(aiInsights);
      
      console.log('✅ AI insights generated successfully');
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ DASHBOARD DATA LOAD COMPLETE');
      console.log('='.repeat(80) + '\n');
      
    } catch (err) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ DASHBOARD DATA LOAD FAILED');
      console.error('='.repeat(80));
      console.error('Error:', err);
      console.error('Stack:', err instanceof Error ? err.stack : 'N/A');
      console.error('='.repeat(80) + '\n');
      
      // Provide user-friendly error messages
      let errorMessage = 'Could not reach Farcaster. Check your connection. Try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Connection timeout. Please check your internet and try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.message.includes('404')) {
          errorMessage = 'User not found on Farcaster. Please verify your account.';
        } else if (err.message.includes('rate limit')) {
          errorMessage = 'Rate limit reached. Please wait a moment and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function openCastInFarcaster(cast: FarcasterCast) {
    try {
      console.log('\n📱 Opening Cast in Farcaster');
      console.log('Cast Details:', {
        hash: cast.hash,
        url: cast.url,
        author: cast.author.username,
        text: cast.text.substring(0, 50) + '...',
      });
      
      if (!cast.url) {
        console.error('❌ Cast URL is missing - cannot open');
        return;
      }
      
      // Check if we're in a Farcaster mini app
      const inMiniApp = sdk.isInMiniApp();
      console.log('Environment: Mini App =', inMiniApp);
      
      if (inMiniApp) {
        // Strategy 1: Use Farcaster SDK to open within app
        console.log('📲 Strategy 1: Opening with Farcaster SDK...');
        try {
          sdk.actions.openUrl(cast.url);
          console.log('✅ Successfully opened cast in Farcaster app via SDK');
          return;
        } catch (sdkError) {
          console.warn('⚠️ SDK openUrl failed:', sdkError);
          console.log('Falling back to direct window.open');
        }
      }
      
      // Strategy 2: Try farcaster:// deep link protocol
      console.log('🔗 Strategy 2: Attempting farcaster:// deep link...');
      const farcasterDeepLink = `farcaster://cast/${cast.hash}`;
      
      try {
        // Create temporary link element for deep link
        const link = document.createElement('a');
        link.href = farcasterDeepLink;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Deep link attempted:', farcasterDeepLink);
      } catch (deepLinkError) {
        console.warn('⚠️ Deep link failed:', deepLinkError);
      }
      
      // Strategy 3: Fallback to Warpcast web URL
      console.log('🌐 Strategy 3: Opening Warpcast web URL as fallback...');
      setTimeout(() => {
        window.open(cast.url, '_blank', 'noopener,noreferrer');
        console.log('✅ Opened cast in web browser:', cast.url);
      }, 300);
      
    } catch (error) {
      console.error('❌ Error in openCastInFarcaster:', error);
      
      // Final emergency fallback: direct URL open
      if (cast.url) {
        console.log('🚨 Using emergency fallback: direct window.open');
        try {
          window.open(cast.url, '_blank', 'noopener,noreferrer');
          console.log('✅ Emergency fallback successful');
        } catch (fallbackError) {
          console.error('❌ All strategies failed:', fallbackError);
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-sm text-red-800 dark:text-red-200">
          <div className="space-y-3">
            <div>
              <p className="font-semibold mb-1">Unable to Load Dashboard</p>
              <p>{error}</p>
            </div>
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="sm" 
              className="w-full touch-manipulation"
            >
              Try Again
            </Button>
            <p className="text-xs text-red-700 dark:text-red-300">
              If this problem persists, please contact support or try again in a few minutes.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const topCasts = getTopCasts(casts, 5);
  const totalEngagement = calculateTotalEngagement(casts);
  const avgEngagement = getAverageEngagement(casts);
  const trends = analyzeEngagementTrends(casts);
  const mostLiked = getMostLikedCast(casts);
  const mostCommented = getMostCommentedCast(casts);

  const formatTimestamp = (ts: number): string => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Unified Account Panel - Top of Dashboard */}
      {user && (
        <AccountPanelSimplified user={user} />
      )}

      {/* AI Tweet Generator */}
      <AITweetGenerator username={username} onTweetPosted={loadData} />
      {/* Data Freshness Indicator */}
      {timestamp && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Live Data • Updated {formatTimestamp(timestamp.lastUpdated)}
            </span>
          </div>
          <Button
            onClick={loadData}
            variant="ghost"
            size="sm"
            className="text-xs h-7 touch-manipulation"
          >
            Refresh
          </Button>
        </div>
      )}
      {/* Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover:shadow-lg transition-shadow touch-manipulation">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Total Casts</CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{casts.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow touch-manipulation">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Total Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{totalEngagement}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Likes, recasts, replies</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow touch-manipulation sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black dark:text-white">Avg per Cast</CardTitle>
            <Users className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{avgEngagement}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Engagement rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Trends */}
      {trends.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-black dark:text-white">Engagement Trends</CardTitle>
            <CardDescription className="text-sm">Comparing recent vs. older casts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {trends.map((trend) => (
                <div key={trend.metric} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-black dark:text-white capitalize">
                      {trend.metric}
                    </span>
                    {trend.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : trend.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-1 w-4 bg-gray-400 rounded" />
                    )}
                  </div>
                  <div className={`text-lg sm:text-xl font-bold ${
                    trend.trend === 'up' ? 'text-green-600 dark:text-green-400' : 
                    trend.trend === 'down' ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {trend.change > 0 ? '+' : ''}{trend.change}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlight Casts */}
      {(mostLiked || mostCommented) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {mostLiked && (
            <Card 
              className="shadow-lg cursor-pointer hover:shadow-xl transition-all touch-manipulation"
              onClick={() => openCastInFarcaster(mostLiked)}
            >
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-black dark:text-white">
                  <Heart className="h-4 w-4 text-red-500" />
                  Most Liked Cast
                  <ExternalLink className="h-3 w-3 ml-auto text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{mostLiked.text}</p>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    {mostLiked.reactions.likes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Repeat2 className="h-4 w-4" />
                    {mostLiked.reactions.recasts}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {mostLiked.reactions.replies}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {mostCommented && (
            <Card 
              className="shadow-lg cursor-pointer hover:shadow-xl transition-all touch-manipulation"
              onClick={() => openCastInFarcaster(mostCommented)}
            >
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-black dark:text-white">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  Highest Comment Activity
                  <ExternalLink className="h-3 w-3 ml-auto text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{mostCommented.text}</p>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    {mostCommented.reactions.likes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Repeat2 className="h-4 w-4" />
                    {mostCommented.reactions.recasts}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {mostCommented.reactions.replies}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AI Insights Summary - Mobile Optimized */}
      {insights && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-black dark:text-white">AI Insights</CardTitle>
            <CardDescription className="text-sm">Powered by advanced analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base text-black dark:text-white">Summary</h3>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{insights.summary}</p>
            </div>

            {insights.trending.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm sm:text-base text-black dark:text-white">Trending Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {insights.trending.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs sm:text-sm touch-manipulation">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3 text-sm sm:text-base text-black dark:text-white">Growth Suggestions</h3>
              <ul className="space-y-3">
                {insights.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Share Buttons */}
            <ShareButtons summary={insights.summary} username={username} />
          </CardContent>
        </Card>
      )}

      {/* Top Performing Casts - Mobile Optimized */}
      {topCasts.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-black dark:text-white">Top Performing Casts</CardTitle>
            <CardDescription className="text-sm">Your most engaging content - click to view in Farcaster</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {topCasts.map((cast, i) => (
              <div 
                key={cast.hash} 
                className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors touch-manipulation cursor-pointer"
                onClick={() => openCastInFarcaster(cast)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3 flex-1">{cast.text}</p>
                  <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    <span>{cast.reactions.likes}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Repeat2 className="h-4 w-4" />
                    <span>{cast.reactions.recasts}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    <span>{cast.reactions.replies}</span>
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
