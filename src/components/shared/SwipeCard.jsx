"use client";

import { useState, useRef } from "react";
import { Share2, Tag, Eye } from "lucide-react";

/**
 * Swipe Card Component
 * Card with swipe gestures to reveal actions
 */

export default function SwipeCard({
  children,
  onView,
  onShare,
  onSell,
  className = ""
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef(null);

  const maxSwipe = 120; // Maximum swipe distance
  const actionThreshold = 60; // Threshold to trigger action

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;

    // Only allow left swipe (negative diff)
    if (diff < 0) {
      setOffsetX(Math.max(diff, -maxSwipe));
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    // Check if swiped far enough
    if (Math.abs(offsetX) < actionThreshold) {
      // Reset to original position
      setOffsetX(0);
    } else {
      // Keep at action position
      setOffsetX(-maxSwipe);
    }
  };

  const handleAction = (action) => {
    action?.();
    // Reset position after action
    setTimeout(() => setOffsetX(0), 300);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (revealed on swipe left) */}
      <div className="absolute top-0 right-0 bottom-0 flex items-center gap-2 pr-3">
        {onView && (
          <button
            onClick={() => handleAction(onView)}
            className="bg-blue-500 text-white p-3 rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            <Eye size={20} />
          </button>
        )}
        {onShare && (
          <button
            onClick={() => handleAction(onShare)}
            className="bg-green-500 text-white p-3 rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            <Share2 size={20} />
          </button>
        )}
        {onSell && (
          <button
            onClick={() => handleAction(onSell)}
            className="bg-orange-500 text-white p-3 rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            <Tag size={20} />
          </button>
        )}
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative z-10 ${className}`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
