'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UsernameDisplay } from './username-display';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { DonationButtonEnhanced } from './donation-button-enhanced';

interface AccountPanelSimplifiedProps {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

/**
 * Simplified Account Panel Component
 * 
 * Features:
 * - User profile display (avatar, name, username, FID)
 * - Integrated donation with wallet management
 * - All account features in one place
 * - Clean, single-column layout
 */
export function AccountPanelSimplified({ user }: AccountPanelSimplifiedProps) {
  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Profile Card */}
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
      </Card>

      {/* Donation with Integrated Wallet Management */}
      <DonationButtonEnhanced />
    </div>
  );
}
