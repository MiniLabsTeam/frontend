"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Dices, Package, Trophy, Star } from "lucide-react";

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "home", Icon: Home, label: "Home", path: "/dashboard" },
    { id: "gacha", Icon: Dices, label: "GACHA", path: "/gacha" },
    { id: "quest", Icon: Star, label: "Quest", path: "/quest" },
    { id: "invent", Icon: Package, label: "Invent", path: "/inventory" },
    { id: "predict", Icon: Trophy, label: "Predict", path: "/prediction" },
  ];

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname === path || pathname.startsWith(path + "/");
  };

  const handleNav = (item) => {
    if (item.external) {
      window.open(item.external, "_blank");
    } else if (item.path) {
      router.push(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-t-3xl shadow-2xl border-t-4 border-yellow-400">
        {/* Hazard stripes */}
        <div className="h-3 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#ffeb3b_10px,#ffeb3b_20px)] opacity-80" />

        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const IconComponent = item.Icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className={`flex flex-col items-center gap-1 min-w-[52px] transition-all ${
                  active
                    ? "transform -translate-y-2"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <div
                  className={`${
                    active
                      ? "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      : ""
                  } ${item.external ? "text-green-800" : "text-gray-900"}`}
                >
                  <IconComponent
                    size={24}
                    strokeWidth={2.5}
                    className={item.external ? "text-green-900" : "text-gray-900"}
                  />
                </div>
                <span className={`text-xs font-bold ${item.external ? "text-green-900" : "text-gray-900"}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
