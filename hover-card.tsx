'use client';

import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from './ui/button';
import { Share2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Check } from 'lucide-react';

interface ShareButtonsProps {
  summary: string;
  username?: string;
}

export function ShareButtons({ summary, username }: ShareButtonsProps) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  
  // Farcaster miniapp link that opens in side panel
  const APP_LINK = 'https://farcaster.xyz/miniapps/38yJaWM8tC4s/framemind-insights';
  
  const generateShareText = (): string => {
    const maxLength = 280; // Farcaster character limit
    const linkText = `\n\n${APP_LINK}\n#FrameMind #FarcasterAnalytics #Web3`;
    const availableLength = maxLength - linkText.length - 50; // Reserve space for link and hashtags
    
    let text = `Just analyzed my Farcaster activity with FrameMind! 🚀\n\n${summary}`;
    
    if (text.length > availableLength) {
      text = text.slice(0, availableLength) + '...';
    }
    
    // Add link and hashtags
    text += linkText;
    
    return text;
  };

  const shareToFarcaster = async () => {
    try {
      setShareStatus(null);
      const text = generateShareText();
      
      // Use Farcaster SDK to open composer - this opens in Farcaster's side panel
      if (sdk && typeof sdk.actions !== 'undefined') {
        try {
          // SDK method to open composer within Farcaster app (side panel)
          await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_LINK)}`);
          setShareStatus('✓ Opened in Farcaster!');
        } catch (sdkError) {
          console.error('SDK error:', sdkError);
          // Fallback: use frame URL format
          const frameUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_LINK)}`;
          window.open(frameUrl, '_blank');
          setShareStatus('Opening composer...');
        }
      } else {
        // Direct Warpcast composer with embed
        const frameUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_LINK)}`;
        window.open(frameUrl, '_blank');
        setShareStatus('Opening in Farcaster...');
      }
    } catch (error) {
      console.error('Error sharing to Farcaster:', error);
      setShareStatus('Unable to open composer. Please try again.');
    }
  };

  const shareToTwitter = () => {
    try {
      setShareStatus(null);
      const text = generateShareText();
      
      // Open Twitter/X web intent
      const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      
      setShareStatus('✓ Opened Twitter!');
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
      setShareStatus('Unable to open Twitter. Please try again.');
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold mb-3 text-black dark:text-white">Share Your Insights</h4>
      
      {shareStatus && (
        <Alert className="mb-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-sm text-green-800 dark:text-green-200">
            {shareStatus}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={shareToFarcaster}
          variant="outline"
          className="flex-1 h-11 touch-manipulation bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 border-purple-200 dark:border-purple-800"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share on Farcaster
        </Button>
        <Button
          onClick={shareToTwitter}
          variant="outline"
          className="flex-1 h-11 touch-manipulation bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share on Twitter
        </Button>
      </div>
      
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
        Link opens in Farcaster app • Completely Free Analysis
      </p>
    </div>
  );
}
