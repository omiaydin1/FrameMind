'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { FC } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { DbConnection, type Territory, type Walker, Identity } from '@/spacetime_module_bindings';
import { MintModal } from './mint-modal';
import { UserProfilePanel } from './user-profile-panel';
import { WalkerMarker } from './walker-marker';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Wallet, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {}

const MapView: FC<MapViewProps> = () => {
  const [dbConnection, setDbConnection] = useState<DbConnection | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [walker, setWalker] = useState<Walker | null>(null);
  const [userIdentity, setUserIdentity] = useState<Identity | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [mintModalOpen, setMintModalOpen] = useState<boolean>(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState<boolean>(false);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // Connect to SpacetimeDB
  useEffect(() => {
    console.log('🚀 Connecting to SpacetimeDB...');
    
    const connect = async (): Promise<void> => {
      try {
        const conn = await DbConnection.builder()
          .withModuleName('territory_minting')
          .withUri('ws://127.0.0.1:3000')
          .onConnect((conn, identity, token) => {
            console.log('✅ Connected to SpacetimeDB');
            console.log('Identity:', identity.toHexString());
            setUserIdentity(identity);
            setIsConnecting(false);
          })
          .onConnectError((err) => {
            console.error('❌ SpacetimeDB connection error:', err);
            setIsConnecting(false);
          })
          .build();

        setDbConnection(conn);

        // Subscribe to all territories
        conn.subscriptionBuilder()
          .onApplied(() => {
            console.log('📊 Subscription applied');
            // Load initial data
            const allTerritories = Array.from(conn.db.territory.iter());
            setTerritories(allTerritories);
            console.log(`Loaded ${allTerritories.length} territories`);

            // Load walker
            const walkerData = conn.db.walker.walkerId().find(BigInt(1));
            if (walkerData) {
              setWalker(walkerData);
              console.log('Walker loaded:', walkerData);
            }
          })
          .subscribe([
            'SELECT * FROM territory',
            'SELECT * FROM walker',
            'SELECT * FROM user_profile',
          ]);

        // Listen for territory changes
        conn.db.territory.onInsert((ctx, territory) => {
          console.log('New territory minted:', territory);
          setTerritories(prev => [...prev, territory]);
        });

        conn.db.territory.onUpdate((ctx, oldTerritory, newTerritory) => {
          console.log('Territory updated:', newTerritory);
          setTerritories(prev =>
            prev.map(t => t.territoryId === newTerritory.territoryId ? newTerritory : t)
          );
        });

        // Listen for walker updates
        conn.db.walker.onUpdate((ctx, oldWalker, newWalker) => {
          setWalker(newWalker);
        });

      } catch (error: unknown) {
        console.error('❌ Failed to connect to SpacetimeDB:', error);
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      if (dbConnection) {
        dbConnection.disconnect();
      }
    };
  }, []);

  const handleMapClick = useCallback((e: { latlng: { lat: number; lng: number } }): void => {
    setSelectedPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    setMintModalOpen(true);
  }, []);

  const handleMintSuccess = useCallback((): void => {
    setMintModalOpen(false);
    setSelectedPosition(null);
  }, []);

  // Map click handler component
  const MapClickHandler: FC = () => {
    const map = useMap();
    
    useEffect(() => {
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }, [map]);

    return null;
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Card className="p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Connecting to Territory Network
          </h2>
          <p className="text-gray-600">Initializing real-time database...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start gap-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Territory Minting
              </h1>
              <p className="text-sm text-gray-600">Click map to mint territories</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button
            onClick={() => setProfilePanelOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Users className="w-4 h-4 mr-2" />
            My Profile
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="absolute top-24 left-4 z-[1000] flex flex-col gap-2">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg p-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              <MapPin className="w-3 h-3 mr-1" />
              {territories.length} Territories
            </Badge>
          </div>
        </Card>
        
        {walker && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg p-3">
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">Walker Position:</div>
              <div>Lat: {walker.currentLatitude.toFixed(5)}</div>
              <div>Lng: {walker.currentLongitude.toFixed(5)}</div>
              {walker.currentTerritoryId > BigInt(0) && (
                <div className="mt-1 text-blue-600 font-medium">
                  In Territory #{walker.currentTerritoryId.toString()}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapClickHandler />

        {/* Render all territories */}
        {territories.map((territory) => (
          <React.Fragment key={territory.territoryId.toString()}>
            <Circle
              center={[territory.latitude, territory.longitude]}
              radius={territory.radius}
              pathOptions={{
                fillColor: territory.color,
                fillOpacity: 0.4,
                color: territory.color,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-bold mb-1">Territory #{territory.territoryId.toString()}</div>
                  <div className="text-sm">
                    <div>Owner: {territory.owner}</div>
                    <div>Radius: {territory.radius.toFixed(0)}m</div>
                    <div>Lat/Lng: {territory.latitude.toFixed(4)}, {territory.longitude.toFixed(4)}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      Minted: {new Date(Number(territory.mintTimestamp.toMicrosecondsSinceEpoch()) / 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Popup>
            </Circle>
          </React.Fragment>
        ))}

        {/* Render walker */}
        {walker && (
          <WalkerMarker
            position={[walker.currentLatitude, walker.currentLongitude]}
            currentTerritoryId={walker.currentTerritoryId}
          />
        )}
      </MapContainer>

      {/* Mint Modal */}
      {mintModalOpen && selectedPosition && dbConnection && userIdentity && (
        <MintModal
          isOpen={mintModalOpen}
          onClose={() => setMintModalOpen(false)}
          position={selectedPosition}
          dbConnection={dbConnection}
          userIdentity={userIdentity}
          onSuccess={handleMintSuccess}
        />
      )}

      {/* User Profile Panel */}
      {dbConnection && userIdentity && (
        <UserProfilePanel
          isOpen={profilePanelOpen}
          onClose={() => setProfilePanelOpen(false)}
          dbConnection={dbConnection}
          userIdentity={userIdentity}
          territories={territories}
        />
      )}
    </div>
  );
};

export default MapView;
