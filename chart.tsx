'use client';

import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Sparkles, RefreshCw, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { perplexityChat } from '../perplexity-api';

interface TweetGeneratorProps {
  username?: string;
  onTweetPosted?: () => void;
}

interface TweetStatus {
  status: 'idle' | 'generating' | 'ready' | 'posting' | 'success' | 'error';
  message?: string;
}

/**
 * AI Tweet Generator Component
 * 
 * Generates crypto/Base/blockchain-focused tweets using AI
 * Features:
 * - Generate new tweets with AI
 * - Refresh to get different tweet
 * - Post directly to Farcaster
 * - Real-time status feedback
 */
export function AITweetGenerator({ username, onTweetPosted }: TweetGeneratorProps) {
  const [tweetContent, setTweetContent] = useState<string>('');
  const [status, setStatus] = useState<TweetStatus>({ status: 'idle' });

  const generateTweet = async (): Promise<void> => {
    try {
      setStatus({ status: 'generating', message: 'Generating tweet...' });
      console.log('[TweetGen] Generating AI tweet...');

      const prompt = `Generate a single engaging tweet (280 characters max) about crypto, blockchain, or Base network.

Requirements:
- Focus on: Base L2, crypto trends, web3 development, DeFi, NFTs, or blockchain innovation
- Tone: Enthusiastic, builder-focused, community-oriented
- Include: One relevant emoji
- Style: Authentic, not marketing-heavy
- Topics: Technical insights, market trends, building in public, or community growth
- NO hashtags (they look spammy)
- Make it feel organic and conversational

Examples of good topics:
- Base's low gas fees enabling new use cases
- Building apps on L2s
- Crypto adoption milestones
- DeFi innovations
- Web3 community insights
- Onchain experiences

Return ONLY the tweet text, nothing else.`;

      const response = await perplexityChat({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a crypto-native builder and community member. Generate authentic, engaging tweets about blockchain, crypto, and web3. Keep it real and conversational.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9, // Higher for creativity
        max_tokens: 150,
      });

      const generatedTweet = response.choices[0]?.message?.content?.trim() || '';
      
      // Clean up the tweet (remove quotes if AI added them)
      const cleanTweet = generatedTweet
        .replace(/^["']|["']$/g, '')
        .trim()
        .substring(0, 280); // Ensure max length

      if (!cleanTweet) {
        throw new Error('Failed to generate tweet content');
      }

      setTweetContent(cleanTweet);
      setStatus({ status: 'ready', message: 'Tweet generated! Review and post.' });
      console.log('[TweetGen] ✓ Tweet generated:', cleanTweet);
      
    } catch (error) {
      console.error('[TweetGen] ❌ Generation error:', error);
      setStatus({ 
        status: 'error', 
        message: 'Failed to generate tweet. Please try again.' 
      });
      
      // Reset to idle after 5 seconds
      setTimeout(() => setStatus({ status: 'idle' }), 5000);
    }
  };

  const postTweet = async (): Promise<void> => {
    try {
      setStatus({ status: 'posting', message: 'Posting to Farcaster...' });
      console.log('[TweetGen] Posting tweet to Farcaster...');
      console.log('[TweetGen] Content:', tweetContent);
      console.log('[TweetGen] Content length:', tweetContent.length, 'characters');

      // Check if we're in a Farcaster mini app environment
      const inMiniApp = sdk.isInMiniApp();
      console.log('[TweetGen] In Mini App:', inMiniApp);

      if (!inMiniApp) {
        console.warn('[TweetGen] Not in Farcaster mini app - cannot post directly');
        throw new Error('Must be in Farcaster app to post. Please open this in Warpcast.');
      }

      // Use Farcaster SDK to compose cast
      console.log('[TweetGen] Opening compose dialog with Farcaster SDK...');
      
      try {
        // Use the Farcaster SDK to open the compose dialog with pre-filled text
        await sdk.actions.openUrl(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(tweetContent)}`
        );
        
        console.log('[TweetGen] ✓ Compose dialog opened successfully');
        setStatus({ 
          status: 'success', 
          message: 'Compose dialog opened! Complete your post in Farcaster. 🎉' 
        });

        // Call callback if provided
        onTweetPosted?.();

        // Reset after 5 seconds
        setTimeout(() => {
          setStatus({ status: 'idle' });
          setTweetContent('');
        }, 5000);
        
      } catch (sdkError) {
        console.error('[TweetGen] SDK error:', sdkError);
        throw new Error('Failed to open compose dialog. Please try posting manually.');
      }
      
    } catch (error: any) {
      console.error('[TweetGen] ❌ Posting error:', error);
      setStatus({ 
        status: 'error', 
        message: error.message || 'Failed to post tweet. Please try again.' 
      });
      
      // Reset to ready after 5 seconds (so they can retry)
      setTimeout(() => setStatus({ status: 'ready' }), 5000);
    }
  };

  const isGenerating = status.status === 'generating';
  const isPosting = status.status === 'posting';
  const isReady = status.status === 'ready';
  const isSuccess = status.status === 'success';
  const isError = status.status === 'error';

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-black dark:text-white">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          AI Tweet Generator
        </CardTitle>
        <CardDescription className="text-sm">
          Generate crypto & Base-focused tweets powered by AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generated Tweet Display */}
        {tweetContent && (
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
            <Textarea
              value={tweetContent}
              onChange={(e) => setTweetContent(e.target.value)}
              placeholder="Your generated tweet will appear here..."
              className="min-h-[100px] text-sm resize-none border-0 focus-visible:ring-0 bg-transparent"
              disabled={isPosting || isSuccess}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className={`text-xs font-medium ${
                tweetContent.length > 280 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {tweetContent.length}/280
              </span>
            </div>
          </div>
        )}

        {/* Status Alerts */}
        {isSuccess && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              <p className="font-semibold">{status.message}</p>
            </AlertDescription>
          </Alert>
        )}

        {isError && (
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-sm text-red-800 dark:text-red-200">
              <p className="font-semibold">{status.message}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isReady && !isSuccess && (
            <Button
              onClick={generateTweet}
              disabled={isGenerating || isPosting}
              className="flex-1 h-11 text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white touch-manipulation"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Tweet
                </>
              )}
            </Button>
          )}

          {isReady && (
            <>
              <Button
                onClick={generateTweet}
                variant="outline"
                disabled={isPosting}
                className="h-11 text-base border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900 touch-manipulation"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={postTweet}
                disabled={isPosting || tweetContent.length > 280}
                className="flex-1 h-11 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white touch-manipulation"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Post to Farcaster
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
          ✨ AI-generated crypto & Base content • Edit before posting
        </p>
      </CardContent>
    </Card>
  );
}
