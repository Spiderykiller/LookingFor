"use client";

import { Home, PlusSquare, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      label: "Feed",
      icon: Home,
      path: "/",
    },
    {
      label: "Post",
      icon: PlusSquare,
      path: "/post",
    },
    {
      label: "Profile",
      icon: User,
      path: "/profile",
    },
  ];

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0
        bg-[var(--bg)]
        backdrop-blur-md
        border-t border-transparent
        shadow-[0_-10px_30px_rgba(0,0,0,0.15)]
        h-16
        flex
        z-50
      "
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;

        return (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            className={`
              flex-1
              flex
              flex-col
              items-center
              justify-center
              text-[10px]
              uppercase
              tracking-wider
              transition-all
              duration-200
              active:scale-95
              ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--text)] opacity-70 hover:opacity-100"
              }
            `}
          >
            <Icon
              size={20}
              strokeWidth={1.8}
              className={`
                mb-1
                transition-all
                duration-200
                ${isActive ? "scale-110" : ""}
              `}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}