"use client";

/**
 * Animated Card Component
 * Card with hover and interaction animations
 */

export default function AnimatedCard({
  children,
  onClick,
  hoverable = true,
  className = "",
  ...props
}) {
  const hoverStyles = hoverable
    ? "hover:scale-105 hover:shadow-xl cursor-pointer"
    : "";

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200
        shadow-lg
        transition-all duration-300
        ${hoverStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Animated Container - for page-level animations
 */
export function AnimatedContainer({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Slide Up Animation wrapper
 */
export function SlideUp({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`animate-slide-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Scale In Animation wrapper
 */
export function ScaleIn({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`animate-scale-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
