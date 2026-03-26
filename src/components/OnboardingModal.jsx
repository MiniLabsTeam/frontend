"use client";

import { useState, useEffect } from "react";
import { Car, Gamepad2, ShoppingCart, Trophy, X } from "lucide-react";
import { Button } from "./shared";

/**
 * Onboarding Modal Component
 * First-time user experience for MiniGarage
 */

export default function OnboardingModal({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const hasSeenOnboarding = localStorage.getItem("minigarage_onboarding_completed");
      if (hasSeenOnboarding) {
        onClose?.();
      }
    }
  }, [isOpen, onClose]);

  const steps = [
    {
      icon: Car,
      title: "Welcome to MiniGarage!",
      description: "Collect, race, and trade NFT cars on OneChain. Use OCT tokens to pull gacha, equip spare parts, and boost your cars!",
      iconColor: "text-orange-500",
      bgGradient: "from-orange-500 to-orange-600",
    },
    {
      icon: Gamepad2,
      title: "Race & Compete",
      description: "Jump into 2D Drag Races, 3D Endless runs, or Multiplayer battles. Your car stats directly affect race performance!",
      iconColor: "text-emerald-500",
      bgGradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: ShoppingCart,
      title: "Trade on Marketplace",
      description: "Buy and sell NFT cars and spare parts with other players using OCT tokens. Build your dream collection!",
      iconColor: "text-blue-500",
      bgGradient: "from-blue-500 to-indigo-600",
    },
    {
      icon: Trophy,
      title: "Predict & Earn",
      description: "Bet on race outcomes in Prediction Markets, complete daily quests for rewards, and claim physical diecast models for legendary cars!",
      iconColor: "text-purple-500",
      bgGradient: "from-purple-500 to-pink-600",
    },
  ];

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("minigarage_onboarding_completed", "true");
    }
    onComplete?.();
    onClose?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${step.bgGradient} p-8 text-center`}>
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-scale-in">
              <Icon size={48} className="text-white" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 animate-slide-up">
            {step.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-center mb-6">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-8 bg-orange-500"
                    : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={handlePrev}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep < steps.length - 1 ? "Next" : "Let's Race!"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
