"use client";

/**
 * Skeleton Loading Components
 * Smooth shimmer effect for loading states
 */

// Base shimmer animation
const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`;

// Card Skeleton (for car cards, marketplace items)
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Image placeholder */}
      <div className={`h-48 bg-gray-200 ${shimmer}`} />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className={`h-5 bg-gray-200 rounded ${shimmer} w-3/4`} />

        {/* Description/Stats */}
        <div className={`h-4 bg-gray-200 rounded ${shimmer} w-1/2`} />

        {/* Button */}
        <div className={`h-10 bg-gray-200 rounded-lg ${shimmer}`} />
      </div>
    </div>
  );
}

// List Item Skeleton (for transaction history, fragment lists)
export function SkeletonListItem() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-4">
        {/* Icon/Image */}
        <div className={`w-12 h-12 bg-gray-200 rounded-full ${shimmer}`} />

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className={`h-4 bg-gray-200 rounded ${shimmer} w-3/4`} />
          <div className={`h-3 bg-gray-200 rounded ${shimmer} w-1/2`} />
        </div>

        {/* Action/Price */}
        <div className={`h-8 w-20 bg-gray-200 rounded ${shimmer}`} />
      </div>
    </div>
  );
}

// Stats/Dashboard Skeleton
export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className={`h-4 bg-gray-200 rounded ${shimmer} w-1/2 mb-3`} />
          <div className={`h-8 bg-gray-200 rounded ${shimmer} w-3/4`} />
        </div>
      ))}
    </div>
  );
}

// Grid Skeleton (for inventory/marketplace grids)
export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Full Page Skeleton
export function SkeletonPage() {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-3">
        <div className={`h-8 bg-gray-200 rounded ${shimmer} w-1/3`} />
        <div className={`h-4 bg-gray-200 rounded ${shimmer} w-1/2`} />
      </div>

      {/* Stats */}
      <SkeletonStats />

      {/* Grid */}
      <SkeletonGrid count={6} />
    </div>
  );
}
