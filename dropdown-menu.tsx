'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { base } from 'viem/chains';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { Sparkles, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { recordPayment, getTransactionUrl } from '../lib/payment';

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RECIPIENT_ADDRESS = '0x71AAD1110dFd8F60249cD45ce4fb05163b6f812B' as Address;
const PAYMENT_AMOUNT = '0.0001'; // ETH

export function PremiumModal({ open, onClose, onSuccess }: PremiumModalProps) {
  const { address, isConnected, chain } = useAccount();
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const [txSubmitted, setTxSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    // Check if user is on the correct network (Base)
    if (isConnected && chain && chain.id !== base.id) {
      setWrongNetwork(true);
    } else {
      setWrongNetwork(false);
    }
  }, [isConnected, chain]);

  async function handlePayment() {
    if (!address) return;

    if (wrongNetwork) {
      setVerificationError('Please switch to Base network before making payment');
      return;
    }

    try {
      setTxSubmitted(true);
      setVerificationError(null);
      
      sendTransaction({
        to: RECIPIENT_ADDRESS,
        value: parseEther(PAYMENT_AMOUNT),
        chainId: base.id,
      });
    } catch (err) {
      console.error('Payment error:', err);
      setTxSubmitted(false);
      setVerificationError('Payment failed. Please try again.');
    }
  }

  // Handle successful transaction
  useEffect(() => {
    async function verifyAndActivate() {
      if (isSuccess && address && hash) {
        setVerifying(true);
        setVerificationError(null);
        
        try {
          // Wait for transaction to be indexed on Base
          console.log('Transaction confirmed. Verifying on Base network...');
          console.log('Transaction hash:', hash);
          console.log('User address:', address);
          console.log('Chain ID:', chain?.id);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Verify payment on Base network with enhanced error handling
          console.log('Starting payment verification...');
          const result = await recordPayment(address, PAYMENT_AMOUNT, hash);
          
          if (result.success) {
            console.log('✓ Payment verified successfully on Base!');
            console.log('✓ Premium features will be activated');
            setTimeout(() => {
              onSuccess();
              onClose();
              setTxSubmitted(false);
              setVerifying(false);
              setVerificationError(null);
            }, 1500);
          } else {
            // Show specific error message from verification
            const errorMsg = result.error || 'Payment verification failed. Please ensure transaction was sent on Base network.';
            console.error('✗ Payment verification failed:', errorMsg);
            console.error('Result:', result);
            setVerificationError(errorMsg);
            setVerifying(false);
          }
        } catch (err: any) {
          console.error('✗ Verification error:', err);
          console.error('Error details:', {
            message: err.message,
            code: err.code,
            data: err.data,
          });
          const errorMsg = err.message || 'Failed to verify payment. Please contact support if this persists.';
          setVerificationError(errorMsg);
          setVerifying(false);
        }
      }
    }

    verifyAndActivate();
  }, [isSuccess, address, hash]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-black dark:text-white">
            <Sparkles className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <span>Upgrade to Premium</span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Unlock advanced AI insights and weekly trend analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 sm:space-y-6 py-3 sm:py-4">
          {/* Premium Features - Mobile Optimized */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm sm:text-base text-black dark:text-white">What you get:</h3>
            <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Deep engagement analysis</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Weekly trend reports</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Long-term growth tracking</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Personalized strategy recommendations</span>
              </li>
            </ul>
          </div>

          {/* Pricing - Mobile Optimized */}
          <div className="p-4 sm:p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-black dark:text-white">0.0001 ETH</span>
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">/ month</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              On Base network • ~$0.30 USD
            </p>
          </div>

          {/* Network Warning */}
          {wrongNetwork && (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                Please switch to Base network to make payment
              </AlertDescription>
            </Alert>
          )}

          {/* Wallet Connection - Mobile Optimized */}
          {!isConnected ? (
            <div className="space-y-3">
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Connect your wallet to continue
              </p>
              <Wallet>
                <ConnectWallet className="w-full h-11 text-base touch-manipulation">
                  <Avatar className="h-6 w-6" />
                  <Name />
                </ConnectWallet>
              </Wallet>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Wallet Info - Mobile Optimized */}
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1.5">Connected wallet</p>
                <p className="text-sm sm:text-base font-mono text-black dark:text-white break-all">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                  Network: {chain?.name || 'Unknown'} (Chain ID: {chain?.id || 'N/A'})
                </p>
                {chain?.id === base.id && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Connected to Base network
                  </p>
                )}
              </div>

              {/* Payment Status Messages */}
              {isSuccess && verifying ? (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-pulse" />
                  <AlertDescription className="text-sm sm:text-base text-blue-800 dark:text-blue-200">
                    Verifying payment on Base network... This may take a moment.
                  </AlertDescription>
                </Alert>
              ) : isSuccess && !verifying && !verificationError ? (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <AlertDescription className="text-sm sm:text-base text-green-800 dark:text-green-200">
                    ✓ Payment verified on Base! Activating premium features...
                  </AlertDescription>
                </Alert>
              ) : verificationError ? (
                <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <AlertDescription className="text-sm sm:text-base text-red-800 dark:text-red-200">
                    <div className="space-y-2">
                      <p className="font-semibold">Verification Failed</p>
                      <p>{verificationError}</p>
                      {hash && (
                        <a
                          href={getTransactionUrl(hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 mt-2"
                        >
                          Check transaction on BaseScan
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : error ? (
                <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <AlertDescription className="text-sm sm:text-base text-red-800 dark:text-red-200">
                    Transaction failed. Please try again.
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Payment Button */}
              {!isSuccess && !verifying && (
                <Button
                  onClick={handlePayment}
                  disabled={isPending || isConfirming || txSubmitted || wrongNetwork}
                  className="w-full h-11 text-base touch-manipulation"
                >
                  {isPending || isConfirming
                    ? 'Processing...'
                    : txSubmitted
                    ? 'Confirming...'
                    : `Pay ${PAYMENT_AMOUNT} ETH on Base`}
                </Button>
              )}

              {/* Transaction Hash - Mobile Optimized */}
              {hash && (
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center break-all">
                  <p className="mb-2">Transaction submitted</p>
                  <a
                    href={getTransactionUrl(hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline touch-manipulation inline-flex items-center gap-1.5"
                  >
                    View on BaseScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Payment Info - Mobile Optimized */}
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
            <p>• Payment is verified onchain on Base network</p>
            <p>• Subscription valid for 30 days from payment</p>
            <p>• Low gas fees (~$0.01) on Base network</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
