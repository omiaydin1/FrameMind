'use client';

import React from 'react';
import type { FC } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Create custom walker icon
const walkerIcon = new L.DivIcon({
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>
  `,
  className: 'walker-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

interface WalkerMarkerProps {
  position: [number, number];
  currentTerritoryId: bigint;
}

export const WalkerMarker: FC<WalkerMarkerProps> = ({
  position,
  currentTerritoryId,
}) => {
  return (
    <Marker position={position} icon={walkerIcon}>
      <Popup>
        <div className="p-2">
          <div className="font-bold text-purple-600 mb-1">🚶 Autonomous Walker</div>
          <div className="text-sm space-y-1">
            <div>Position: {position[0].toFixed(5)}, {position[1].toFixed(5)}</div>
            {currentTerritoryId > BigInt(0) ? (
              <div className="text-blue-600 font-medium">
                Currently in Territory #{currentTerritoryId.toString()}
              </div>
            ) : (
              <div className="text-gray-500">Not in any territory</div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              This walker moves continuously across all territories in real-time.
              Everyone sees the same walker position!
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
