'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Heart, Loader2, CheckCircle, AlertCircle, Wallet, ExternalLink, LogOut, X } from 'lucide-react';
import type { Address } from 'viem';
import {
  isWalletAvailable,
  getConnectedAddress,
  sendTransaction,
  waitForTransaction,
  getBlockExplorerUrl,
  type TransactionResult,
} from '../lib/wallet-client';

interface DonationButtonEnhancedProps {
  recipientAddress?: Address;
}

interface DonationStatus {
  status: 'idle' | 'connecting' | 'processing' | 'confirming' | 'success' | 'error';
  message?: string;
  transactionHash?: string;
}

interface WalletState {
  connected: boolean;
  address: Address | null;
  loading: boolean;
}

const DONATION_AMOUNT = '0.0001'; // ETH
const RECIPIENT_ADDRESS = '0x71AAD1110dFd8F60249cD45ce4fb05163b6f812B' as Address;

/**
 * Enhanced Donation Component with Integrated Wallet Management
 * 
 * Features:
 * - Wallet connection status display
 * - Disconnect functionality with icon
 * - Donation processing with real-time feedback
 * - All wallet management in one place
 */
export function DonationButtonEnhanced({ recipientAddress }: DonationButtonEnhancedProps) {
  const [donationStatus, setDonationStatus] = useState<DonationStatus>({ status: 'idle' });
  const [totalDonations, setTotalDonations] = useState<number>(0);
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    loading: true,
  });

  // Check wallet connection on mount and listen for changes
  useEffect(() => {
    checkWalletConnection();

    // Listen for wallet events
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
      setWalletState(prev => ({ ...prev, loading: true }));

      if (!isWalletAvailable()) {
        setWalletState({
          connected: false,
          address: null,
          loading: false,
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
        });
      } else {
        setWalletState({
          connected: false,
          address: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('[Wallet] Error checking connection:', error);
      setWalletState({
        connected: false,
        address: null,
        loading: false,
      });
    }
  }

  async function handleConnect(): Promise<void> {
    try {
      setWalletState(prev => ({ ...prev, loading: true }));

      if (!isWalletAvailable()) {
        setDonationStatus({
          status: 'error',
          message: 'No wallet found. Please install MetaMask or Coinbase Wallet.',
        });
        setWalletState(prev => ({ ...prev, loading: false }));
        return;
      }

      const address = await getConnectedAddress();
      
      if (address) {
        console.log('[Wallet] Connected successfully:', address);
        setWalletState({
          connected: true,
          address,
          loading: false,
        });
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
      
      setDonationStatus({
        status: 'error',
        message: errorMessage,
      });
      
      setWalletState({
        connected: false,
        address: null,
        loading: false,
      });
      
      // Clear error after 5 seconds
      setTimeout(() => setDonationStatus({ status: 'idle' }), 5000);
    }
  }

  function handleDisconnect(): void {
    console.log('[Wallet] Disconnecting wallet');
    setWalletState({
      connected: false,
      address: null,
      loading: false,
    });
    setDonationStatus({ status: 'idle' });
  }

  const handleDonate = async () => {
    try {
      console.log('\n💝 === Donation Flow Started ===');
      console.log('Timestamp:', new Date().toISOString());
      
      setDonationStatus({ status: 'connecting', message: 'Preparing transaction...' });

      // Check if wallet is connected
      if (!walletState.connected || !walletState.address) {
        setDonationStatus({
          status: 'error',
          message: 'Please connect your wallet first.',
        });
        return;
      }
      
      console.log('[Donation] Wallet connected:', walletState.address);

      // Determine recipient
      const recipient = recipientAddress || RECIPIENT_ADDRESS;
      console.log('[Donation] Recipient:', recipient);
      console.log('[Donation] Amount:', DONATION_AMOUNT, 'ETH');

      setDonationStatus({ status: 'processing', message: 'Please confirm transaction in your wallet...' });

      // Send transaction using viem wallet client
      const txResult: TransactionResult = await sendTransaction({
        to: recipient,
        value: DONATION_AMOUNT,
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Transaction failed');
      }

      if (!txResult.hash) {
        throw new Error('No transaction hash received');
      }

      console.log('[Donation] ✓ Transaction sent:', txResult.hash);
      
      setDonationStatus({
        status: 'confirming',
        message: 'Transaction sent! Waiting for confirmation...',
        transactionHash: txResult.hash,
      });

      // Wait for confirmation
      console.log('[Donation] Waiting for confirmation...');
      const receipt = await waitForTransaction(txResult.hash);

      if (receipt && receipt.status === 'success') {
        console.log('[Donation] ✓ Transaction confirmed!');
        console.log('[Donation] Block:', receipt.blockNumber.toString());
        
        setTotalDonations(prev => prev + 1);
        setDonationStatus({
          status: 'success',
          message: `Thank you for your ${DONATION_AMOUNT} ETH donation! 🙏`,
          transactionHash: txResult.hash,
        });

        // Reset to idle after 15 seconds
        setTimeout(() => {
          setDonationStatus({ status: 'idle' });
        }, 15000);
        
        console.log('💝 === Donation Complete ===\n');
      } else {
        // Transaction sent but not confirmed yet
        console.log('[Donation] Transaction submitted, confirmation pending');
        
        setTotalDonations(prev => prev + 1);
        setDonationStatus({
          status: 'success',
          message: `Donation submitted! Transaction may take a few moments to confirm.`,
          transactionHash: txResult.hash,
        });

        setTimeout(() => {
          setDonationStatus({ status: 'idle' });
        }, 15000);
        
        console.log('💝 === Donation Submitted ===\n');
      }
      
    } catch (error: any) {
      console.error('[Donation] ❌ Error:', error);
      console.log('💝 === Donation Failed ===\n');
      
      let errorMessage = 'Transaction failed. Please try again.';
      
      if (error.message) {
        if (error.message.includes('User rejected') || error.message.includes('User denied') || error.message.includes('cancelled by user')) {
          errorMessage = 'Transaction cancelled. No worries! 👍';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH balance on Base network.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setDonationStatus({
        status: 'error',
        message: errorMessage,
      });
      
      // Reset to idle after 8 seconds for errors
      setTimeout(() => {
        setDonationStatus({ status: 'idle' });
      }, 8000);
    }
  };

  const getBasescanUrl = (hash: string): string => {
    return getBlockExplorerUrl(hash as Address);
  };

  const formatAddress = (address: Address): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isProcessing = donationStatus.status === 'connecting' || 
                      donationStatus.status === 'processing' || 
                      donationStatus.status === 'confirming';

  if (walletState.loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Wallet className="h-4 w-4 animate-pulse" />
            <span>Checking wallet connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-black dark:text-white">
          <Heart className="h-5 w-5 text-pink-500" />
          Support the Team
        </CardTitle>
        <CardDescription className="text-sm">
          Donate using your Farcaster-connected wallet • Sent directly on Base network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Connection Status */}
        {walletState.connected && walletState.address ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Wallet Connected
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex-shrink-0 p-1.5 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors touch-manipulation"
                aria-label="Disconnect wallet"
                title="Disconnect wallet"
              >
                <X className="h-4 w-4 text-green-700 dark:text-green-300" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-green-700 dark:text-green-300 truncate">
                {formatAddress(walletState.address)}
              </span>
              <a
                href={getBlockExplorerUrl(walletState.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors touch-manipulation"
                aria-label="View on Basescan"
              >
                <ExternalLink className="h-3 w-3 text-green-600 dark:text-green-400" />
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3 mb-3">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Connect Your Wallet
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Connect your Farcaster wallet to donate and support the team
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              disabled={walletState.loading}
              className="w-full h-10 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white touch-manipulation"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
            <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-2">
              MetaMask, Coinbase Wallet, and WalletConnect supported
            </p>
          </div>
        )}

        {/* Donation Amount Info */}
        <div className="bg-white/50 dark:bg-gray-900/50 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Donation Amount
            </span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {DONATION_AMOUNT} ETH
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Fixed amount per donation • Sent to team wallet on Base network
          </p>
        </div>

        {/* Success Alert */}
        {donationStatus.status === 'success' && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              <div className="space-y-2">
                <p className="font-semibold">{donationStatus.message}</p>
                {donationStatus.transactionHash && (
                  <a
                    href={getBasescanUrl(donationStatus.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline block flex items-center gap-1 hover:text-green-900 dark:hover:text-green-100 transition-colors"
                  >
                    <span>View transaction on Basescan</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {donationStatus.status === 'error' && (
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-sm text-red-800 dark:text-red-200">
              <p className="font-semibold">{donationStatus.message}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Processing/Confirming Alert */}
        {(donationStatus.status === 'confirming' && donationStatus.transactionHash) && (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              <div className="space-y-2">
                <p className="font-semibold">{donationStatus.message}</p>
                <a
                  href={getBasescanUrl(donationStatus.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline block flex items-center gap-1 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                >
                  <span>View transaction on Basescan</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Donate Button */}
        <Button
          onClick={walletState.connected ? handleDonate : handleConnect}
          disabled={isProcessing}
          className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {donationStatus.message || 'Processing...'}
            </>
          ) : walletState.connected ? (
            <>
              <Heart className="h-5 w-5 mr-2" />
              Donate {DONATION_AMOUNT} ETH
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet to Donate
            </>
          )}
        </Button>

        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
          💝 Directly to team wallet on Base • Fully secure & transparent onchain
        </p>

        {/* Donation Counter */}
        {totalDonations > 0 && (
          <div className="text-center pt-2">
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              You've donated {totalDonations} time{totalDonations > 1 ? 's' : ''}! 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
