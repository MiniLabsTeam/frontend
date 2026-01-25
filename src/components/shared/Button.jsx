"use client";

/**
 * Animated Button Component
 * Button with micro-animations and variants
 */

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyles = `
    font-semibold rounded-lg
    transition-all duration-200
    hover:scale-105 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-orange-500 to-orange-600
      text-white
      shadow-lg shadow-orange-500/30
      hover:shadow-xl hover:shadow-orange-500/40
      focus:ring-orange-500
    `,
    secondary: `
      bg-white border-2 border-orange-500
      text-orange-600
      hover:bg-orange-50
      focus:ring-orange-500
    `,
    ghost: `
      bg-transparent border border-gray-300
      text-gray-700
      hover:bg-gray-50
      focus:ring-gray-500
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600
      text-white
      shadow-lg shadow-red-500/30
      hover:shadow-xl hover:shadow-red-500/40
      focus:ring-red-500
    `,
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
