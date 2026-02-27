'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Wallet, Heart, User } from 'lucide-react';
import { WalletManager } from './wallet-manager';
import { DonationButton } from './donation-button';
import { UsernameDisplay } from './username-display';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import type { Address } from 'viem';

interface AccountPanelProps {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  onWalletChange?: (address: Address | null) => void;
}

/**
 * Unified Account Panel Component
 * 
 * Combines:
 * - User profile display
 * - Wallet connection/management
 * - Donation functionality
 * 
 * Single location for all account-related features
 */
export function AccountPanel({ user, onWalletChange }: AccountPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('wallet');

  if (!user) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 border-2 border-white dark:border-gray-700">
            <AvatarImage src={user.pfpUrl} alt={user.displayName} />
            <AvatarFallback className="text-lg sm:text-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              {user.displayName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl text-black dark:text-white mb-1">
              {user.displayName}
            </CardTitle>
            <UsernameDisplay 
              username={user.username || 'user'}
              displayName={user.displayName}
              className="text-sm text-gray-600 dark:text-gray-400"
              showCopyButton={true}
              maxLength={25}
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              FID: {user.fid}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="wallet" className="text-sm sm:text-base">
              <Wallet className="h-4 w-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="donate" className="text-sm sm:text-base">
              <Heart className="h-4 w-4 mr-2" />
              Donate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-3">
            <WalletManager onWalletChange={onWalletChange} />
          </TabsContent>

          <TabsContent value="donate" className="space-y-3">
            <DonationButton />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
