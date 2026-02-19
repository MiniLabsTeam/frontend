'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Wallet, Car, Flame, Gift } from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to MiniLabs!',
    description: 'Your gateway to collecting rare NFT cars on OneChain',
    image: '/assets/car/Blaze Runner.png',
    color: 'from-orange-500 to-red-600'
  },
  {
    icon: <Wallet size={48} className="text-yellow-400" strokeWidth={2.5} />,
    title: 'Claim Free IDRX',
    description: 'Get 1,000,000 IDRX every 24 hours from the faucet to start your collection',
    highlight: 'Tap the yellow IDRX badge on top',
    color: 'from-yellow-500 to-orange-600'
  },
  {
    icon: <Flame size={48} className="text-red-400" strokeWidth={2.5} />,
    title: 'Open Gacha Boxes',
    description: 'Spin the gacha to get random car NFTs. Choose from Economy, Sport, Supercar, or Hypercar tiers',
    highlight: 'Each tier has different rarities',
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: <Car size={48} className="text-blue-400" strokeWidth={2.5} />,
    title: 'Collect & Upgrade',
    description: 'Collect car fragments and combine them into full NFT cars in your garage',
    highlight: '5 fragments = 1 complete car',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: <Gift size={48} className="text-green-400" strokeWidth={2.5} />,
    title: 'Trade on Marketplace',
    description: 'Buy, sell, or trade your cars with other collectors',
    highlight: 'Build your ultimate collection!',
    color: 'from-green-500 to-emerald-600'
  }
];

export default function OnboardingTutorial({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('forward');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTutorial = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="relative max-w-md w-full mx-4">
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
        >
          <span>Skip Tutorial</span>
          <X size={20} />
        </button>

        {/* Main Card */}
        <div className={`bg-gradient-to-br ${currentTutorial.color} rounded-3xl shadow-2xl overflow-hidden`}>
          {/* Content */}
          <div className="relative p-8 pt-12 pb-6">
            {/* Icon/Image */}
            <div className="flex justify-center mb-6">
              {currentStep === 0 && currentTutorial.image ? (
                <div className="relative w-64 h-40 flex items-center justify-center">
                  <img
                    src={currentTutorial.image}
                    alt="Welcome"
                    className="w-full h-full object-contain drop-shadow-2xl animate-bounce-slow"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl">
                  {typeof currentTutorial.icon === 'string' ? (
                    <span className="text-6xl">{currentTutorial.icon}</span>
                  ) : (
                    currentTutorial.icon
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <h2 className="text-white text-3xl font-black text-center mb-4 drop-shadow-lg">
              {currentTutorial.title}
            </h2>

            {/* Description */}
            <p className="text-white/90 text-center text-base mb-4 leading-relaxed">
              {currentTutorial.description}
            </p>

            {/* Highlight */}
            {currentTutorial.highlight && (
              <div className="bg-white/20 backdrop-blur border-2 border-white/30 rounded-xl p-3 mb-4">
                <p className="text-white text-sm font-bold text-center">
                  💡 {currentTutorial.highlight}
                </p>
              </div>
            )}

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 mb-6">
              {TUTORIAL_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentStep ? 'forward' : 'backward');
                    setCurrentStep(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur border-2 border-white/30 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                  <span>Back</span>
                </button>
              )}
              <button
                onClick={handleNext}
                className={`${isFirstStep ? 'w-full' : 'flex-1'} bg-white hover:bg-gray-100 text-gray-900 font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl`}
              >
                <span>{isLastStep ? "Let's Go!" : 'Next'}</span>
                {!isLastStep && <ChevronRight size={20} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </div>

        {/* Step Counter */}
        <div className="text-center mt-4 text-gray-400 text-sm font-bold">
          Step {currentStep + 1} of {TUTORIAL_STEPS.length}
        </div>
      </div>
    </div>
  );
}
