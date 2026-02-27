'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Copy, Check } from 'lucide-react';

interface UsernameDisplayProps {
  username: string;
  displayName?: string;
  className?: string;
  showCopyButton?: boolean;
  maxLength?: number;
}

/**
 * Username Display Component with Tooltip
 * 
 * Handles long usernames like 'omiaydin.base.eth' with:
 * - Full display in tooltip on hover
 * - Smart truncation for UI space
 * - Optional copy-to-clipboard
 * - Responsive sizing
 */
export function UsernameDisplay({ 
  username, 
  displayName,
  className = '',
  showCopyButton = false,
  maxLength = 20,
}: UsernameDisplayProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[Username] Failed to copy:', error);
    }
  };

  const needsTruncation = username.length > maxLength;
  const truncatedUsername = needsTruncation 
    ? `${username.slice(0, Math.floor(maxLength * 0.6))}...${username.slice(-Math.floor(maxLength * 0.3))}`
    : username;

  const displayContent = (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <span className="truncate font-mono text-sm">
        @{needsTruncation ? truncatedUsername : username}
      </span>
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors touch-manipulation"
          aria-label="Copy username"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      )}
    </div>
  );

  if (needsTruncation) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {displayContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              {displayName && (
                <p className="font-semibold text-sm">{displayName}</p>
              )}
              <p className="font-mono text-xs">@{username}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return displayContent;
}
