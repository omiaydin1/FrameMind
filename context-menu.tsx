'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Heart, Loader2, CheckCircle, AlertCircle, Wallet, ExternalLink } from 'lucide-react';
import type { Address } from 'viem';
import {
  isWalletAvailable,
  getConnectedAddress,
  sendTransaction,
  waitForTransaction,
  getBlockExplorerUrl,
  type TransactionResult,
} from '../lib/wallet-client';

interface DonationButtonProps {
  recipientAddress?: Address;
}

interface DonationStatus {
  status: 'idle' | 'connecting' | 'processing' | 'confirming' | 'success' | 'error';
  message?: string;
  transactionHash?: string;
}

const DONATION_AMOUNT = '0.0001'; // ETH
const RECIPIENT_ADDRESS = '0x71AAD1110dFd8F60249cD45ce4fb05163b6f812B' as Address;

export function DonationButton({ recipientAddress }: DonationButtonProps) {
  const [donationStatus, setDonationStatus] = useState<DonationStatus>({ status: 'idle' });
  const [totalDonations, setTotalDonations] = useState<number>(0);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [connectedAddress, setConnectedAddress] = useState<Address | null>(null);

  // Check wallet connection on mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  async function checkWalletConnection() {
    if (isWalletAvailable()) {
      const address = await getConnectedAddress();
      if (address) {
        setWalletConnected(true);
        setConnectedAddress(address);
        console.log('[Donation] Wallet connected:', address);
      }
    }
  }

  const handleDonate = async () => {
    try {
      console.log('\n💝 === Donation Flow Started ===');
      console.log('Timestamp:', new Date().toISOString());
      
      setDonationStatus({ status: 'connecting', message: 'Connecting to wallet...' });

      // Check if wallet is available
      if (!isWalletAvailable()) {
        setDonationStatus({
          status: 'error',
          message: 'No wallet found. Please install MetaMask or Coinbase Wallet.',
        });
        return;
      }

      // Get connected address
      const fromAddress = await getConnectedAddress();
      if (!fromAddress) {
        setDonationStatus({
          status: 'error',
          message: 'Please connect your wallet to donate.',
        });
        return;
      }

      setConnectedAddress(fromAddress);
      setWalletConnected(true);
      
      console.log('[Donation] Wallet connected:', fromAddress);

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
        // Transaction sent but not confirmed yet - still show success with pending status
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

  const isProcessing = donationStatus.status === 'connecting' || 
                      donationStatus.status === 'processing' || 
                      donationStatus.status === 'confirming';

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
        {/* Wallet Status */}
        {walletConnected && connectedAddress && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                Wallet Connected
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-mono truncate">
              {connectedAddress}
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
          onClick={handleDonate}
          disabled={isProcessing}
          className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {donationStatus.message || 'Processing...'}
            </>
          ) : (
            <>
              <Heart className="h-5 w-5 mr-2" />
              Donate {DONATION_AMOUNT} ETH
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
