'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Wallet, LogOut, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import type { Address } from 'viem';
import {
  isWalletAvailable,
  getConnectedAddress,
  getBlockExplorerUrl,
} from '../lib/wallet-client';

interface WalletManagerProps {
  onWalletChange?: (address: Address | null) => void;
}

interface WalletState {
  connected: boolean;
  address: Address | null;
  loading: boolean;
  error: string | null;
}

/**
 * Wallet Manager Component
 * 
 * Provides:
 * - Wallet connection status display
 * - Connect/disconnect functionality
 * - Address display with block explorer link
 * - Clear UI feedback for all states
 */
export function WalletManager({ onWalletChange }: WalletManagerProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    checkWalletConnection();

    // Listen for wallet account changes
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleAccountsChanged = (accounts: string[]): void => {
    console.log('[Wallet] Accounts changed:', accounts);
    if (accounts.length === 0) {
      handleDisconnect();
    } else {
      checkWalletConnection();
    }
  };

  const handleChainChanged = (): void => {
    console.log('[Wallet] Chain changed, rechecking connection');
    checkWalletConnection();
  };

  async function checkWalletConnection(): Promise<void> {
    try {
      setWalletState(prev => ({ ...prev, loading: true, error: null }));

      if (!isWalletAvailable()) {
        setWalletState({
          connected: false,
          address: null,
          loading: false,
          error: null,
        });
        return;
      }

      const address = await getConnectedAddress();
      
      if (address) {
        console.log('[Wallet] Connected:', address);
        setWalletState({
          connected: true,
          address,
          loading: false,
          error: null,
        });
        onWalletChange?.(address);
      } else {
        setWalletState({
          connected: false,
          address: null,
          loading: false,
          error: null,
        });
        onWalletChange?.(null);
      }
    } catch (error) {
      console.error('[Wallet] Error checking connection:', error);
      setWalletState({
        connected: false,
        address: null,
        loading: false,
        error: 'Failed to check wallet connection',
      });
    }
  }

  async function handleConnect(): Promise<void> {
    try {
      setWalletState(prev => ({ ...prev, loading: true, error: null }));

      if (!isWalletAvailable()) {
        setWalletState(prev => ({
          ...prev,
          loading: false,
          error: 'No wallet found. Please install MetaMask or Coinbase Wallet.',
        }));
        return;
      }

      const address = await getConnectedAddress();
      
      if (address) {
        console.log('[Wallet] Connected successfully:', address);
        setWalletState({
          connected: true,
          address,
          loading: false,
          error: null,
        });
        onWalletChange?.(address);
      } else {
        throw new Error('Failed to connect wallet');
      }
    } catch (error: any) {
      console.error('[Wallet] Connection error:', error);
      let errorMessage = 'Failed to connect wallet';
      
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Connection cancelled';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setWalletState({
        connected: false,
        address: null,
        loading: false,
        error: errorMessage,
      });
    }
  }

  function handleDisconnect(): void {
    console.log('[Wallet] Disconnecting wallet');
    setWalletState({
      connected: false,
      address: null,
      loading: false,
      error: null,
    });
    onWalletChange?.(null);
  }

  const formatAddress = (address: Address): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (walletState.loading) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Wallet className="h-4 w-4 animate-pulse" />
            <span>Checking wallet...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletState.connected) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-black dark:text-white">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Wallet Connection
          </CardTitle>
          <CardDescription className="text-sm">
            Connect your wallet for donations and premium features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {walletState.error && (
            <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-sm text-red-800 dark:text-red-200">
                {walletState.error}
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={handleConnect}
            disabled={walletState.loading}
            className="w-full h-11 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white touch-manipulation"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </Button>

          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
            MetaMask, Coinbase Wallet, and WalletConnect supported
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-black dark:text-white">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          Wallet Connected
        </CardTitle>
        <CardDescription className="text-sm">
          Your Farcaster-connected wallet for onchain features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-white/50 dark:bg-gray-900/50 p-3 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Wallet className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate">
                {formatAddress(walletState.address!)}
              </span>
            </div>
            <a
              href={getBlockExplorerUrl(walletState.address!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1.5 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors touch-manipulation"
              aria-label="View on Basescan"
            >
              <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
            </a>
          </div>
        </div>

        <Button
          onClick={handleDisconnect}
          variant="outline"
          className="w-full h-10 text-sm border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900 touch-manipulation"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Wallet
        </Button>

        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
          Connected to Base network • Ready for donations
        </p>
      </CardContent>
    </Card>
  );
}
