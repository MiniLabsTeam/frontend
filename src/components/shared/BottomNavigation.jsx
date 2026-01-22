"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "home", icon: "🏠", label: "Home", path: "/dashboard" },
    { id: "marketplace", icon: "🛒", label: "Market", path: "/marketplace" },
    { id: "gacha", icon: "🎰", label: "GACHA", path: "/gacha" },
    { id: "invent", icon: "📦", label: "Invent", path: "/inventory" },
    { id: "profile", icon: "👤", label: "Profile", path: "/profile" },
  ];

  const isActive = (path) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-t-3xl shadow-2xl border-t-4 border-yellow-400">
        {/* Hazard stripes */}
        <div className="h-3 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#ffeb3b_10px,#ffeb3b_20px)] opacity-80" />

        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${
                isActive(item.path)
                  ? "transform -translate-y-2"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <div
                className={`text-2xl ${
                  isActive(item.path)
                    ? "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    : ""
                }`}
              >
                {item.icon}
              </div>
              <span className="text-xs font-bold text-gray-900">
                {item.label}
              </span>
              {isActive(item.path) && (
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
