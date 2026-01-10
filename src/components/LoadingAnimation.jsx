"use client";

import { useEffect, useState } from "react";

// Array of all available car images
const carImages = [
  { name: "Blaze Runner", image: "/assets/car/Blaze Runner.png" },
  { name: "Turbo Phantom", image: "/assets/car/Turbo Phantom.png" },
  { name: "Chrome Viper", image: "/assets/car/Chrome Viper.png" },
  { name: "High Speed", image: "/assets/car/High Speed.png" },
  { name: "Neon Drifter", image: "/assets/car/Neon Drifter.png" },
  { name: "Speed Demon", image: "/assets/car/Speed Demon.png" },
  { name: "Purple Light", image: "/assets/car/purple light.png" },
  { name: "Thunder Bolt", image: "/assets/car/Thunder Bolt.png" },
  { name: "Fire Beast", image: "/assets/car/Fire Beast.png" },
  { name: "Steel Racer", image: "/assets/car/Steel Racer.png" },
];

export default function LoadingAnimation({ isVisible, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [currentCarIndex, setCurrentCarIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Reset progress when animation starts
    setProgress(0);
    setIsExiting(false);
    setCurrentCarIndex(0);

    // Rotate car images every 300ms
    const carRotationInterval = setInterval(() => {
      setCurrentCarIndex((prev) => (prev + 1) % carImages.length);
    }, 300);

    // Smooth continuous progress animation
    let currentProgress = 0;
    const duration = 2000; // 2 seconds total
    const fps = 60;
    const increment = 100 / (duration / (1000 / fps));

    const progressInterval = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressInterval);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 1000 / fps);

    // Exit animation after completion
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 800);
    }, duration + 300);

    return () => {
      clearInterval(carRotationInterval);
      clearInterval(progressInterval);
      clearTimeout(exitTimer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const currentCar = carImages[currentCarIndex];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md transition-all duration-700 ${isExiting ? "opacity-0" : "opacity-100"
        }`}
      style={{ background: "rgba(0, 0, 0, 0.75)" }}
    >
      {/* Popup Box */}
      <div
        className={`relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl shadow-2xl border border-orange-500/30 p-8 sm:p-12 max-w-2xl w-full mx-4 transition-all duration-700 ${isExiting ? "scale-90 opacity-0" : "scale-100 opacity-100"
          }`}
        style={{
          boxShadow: "0 25px 50px -12px rgba(255, 120, 0, 0.5), 0 0 60px rgba(255, 120, 0, 0.2)",
        }}
      >
        {/* Title */}
        <h2 className="mb-8 text-center text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 drop-shadow-lg animate-pulse">
          Starting Your Engine...
        </h2>

        {/* Car Display Area */}
        <div className="relative mb-8 flex items-center justify-center h-40 sm:h-48">
          {/* Car Image with rotation */}
          <div className="relative w-48 sm:w-64 h-32 sm:h-40 animate-car-bounce">
            <img
              src={currentCar.image}
              alt={currentCar.name}
              className="w-full h-full object-contain drop-shadow-2xl transition-all duration-200"
              style={{
                filter: 'drop-shadow(0 15px 30px rgba(255, 120, 0, 0.7)) drop-shadow(0 0 20px rgba(255, 200, 0, 0.5))',
              }}
            />
          </div>

          {/* Speed lines - Enhanced */}
          {progress > 5 && (
            <div className="absolute left-8 sm:left-12 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-80">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-full animate-speed-line-smooth"
                  style={{
                    width: `${30 - i * 6}px`,
                    animationDelay: `${i * 0.08}s`,
                    opacity: 1 - i * 0.2,
                  }}
                />
              ))}
            </div>
          )}

          {/* Exhaust fire effect */}
          {progress > 15 && (
            <div className="absolute left-16 sm:left-24 top-1/2 -translate-y-1/2 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full animate-fire-exhaust"
                  style={{
                    animationDelay: `${i * 0.15}s`,
                    background: `radial-gradient(circle, ${i === 0 ? '#fbbf24' : i === 1 ? '#f97316' : '#dc2626'} 0%, transparent 70%)`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Car Name */}
        <div className="text-center mb-6">
          <p className="text-lg sm:text-xl font-bold text-orange-300 uppercase tracking-wider animate-fade-in">
            {currentCar.name}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="w-full h-3 bg-gray-800 rounded-full relative overflow-hidden shadow-inner border border-gray-700/50">
            {/* Track markings */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1.5 bg-yellow-500/30 rounded-full"
                />
              ))}
            </div>

            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-400 rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${progress}%`,
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-300 rounded-full blur-sm opacity-80 animate-pulse-subtle" />
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Progress info */}
        <div className="text-center space-y-2">
          <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 mb-2 transition-all duration-300">
            {Math.round(progress)}%
          </div>
          <div className="text-sm sm:text-base text-gray-300 uppercase tracking-[0.3em] font-semibold transition-all duration-500">
            {progress < 25 && "Warming up..."}
            {progress >= 25 && progress < 50 && "Accelerating..."}
            {progress >= 50 && progress < 75 && "Full speed ahead..."}
            {progress >= 75 && progress < 95 && "Almost there..."}
            {progress >= 95 && progress < 100 && "Final lap..."}
            {progress >= 100 && "Ready to race!"}
          </div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-orange-500/50 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-orange-500/50 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-orange-500/50 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-orange-500/50 rounded-br-3xl" />
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes car-bounce {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-4px) rotate(-0.5deg);
          }
        }

        @keyframes speed-line-smooth {
          0% {
            opacity: 0;
            transform: translateX(10px) scaleX(0.5);
          }
          20% {
            opacity: 1;
            transform: translateX(0px) scaleX(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-30px) scaleX(0.3);
          }
        }

        @keyframes fire-exhaust {
          0% {
            opacity: 0.8;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-30px) scale(0.3);
          }
        }

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-car-bounce {
          animation: car-bounce 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }

        .animate-speed-line-smooth {
          animation: speed-line-smooth 0.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .animate-fire-exhaust {
          animation: fire-exhaust 0.5s ease-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-in;
        }
      `}</style>
    </div>
  );
}
