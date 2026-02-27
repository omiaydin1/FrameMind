'use client';

import React, { useState } from 'react';
import type { FC } from 'react';
import type { DbConnection, Identity } from '@/spacetime_module_bindings';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { MapPin, Palette, DollarSign } from 'lucide-react';

interface MintModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: { lat: number; lng: number };
  dbConnection: DbConnection;
  userIdentity: Identity;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B400', '#6C5CE7', '#00B894', '#FD79A8',
];

export const MintModal: FC<MintModalProps> = ({
  isOpen,
  onClose,
  position,
  dbConnection,
  userIdentity,
  onSuccess,
}) => {
  const [radius, setRadius] = useState<number>(5000); // meters
  const [color, setColor] = useState<string>('#4ECDC4');
  const [price, setPrice] = useState<string>('1000000');
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleMint = async (): Promise<void> => {
    setIsMinting(true);
    setError('');

    try {
      console.log('🎨 Minting territory...', {
        lat: position.lat,
        lng: position.lng,
        radius,
        color,
        price,
      });

      // Call the mint_territory reducer
      dbConnection.reducers.mintTerritory(
        position.lat,
        position.lng,
        radius,
        color,
        BigInt(price)
      );

      console.log('✅ Territory minted successfully!');
      onSuccess();
    } catch (err: unknown) {
      console.error('❌ Failed to mint territory:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint territory';
      setError(errorMessage);
      setIsMinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mint New Territory
          </DialogTitle>
          <DialogDescription>
            Claim your piece of the world map. All territories are visible to everyone in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Position Display */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Selected Position</span>
            </div>
            <div className="text-sm text-blue-700">
              <div>Latitude: {position.lat.toFixed(6)}</div>
              <div>Longitude: {position.lng.toFixed(6)}</div>
            </div>
          </div>

          {/* Radius Slider */}
          <div className="space-y-2">
            <Label htmlFor="radius" className="flex items-center justify-between">
              <span>Territory Radius</span>
              <span className="text-sm font-mono text-blue-600">{radius.toLocaleString()}m</span>
            </Label>
            <Slider
              id="radius"
              min={1000}
              max={50000}
              step={1000}
              value={[radius]}
              onValueChange={(value: number[]) => setRadius(value[0])}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Larger territories cost more but claim more space
            </p>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Territory Color
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-full aspect-square rounded-lg transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-blue-600 ring-offset-2 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="color"
                value={color}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={color}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#4ECDC4"
              />
            </div>
          </div>

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Minting Price (wei)
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
              className="font-mono"
              placeholder="1000000"
            />
            <p className="text-xs text-gray-500">
              Price is recorded on-chain for transparency
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isMinting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMint}
            disabled={isMinting}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isMinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Minting...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Mint Territory
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
