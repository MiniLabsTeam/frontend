"use client";

import React from 'react';

/**
 * Error Banner Component
 * Displays persistent error messages with retry action
 */
export default function ErrorBanner({
  error,
  onRetry,
  onDismiss,
  className = ""
}) {
  if (!error) return null;

  return (
    <div className={`bg-red-900/20 border border-red-500/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>

        {/* Error Message */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-400">Error</h3>
          <p className="text-sm text-red-300 mt-1 break-words">{error}</p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Warning Banner variant
 */
export function WarningBanner({
  message,
  onDismiss,
  className = ""
}) {
  if (!message) return null;

  return (
    <div className={`bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-yellow-300 break-words">{message}</p>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Info Banner variant
 */
export function InfoBanner({
  message,
  onDismiss,
  className = ""
}) {
  if (!message) return null;

  return (
    <div className={`bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-blue-300 break-words">{message}</p>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
