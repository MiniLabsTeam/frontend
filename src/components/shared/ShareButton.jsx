"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Button from "./Button";

/**
 * Share Button Component
 * Integrates with Farcaster MiniApp SDK for native sharing
 */

export default function ShareButton({
  text,
  url,
  embeds = [],
  variant = "secondary",
  size = "md",
  showIcon = true,
  children,
  className = "",
}) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);

      // Check if SDK is available
      if (!sdk?.actions?.share) {
        // Fallback to Web Share API
        if (navigator.share) {
          await navigator.share({
            title: "MiniGarage",
            text: text || "Check out my car collection in MiniGarage!",
            url: url || window.location.href,
          });
          toast.success("Shared successfully!");
        } else {
          // Fallback to clipboard
          const shareUrl = url || window.location.href;
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard!");
        }
        return;
      }

      // Use Farcaster SDK share
      const shareData = {
        text: text || "Check out my car collection in MiniGarage! 🏎️",
      };

      // Add embeds if provided
      if (embeds.length > 0) {
        shareData.embeds = embeds;
      } else if (url) {
        shareData.embeds = [url];
      }

      await sdk.actions.share(shareData);
      toast.success("Shared to Base feed!");
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Failed to share. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      disabled={isSharing}
      className={className}
    >
      {showIcon && <Share2 size={18} className="mr-2" />}
      {children || (isSharing ? "Sharing..." : "Share")}
    </Button>
  );
}

/**
 * Share Card Component
 * Pre-configured share for car cards
 */
export function ShareCarButton({ car, variant = "ghost", size = "sm" }) {
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/car/${car?.id || ""}`
    : "";

  const shareText = car
    ? `Check out my ${car.rarity} car in MiniGarage! 🏎️\n${car.name || "Awesome Car"}`
    : "Check out MiniGarage! 🏎️";

  return (
    <ShareButton
      text={shareText}
      url={shareUrl}
      variant={variant}
      size={size}
      showIcon={true}
    >
      Share
    </ShareButton>
  );
}

/**
 * Share Collection Button
 * Share entire collection/inventory
 */
export function ShareCollectionButton({
  totalCars = 0,
  rareCount = 0,
  variant = "primary",
  size = "md"
}) {
  const shareText = `I have ${totalCars} cars in my MiniGarage collection! ${
    rareCount > 0 ? `Including ${rareCount} rare cars! 🏆` : ""
  } Check it out! 🏎️`;

  return (
    <ShareButton
      text={shareText}
      variant={variant}
      size={size}
      showIcon={true}
    >
      Share Collection
    </ShareButton>
  );
}
