"use client";

import { useEffect, useState, useRef } from "react";
import { useCurrentAccount, useConnectWallet, useWallets } from "@onelabs/dapp-kit";
import { useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";

const background =
  "/assets/backgrounds/view-car-running-high-speed%20%282%29.jpg";
const launchButton = "/assets/images/1.png";
const fireIcon = "/assets/icons/fire.png";

// Die-Cast Car Collection
const diecastCarsTop = [
  { name: "Blaze Runner", image: "/assets/car/Blaze Runner.png" },
  { name: "Turbo Phantom", image: "/assets/car/Turbo Phantom.png" },
  { name: "Chrome Viper", image: "/assets/car/Chrome Viper.png" },
  { name: "High Speed", image: "/assets/car/High Speed.png" },
  { name: "Neon Drifter", image: "/assets/car/Neon Drifter.png" },
];

const diecastCarsBottom = [
  { name: "Speed Demon", image: "/assets/car/Speed Demon.png" },
  { name: "Purple Light", image: "/assets/car/purple light.png" },
  { name: "Thunder Bolt", image: "/assets/car/Thunder Bolt.png" },
  { name: "Fire Beast", image: "/assets/car/Fire Beast.png" },
  { name: "Steel Racer", image: "/assets/car/Steel Racer.png" },
];

// Features untuk section 3
const features = [
  {
    icon: "/assets/icons/wallet.png",
    title: "Instant Wallet Setup",
    description: "Get started in seconds with seamless onboarding",
  },
  {
    icon: "/assets/icons/nft.png",
    title: "Collect Exclusive NFTs",
    description: "Own rare digital collectibles and trade them",
  },
  {
    icon: "/assets/icons/car.png",
    title: "Earn Rewards",
    description: "Generate value from your collection",
  },
  {
    icon: "/assets/icons/comunity.png",
    title: "Community Driven",
    description: "Join thousands of collectors worldwide",
  },
];

export default function Home() {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: login } = useConnectWallet();
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const heroRef = useRef(null);

  // Horizontal swipe state
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef(null);

  const totalPages = 3;

  // Show loading animation and redirect to dashboard if connected
  useEffect(() => {
    if (account) {
      setShowLoading(true);
    }
  }, [account]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const elements = document.querySelectorAll("[data-reveal]");
    if (!elements.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hero = heroRef.current;
    if (!hero) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId = null;

    const updatePosition = (event) => {
      const rect = hero.getBoundingClientRect();
      const clientX = event.clientX ?? rect.left + rect.width / 2;
      const clientY = event.clientY ?? rect.top + rect.height / 2;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const offsetX = (x - 0.5) * 2;
      const offsetY = (y - 0.5) * 2;

      hero.style.setProperty("--parallax-x", offsetX.toFixed(3));
      hero.style.setProperty("--parallax-y", offsetY.toFixed(3));
    };

    const handleMove = (event) => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updatePosition(event);
      });
    };

    const handleLeave = () => {
      hero.style.setProperty("--parallax-x", "0");
      hero.style.setProperty("--parallax-y", "0");
    };

    hero.addEventListener("pointermove", handleMove);
    hero.addEventListener("pointerleave", handleLeave);

    return () => {
      hero.removeEventListener("pointermove", handleMove);
      hero.removeEventListener("pointerleave", handleLeave);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const handleLoadingComplete = () => {
    setShowLoading(false);
    router.push("/dashboard");
  };

  const handleLogin = () => {
    setLoginError(null);
    if (!wallets[0]) {
      setLoginError("No OneChain wallet found. Please install a wallet.");
      return;
    }
    login(
      { wallet: wallets[0] },
      {
        onError: (error) => {
          console.error("Login failed:", error);
          setLoginError("Failed to connect. Please try again.");
        },
      }
    );
  };

  // Swipe handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    const minSwipeDistance = 50;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (isRightSwipe && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  return (
    <main
      className="relative h-screen overflow-hidden bg-black text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Horizontal Swipe Container */}
      <div
        ref={containerRef}
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentPage * 100}%)` }}
      >
        {/* PAGE 1: HERO */}
        <div className="min-w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 minigarage-hero-bg bg-cover bg-center"
              style={{ backgroundImage: `url('${background}')` }}
            />
            <div className="absolute inset-0 minigarage-hero-grid" aria-hidden="true" />
            <div className="absolute inset-0 minigarage-hero-glow" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black" />
          </div>

          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <h1 className="minigarage-title minigarage-gradient-text mb-4 text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
              The Ultimate NFT Car Collection on Base
            </h1>

            <p className="minigarage-tagline mb-12 text-sm uppercase tracking-widest sm:text-base md:text-lg">
              Collect. Build. Own.
            </p>

            <div className="minigarage-launch-wrap mx-auto w-full max-w-[380px]">
              <button
                type="button"
                onClick={handleLogin}
                disabled={false}
                className="minigarage-launch-button"
              >
                <img src={fireIcon} alt="Fire icon" className="minigarage-launch-icon" />
                <span className="minigarage-launch-text">Launch App</span>
              </button>
              {loginError && (
                <p className="mt-3 text-sm text-red-400 text-center" role="alert">
                  {loginError}
                </p>
              )}
            </div>

            {/* Swipe hint */}
            <div className="mt-8 flex items-center justify-center gap-2 text-white/60 text-xs animate-pulse">
              <span>Swipe to learn more</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {/* PAGE 2: COLLECTION PREVIEW */}
        <div className="min-w-full h-full relative flex items-center justify-center bg-gradient-to-b from-white to-gray-100">
          <div className="mx-auto w-full px-4 py-8">
            <h2 className="mb-3 text-center text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
              Collect Exclusive NFTs on Base
            </h2>
            <p className="mx-auto mb-8 w-full text-center text-sm leading-snug text-slate-600 max-w-lg sm:text-base">
              Premium digital cars with seamless blockchain integration. Own rare collectibles that are truly yours.
            </p>

            {/* Single Carousel */}
            <div className="relative mb-6 overflow-hidden py-4">
              <div
                className="flex animate-scroll-left gap-4 sm:gap-6"
                style={{ pointerEvents: "none" }}
              >
                {[
                  ...diecastCarsTop,
                  ...diecastCarsTop,
                  ...diecastCarsTop,
                ].map((car, index) => (
                  <div
                    key={index}
                    className="car-card min-w-[180px] max-w-[180px] flex-shrink-0 rounded-2xl bg-white p-4 shadow-xl sm:min-w-[220px] sm:max-w-[220px]"
                  >
                    <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-orange-gradient relative sm:h-32">
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                          backgroundSize: "12px 12px",
                        }}
                      />
                      <img
                        src={car.image}
                        alt={car.name}
                        loading="lazy"
                        className="relative z-10 h-full w-full object-contain scale-110"
                      />
                    </div>
                    <h3 className="text-center text-xs font-bold uppercase leading-tight tracking-wide text-slate-800 sm:text-sm">
                      {car.name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-3 text-center shadow-lg">
                <p className="text-2xl font-black text-white">100+</p>
                <p className="text-xs text-white/80">Unique Cars</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-3 text-center shadow-lg">
                <p className="text-2xl font-black text-white">4</p>
                <p className="text-xs text-white/80">Rarity Tiers</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-3 text-center shadow-lg">
                <p className="text-2xl font-black text-white">Base</p>
                <p className="text-xs text-white/80">Blockchain</p>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleLogin}
                disabled={false}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black py-3 px-8 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all"
              >
                Start Collecting
              </button>
            </div>
          </div>
        </div>

        {/* PAGE 3: FEATURES + CTA */}
        <div className="min-w-full h-full relative flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
          <div className="mx-auto max-w-2xl px-4 py-8">
            <h2 className="minigarage-title minigarage-gradient-text mb-8 text-center text-2xl font-black sm:text-3xl md:text-4xl">
              How MiniGarage Works
            </h2>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="minigarage-panel rounded-xl p-4 text-center"
                >
                  <div className="mb-2 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 p-2 shadow-lg sm:h-14 sm:w-14">
                      <img
                        src={feature.icon}
                        alt={feature.title}
                        className="h-6 w-6 object-contain brightness-0 invert sm:h-7 sm:w-7"
                      />
                    </div>
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-orange-300 sm:text-base">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Final CTA */}
            <div className="text-center">
              <h3 className="mb-4 text-xl font-black text-white sm:text-2xl">
                Ready to Build Your Collection? 🏎️
              </h3>
              <p className="mb-6 text-sm text-gray-300 sm:text-base">
                Collect legendary racing machines as NFTs. Each car is unique, tradeable, and exclusively yours.
              </p>

              <button
                type="button"
                onClick={handleLogin}
                disabled={false}
                className="minigarage-launch-button mx-auto"
              >
                <img src={fireIcon} alt="Fire icon" className="minigarage-launch-icon" />
                <span className="minigarage-launch-text">Launch App</span>
              </button>
              {loginError && (
                <p className="mt-3 text-sm text-red-400 text-center" role="alert">
                  {loginError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page Indicators (Dots) */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center gap-2">
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            onClick={() => goToPage(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentPage
                ? "w-8 bg-orange-500"
                : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>

      {/* Loading Animation Popup */}
      <LoadingAnimation
        isVisible={showLoading}
        onComplete={handleLoadingComplete}
      />
    </main>
  );
}
