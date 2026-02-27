'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import QRCode from 'react-qr-code';
import { QrCode, AlertCircle } from 'lucide-react';
import { UsernameDisplay } from './username-display';

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
}

interface AuthButtonProps {
  onAuthSuccess: (user: FarcasterUser) => void;
}

export function AuthButton({ onAuthSuccess }: AuthButtonProps) {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [isInFarcaster, setIsInFarcaster] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      setError('');

      // Wait a bit for SDK to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if we're in a Mini App
      const inMiniApp = sdk.isInMiniApp();
      setIsInFarcaster(inMiniApp);

      // Check if we're in a Mini App and have user context
      const context = await sdk.context;
      if (context?.user?.fid) {
        const userData: FarcasterUser = {
          fid: context.user.fid,
          username: context.user.username,
          displayName: context.user.displayName,
          pfpUrl: context.user.pfpUrl,
        };
        setUser(userData);
        onAuthSuccess(userData);
        return;
      }

      // Try Quick Auth session
      try {
        const res = await sdk.quickAuth.fetch('/api/auth/me');
        if (res.ok) {
          const userData: FarcasterUser = await res.json();
          setUser(userData);
          onAuthSuccess(userData);
        }
      } catch (quickAuthError) {
        // Not yet authenticated, user needs to click button
        console.log('No existing auth session');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth() {
    setLoading(true);
    setError('');
    
    try {
      // First check if we have context user
      const context = await sdk.context;
      if (context?.user?.fid) {
        const userData: FarcasterUser = {
          fid: context.user.fid,
          username: context.user.username,
          displayName: context.user.displayName,
          pfpUrl: context.user.pfpUrl,
        };
        setUser(userData);
        onAuthSuccess(userData);
        return;
      }

      // If not in Farcaster, show QR code
      if (isInFarcaster === false) {
        setShowQRCode(true);
        setLoading(false);
        return;
      }

      // Trigger Quick Auth flow - this will get a token and authenticate
      const { token } = await sdk.quickAuth.getToken();
      
      // Now fetch user data with the token
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const userData: FarcasterUser = await res.json();
        setUser(userData);
        onAuthSuccess(userData);
      } else {
        setError('Failed to authenticate. Please try again.');
      }
    } catch (error) {
      console.error('Auth failed:', error);
      
      // If not in Farcaster environment, show QR code option
      if (isInFarcaster === false) {
        setShowQRCode(true);
      } else {
        setError('Unable to sign in. Please make sure you\'re using a supported Farcaster client.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Button disabled className="w-full h-11 text-base touch-manipulation">
        Loading...
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
          <AvatarImage src={user.pfpUrl} alt={user.displayName} />
          <AvatarFallback className="text-base sm:text-lg">{user.displayName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base text-black dark:text-white truncate">{user.displayName}</p>
          <UsernameDisplay 
            username={user.username || 'user'}
            displayName={user.displayName}
            className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
            showCopyButton={false}
          />
        </div>
      </div>
    );
  }

  // Show QR Code if not in Farcaster environment
  if (showQRCode) {
    const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://framemind.app';
    
    return (
      <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-black dark:text-white">
            <QrCode className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Scan to Sign In
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Open this QR code with your Farcaster app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg mx-auto w-fit">
            <QRCode 
              value={appUrl}
              size={200}
              level="H"
              className="w-full h-auto max-w-[200px]"
            />
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Unable to sign in. Please make sure you're using a supported Farcaster client.
            </p>
          </div>
          
          <Button 
            onClick={() => setShowQRCode(false)} 
            variant="outline"
            className="w-full h-10 text-sm touch-manipulation"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Button 
        onClick={handleAuth} 
        className="w-full h-11 text-base touch-manipulation" 
        disabled={loading}
      >
        Sign in with Farcaster
      </Button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
