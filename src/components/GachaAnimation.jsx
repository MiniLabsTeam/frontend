"use client";

import { useState, useEffect } from "react";
import { Sparkles, Star } from "lucide-react";

/**
 * Enhanced Gacha Animation Component
 * 3-stage reveal: Countdown → Box Opening → Card Flip Reveal
 */

export default function GachaAnimation({ result, onComplete }) {
  const [stage, setStage] = useState("countdown"); // countdown, opening, reveal, confetti
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!result) return;

    // Stage 1: Countdown (3...2...1...)
    if (stage === "countdown") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 800);
        return () => clearTimeout(timer);
      } else {
        setStage("opening");
      }
    }

    // Stage 2: Box Opening
    if (stage === "opening") {
      const timer = setTimeout(() => setStage("reveal"), 1200);
      return () => clearTimeout(timer);
    }

    // Stage 3: Card Reveal
    if (stage === "reveal") {
      // Check if legendary/epic for confetti
      const isRare = result.rarity === "legendary" || result.rarity === "epic";
      if (isRare) {
        setTimeout(() => setStage("confetti"), 500);
      }
    }
  }, [stage, countdown, result]);

  if (!result) return null;

  const rarityColors = {
    common: "from-gray-500 to-gray-600",
    rare: "from-blue-500 to-cyan-500",
    epic: "from-purple-500 to-pink-500",
    legendary: "from-yellow-500 to-orange-500",
  };

  const rarityGlow = {
    common: "shadow-gray-500/50",
    rare: "shadow-blue-500/50",
    epic: "shadow-purple-500/50",
    legendary: "shadow-yellow-500/50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Stage 1: Countdown */}
      {stage === "countdown" && countdown > 0 && (
        <div className="text-center animate-scale-in">
          <div className="text-9xl font-black text-white animate-pulse">
            {countdown}
          </div>
          <p className="text-white/60 text-xl mt-4">Get ready...</p>
        </div>
      )}

      {/* Stage 2: Box Opening */}
      {stage === "opening" && (
        <div className="text-center">
          <div className="relative animate-bounce">
            <div className="w-48 h-48 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-2xl shadow-orange-500/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={64} className="text-white animate-spin" />
              </div>
            </div>
          </div>
          <p className="text-white text-xl font-bold mt-6 animate-pulse">
            Opening...
          </p>
        </div>
      )}

      {/* Stage 3: Card Reveal */}
      {(stage === "reveal" || stage === "confetti") && (
        <div className="text-center px-4">
          {/* Confetti effect for rare cards */}
          {stage === "confetti" && (
            <>
              <div className="confetti-wrapper">
                {[...Array(50)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      backgroundColor: ["#FFD700", "#FFA500", "#FF69B4", "#00CED1"][Math.floor(Math.random() * 4)],
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Card flip animation */}
          <div className="card-flip">
            <div
              className={`
                relative bg-gradient-to-br ${rarityColors[result.rarity]}
                rounded-3xl p-6 shadow-2xl ${rarityGlow[result.rarity]}
                max-w-sm w-full mx-auto
                transform transition-all duration-500
                hover:scale-105
              `}
            >
              {/* Rarity badge */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <span className="text-white text-sm font-black uppercase flex items-center gap-1">
                  <Star size={14} className="fill-current" />
                  {result.rarity}
                </span>
              </div>

              {/* Image */}
              {result.image && (
                <div className="aspect-square flex items-center justify-center mb-4 mt-8">
                  <img
                    src={result.image}
                    alt={result.name}
                    className="w-full h-full object-contain drop-shadow-2xl animate-scale-in"
                  />
                </div>
              )}

              {/* Name */}
              <h2 className="text-3xl font-black text-white mb-2 animate-slide-up">
                {result.name}
              </h2>

              {/* Series */}
              {result.series && (
                <p className="text-white/80 text-lg mb-4">
                  {result.series}
                </p>
              )}

              {/* Type badge */}
              {result.type && (
                <div className="bg-white/20 rounded-full px-4 py-2 inline-block mb-4">
                  <span className="text-white font-bold text-sm uppercase">
                    {result.type === "car" ? "🏎️ Complete Car" : "🔧 Fragment"}
                  </span>
                </div>
              )}

              {/* Legendary message */}
              {result.rarity === "legendary" && (
                <div className="bg-yellow-400 rounded-2xl p-4 mt-4 animate-pulse">
                  <p className="text-orange-900 font-black text-sm">
                    ✨ LEGENDARY DROP! This can be redeemed for a physical car! ✨
                  </p>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={onComplete}
                className="
                  mt-6 w-full
                  bg-white text-gray-900
                  font-black py-4 rounded-2xl
                  shadow-lg
                  hover:scale-105 active:scale-95
                  transition-all
                "
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .card-flip {
          animation: flipIn 0.6s ease-out;
        }

        @keyframes flipIn {
          0% {
            transform: rotateY(90deg) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
        }

        .confetti-wrapper {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear infinite;
        }

        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
