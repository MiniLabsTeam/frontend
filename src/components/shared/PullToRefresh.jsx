"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Pull to Refresh Component
 * Simple pull-to-refresh for mobile PWA
 */

export default function PullToRefresh({ onRefresh, children }) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const threshold = 80; // Pull distance threshold
  const maxPull = 120; // Maximum pull distance

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, maxPull));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && pullDistance > 10 && (
        <div
          className="fixed top-0 left-0 right-0 flex justify-center z-50 transition-all"
          style={{
            transform: `translateY(${Math.min(pullDistance - 40, 40)}px)`,
            opacity: Math.min(progress, 1),
          }}
        >
          <div className="bg-orange-500 rounded-full p-3 shadow-lg">
            <RefreshCw
              size={24}
              className={`text-white ${isRefreshing ? "animate-spin" : ""}`}
              style={{
                transform: isRefreshing ? "none" : `rotate(${rotation}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isPulling ? pullDistance * 0.5 : 0}px)`,
          transition: isPulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
