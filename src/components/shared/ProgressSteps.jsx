"use client";

import React from 'react';

/**
 * Progress Steps Component
 * Shows step-by-step progress for multi-step operations
 */
export default function ProgressSteps({ steps, currentStep, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <div
            key={index}
            className={`flex items-center gap-3 transition-all duration-300 ${
              isCurrent ? 'scale-105' : ''
            }`}
          >
            {/* Step Indicator */}
            <div className="flex-shrink-0">
              {isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              ) : isCurrent ? (
                <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                </div>
              )}
            </div>

            {/* Step Label */}
            <div className="flex-1">
              <p
                className={`text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'text-green-400'
                    : isCurrent
                    ? 'text-blue-400'
                    : 'text-gray-500'
                }`}
              >
                {step}
              </p>
            </div>

            {/* Loading Spinner for Current Step */}
            {isCurrent && (
              <div className="flex-shrink-0">
                <svg
                  className="animate-spin h-5 w-5 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact Progress Bar variant
 */
export function ProgressBar({ steps, currentStep, className = "" }) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        ></div>
      </div>

      {/* Current Step Label */}
      <p className="text-sm text-gray-400 text-center">
        {steps[currentStep - 1]} ({currentStep}/{steps.length})
      </p>
    </div>
  );
}
