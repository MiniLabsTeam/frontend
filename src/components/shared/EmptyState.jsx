"use client";

import { useRouter } from "next/navigation";

/**
 * EmptyState Component
 * Reusable component for empty states across the app
 *
 * @param {string} icon - Lucide icon component
 * @param {string} title - Main heading
 * @param {string} description - Supporting text
 * @param {string} actionLabel - CTA button text
 * @param {string} actionHref - Route to navigate to
 * @param {function} onAction - Custom action handler (overrides actionHref)
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  iconClassName = "text-gray-400",
  containerClassName = "",
}) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      router.push(actionHref);
    }
  };

  return (
    <div className={`text-center py-12 px-4 ${containerClassName}`}>
      {Icon && (
        <div className="flex justify-center mb-6 animate-in fade-in duration-500">
          <Icon size={64} className={iconClassName} strokeWidth={1.5} />
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-900 mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-100">
        {title}
      </h3>

      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500 delay-200">
          {description}
        </p>
      )}

      {(actionLabel && (actionHref || onAction)) && (
        <button
          onClick={handleAction}
          className="
            px-6 py-3
            bg-gradient-to-r from-orange-500 to-orange-600
            text-white font-semibold rounded-lg
            shadow-lg shadow-orange-500/30
            hover:shadow-xl hover:shadow-orange-500/40
            hover:scale-105
            active:scale-95
            transition-all duration-200
            animate-in slide-in-from-bottom-4 duration-500 delay-300
          "
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
