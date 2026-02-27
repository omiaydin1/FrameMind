'use client';

import React, { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { DbConnection, Identity, Territory, UserProfile } from '@/spacetime_module_bindings';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { User, MapPin, Trophy, Target } from 'lucide-react';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  dbConnection: DbConnection;
  userIdentity: Identity;
  territories: Territory[];
}

export const UserProfilePanel: FC<UserProfilePanelProps> = ({
  isOpen,
  onClose,
  dbConnection,
  userIdentity,
  territories,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userTerritories, setUserTerritories] = useState<Territory[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Load user profile
    const profile = dbConnection.db.userProfile.userId().find(userIdentity);
    setUserProfile(profile ?? null);

    // Filter territories owned by this user
    const ownedTerritories = territories.filter(
      (t: Territory) => t.ownerIdentity.isEqual(userIdentity)
    );
    setUserTerritories(ownedTerritories);

    console.log('User Profile:', profile);
    console.log('Owned Territories:', ownedTerritories.length);
  }, [isOpen, dbConnection, userIdentity, territories]);

  const totalArea = userTerritories.reduce((sum: number, t: Territory) => {
    return sum + (Math.PI * t.radius * t.radius);
  }, 0);

  let badges: string[] = [];
  try {
    badges = userProfile?.achievementBadges 
      ? JSON.parse(userProfile.achievementBadges) 
      : [];
  } catch {
    badges = [];
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            User Profile
          </SheetTitle>
          <SheetDescription>
            Your territory minting statistics and achievements
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Identity Card */}
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Your Identity</div>
                  <div className="text-xs text-gray-600 font-mono break-all">
                    {userIdentity.toHexString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Territories</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {userTerritories.length}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-600">Total Area</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {(totalArea / 1_000_000).toFixed(1)}
                  <span className="text-sm text-gray-600 ml-1">km²</span>
                </div>
              </Card>
            </div>

            {/* Achievement Badges */}
            {badges.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-900">Achievement Badges</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge: string, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-300"
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Territories List */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Your Territories</h3>
              {userTerritories.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-8">
                  You haven't minted any territories yet. Click on the map to start!
                </p>
              ) : (
                <div className="space-y-2">
                  {userTerritories.map((territory: Territory) => (
                    <div
                      key={territory.territoryId.toString()}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: territory.color }}
                          />
                          <span className="font-medium text-sm">
                            Territory #{territory.territoryId.toString()}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {territory.radius.toFixed(0)}m
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Lat: {territory.latitude.toFixed(5)}, Lng: {territory.longitude.toFixed(5)}</div>
                        <div>
                          Area: {((Math.PI * territory.radius * territory.radius) / 1_000_000).toFixed(2)} km²
                        </div>
                        <div className="text-gray-500">
                          Minted: {new Date(Number(territory.mintTimestamp.toMicrosecondsSinceEpoch()) / 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
