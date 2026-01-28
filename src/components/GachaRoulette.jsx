import React, { useEffect, useRef, useState } from 'react';

const ITEM_WIDTH = 200; // Width of each card
const ITEM_GAP = 10;     // Gap between cards
const WINNER_INDEX = 65; // Index where the winner will be placed (must be > visible window)
const TOTAL_ITEMS = 80;  // Total items in the reel

const GachaRoulette = ({ reward, onComplete, availableItems = [] }) => {
    const scrollContainerRef = useRef(null);
    const [items, setItems] = useState([]);
    const [started, setStarted] = useState(false);

    // Helper to get random item
    const getRandomItem = () => {
        if (!availableItems.length) return { name: 'Unknown', image: '', rarity: 'common' };
        return availableItems[Math.floor(Math.random() * availableItems.length)];
    };

    useEffect(() => {
        // Generate the reel strip
        const newItems = Array.from({ length: TOTAL_ITEMS }).map((_, i) => {
            if (i === WINNER_INDEX) {
                return reward; // Place the actual winner
            }
            return getRandomItem();
        });
        setItems(newItems);

        // Give a small delay to ensure render before starting animation
        const timer = setTimeout(() => {
            setStarted(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []); // Run once on mount

    useEffect(() => {
        if (!started) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        // Calculate the distance to scroll
        // We want the WINNER_INDEX card to be centered.
        // Dimensions:
        // Card Start Position = WINNER_INDEX * (ITEM_WIDTH + ITEM_GAP)
        // To Center: Position - (ContainerWidth / 2) + (CardWidth / 2)

        // However, since we use translateX on the inner track, we move it NEGATIVE.
        const containerWidth = container.parentElement.offsetWidth;
        const cardOffset = WINNER_INDEX * (ITEM_WIDTH + ITEM_GAP);
        const centerOffset = (containerWidth / 2) - (ITEM_WIDTH / 2);
        const finalTransform = -(cardOffset - centerOffset);

        // Apply the transition
        // We modify the style directly to trigger the CSS transition
        container.style.transition = 'transform 8s cubic-bezier(0.15, 0.9, 0.3, 1)'; // CS:GO style easing (fast start, very slow stop)
        container.style.transform = `translateX(${finalTransform}px)`;

        // Listen for transition end
        const handleTransitionEnd = () => {
            // Wait a moment after stopping before showing the result modal
            setTimeout(() => {
                onComplete();
            }, 1000);
        };

        container.addEventListener('transitionend', handleTransitionEnd);

        return () => {
            container.removeEventListener('transitionend', handleTransitionEnd);
        };
    }, [started]);

    if (items.length === 0) return null;

    // Colors for rarities (just for visual flair in the reel)
    const getRarityColor = (rarity) => {
        const r = rarity?.toLowerCase() || '';
        if (r.includes('legendary')) return 'border-yellow-500 shadow-yellow-500/50';
        if (r.includes('premium') || r.includes('epic')) return 'border-red-500 shadow-red-500/50';
        if (r.includes('rare')) return 'border-blue-500 shadow-blue-500/50';
        return 'border-gray-500';
    };

    const getRarityBg = (rarity) => {
        const r = rarity?.toLowerCase() || '';
        if (r.includes('legendary')) return 'bg-yellow-900/80';
        if (r.includes('premium') || r.includes('epic')) return 'bg-red-900/80';
        if (r.includes('rare')) return 'bg-blue-900/80';
        return 'bg-gray-800/80';
    }

    return (
        <div className="w-full relative py-10 overflow-hidden bg-black/80 border-y-4 border-orange-500/50">
            {/* Arrow Marker (Top) */}
            <div className="absolute left-1/2 top-0 z-30 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-t-[20px] border-t-yellow-400 border-r-[16px] border-r-transparent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"></div>
            </div>

            {/* Arrow Marker (Bottom - Optional, for symmetry) */}
            <div className="absolute left-1/2 bottom-0 z-30 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-b-[20px] border-b-yellow-400 border-r-[16px] border-r-transparent filter drop-shadow-[0_-2px_4px_rgba(0,0,0,0.5)]"></div>
            </div>

            {/* Container for the sliding track */}
            <div
                ref={scrollContainerRef}
                className="flex gap-[10px] items-center will-change-transform"
                style={{
                    width: 'max-content',
                    transform: 'translateX(0px)' // Start at 0
                }}
            >
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`
                relative flex-shrink-0 flex flex-col items-center justify-center 
                width-[200px] h-48 rounded-lg border-b-4 
                ${getRarityColor(item.rarity)} ${getRarityBg(item.rarity)}
            `}
                        style={{ width: `${ITEM_WIDTH}px` }}
                    >
                        {/* Image */}
                        <div className="w-full h-32 p-2 flex items-center justify-center">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain filter drop-shadow-lg"
                            />
                        </div>

                        {/* Name */}
                        <div className="w-full text-center p-2 bg-black/40 mt-auto">
                            <p className="text-xs font-bold text-gray-300 truncate px-2">{item.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{item.rarity || 'Common'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Overlay Gradients for Depth */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-900 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-900 to-transparent z-20 pointer-events-none"></div>
        </div>
    );
};

export default GachaRoulette;
