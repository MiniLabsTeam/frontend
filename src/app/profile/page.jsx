"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Car, MapPin, Globe, Compass, Info,
  ChevronRight, Wallet, HistoryIcon, BookOpen
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import ShippingInfoModal from "@/components/ShippingInfoModal";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { toast } from "sonner";


export default function ProfilePage() {
  const { isConnected, walletAddress, getAuthToken, disconnect } = useWallet();
  const router = useRouter();
  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    shippingName: null,
    shippingPhone: null,
    shippingAddress: null
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Prevent closing logout modal with Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showLogoutConfirm) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (showLogoutConfirm) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showLogoutConfirm]);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Fetch MockIDRX balance from backend
  useEffect(() => {
    if (isConnected) {
      fetchMockIDRXBalance();
    }
  }, [isConnected]);

  const fetchMockIDRXBalance = async () => {
    try {
      setLoadingMockIDRX(true);
      const authToken = await getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/overview`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      setMockIDRXBalance(data.user?.mockIDRX || 0);

      // Store shipping info
      setShippingInfo({
        shippingName: data.user?.shippingName || null,
        shippingPhone: data.user?.shippingPhone || null,
        shippingAddress: data.user?.shippingAddress || null
      });
    } catch (error) {
      console.error("Failed to fetch MockIDRX balance:", error);
      setMockIDRXBalance(0);
    } finally {
      setLoadingMockIDRX(false);
    }
  };

  const handleLogout = () => {
    disconnect();
    router.push("/");
  };

  if (!isConnected) {
    return null;
  }

  // Determine display name from wallet address
  const userName = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Racer";

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Not connected";

  const handleCopyAddress = async () => {
    if (!walletAddress) {
      toast.error("Wallet not connected yet");
      return;
    }
    if (!navigator?.clipboard) {
      toast.error("Copy not supported");
      return;
    }
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast.success("Wallet address copied!");
    } catch (error) {
      console.error("Failed to copy wallet address:", error);
      toast.error("Copy failed");
    }
  };

  const handleOpenExplorer = () => {
    if (!walletAddress) {
      toast.error("Wallet not connected yet");
      return;
    }
    toast.info("Explorer not available for OneChain");
  };

  const handleComingSoon = (label) => {
    toast.info(`${label} coming soon`);
  };

  const menuItems = [
    {
      id: "address",
      Icon: MapPin,
      title: "Wallet Address",
      subtitle: shortAddress,
      hint: "Tap to copy",
      onClick: handleCopyAddress,
    },
    {
      id: "history",
      Icon: HistoryIcon,
      title: "History Transaction",
      subtitle: "View your activity",
      onClick: () => router.push("/history")
    },
    {
      id: "info",
      Icon: Info,
      title: "Information",
      subtitle: "Your Information",
      onClick: () => setShowShippingModal(true)
    },
    {
      id: "tutorial",
      Icon: BookOpen,
      title: "View Tutorial",
      subtitle: "Learn how to use the app",
      onClick: () => setShowTutorial(true)
    },
    {
      id: "about",
      Icon: Info,
      title: "About",
      subtitle: "MiniGarage v1.0",
      onClick: () => handleComingSoon("About")
    },
  ];

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white overflow-hidden">
      {/* Checkered Pattern Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px),
            repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)
          `
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="px-6 pt-4 pb-6">
          {/* User Info Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 mb-4 shadow-xl border border-white/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-18 h-18 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg p-4">
                <Car size={36} className="text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-800">{userName}</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-mono">{shortAddress}</p>
              </div>
            </div>

            {/* Balance Display */}
            <div className="flex flex-wrap gap-2">
              {/* MockIDRX Balance Badge */}
              <button
                type="button"
                onClick={fetchMockIDRXBalance}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-4 py-2 w-fit profile-badge transition-transform hover:scale-[1.02] active:scale-95"
                aria-label="Refresh IDRX balance"
                title="Tap to refresh IDRX balance"
              >
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <Wallet size={16} className="text-yellow-300" strokeWidth={3} />
                </div>
                <span className="font-black text-lg text-orange-900">
                  {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance)}
                </span>
                <span className="text-sm font-bold text-orange-900 opacity-90">IDRX</span>
              </button>
            </div>
          </div>
        </header>

        {/* Menu Items */}
        <div className="flex-1 px-6 space-y-3">
          {menuItems.map((item) => {
            const IconComponent = item.Icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={item.disabled}
                className={`group w-full bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 transition-all transform hover:scale-[1.02] active:scale-95 ${
                  item.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:shadow-xl"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                      <IconComponent size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-sm text-gray-600">{item.subtitle}</p>
                      )}
                      {item.hint && (
                        <span className="text-[10px] uppercase tracking-[0.15em] text-orange-500 font-semibold">{item.hint}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-orange-500 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="px-6 py-6">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200 uppercase"
          >
            Log Out
          </button>
        </div>

        {/* Bottom Car Image */}
        <div className="relative h-48 overflow-hidden mb-20">
          <img
            src="/assets/car/High Speed.png"
            alt="Car"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm object-contain drop-shadow-2xl"
            style={{ transform: 'translateX(-50%) rotate(-5deg)' }}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Shipping Information Modal */}
      <ShippingInfoModal
        isOpen={showShippingModal}
        onClose={() => setShowShippingModal(false)}
        shippingInfo={shippingInfo}
        onUpdate={(updatedUser) => {
          // Update local state with new shipping info
          setShippingInfo({
            shippingName: updatedUser.shippingName,
            shippingPhone: updatedUser.shippingPhone,
            shippingAddress: updatedUser.shippingAddress
          });
        }}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 border-2 border-red-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-white text-center mb-2">
              Confirm Logout
            </h2>

            {/* Message */}
            <p className="text-gray-300 text-center mb-6">
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </main>
  );
}
