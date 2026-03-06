"use client";

import { Home, PlusSquare, User, Users, MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function BottomNav() {
  const pathname        = usePathname();
  const router          = useRouter();
  const { data: session } = useSession();
  const [unread, setUnread] = useState(0);

  // Poll unread count every 10s when logged in
  useEffect(() => {
    if (!session?.user) return;

    const fetchUnread = async () => {
      try {
        const res  = await fetch("/api/conversations/unread");
        const data = await res.json();
        setUnread(data.count ?? 0);
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Hide on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  const navItems = [
    { label: "Feed",      icon: Home,          path: "/"          },
    { label: "Community", icon: Users,          path: "/community" },
    { label: "Post",      icon: PlusSquare,     path: "/post"      },
    { label: "Messages",  icon: MessageCircle,  path: "/messages", badge: unread },
    { label: "Profile",   icon: User,           path: "/profile"   },
  ];

  return (
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-[var(--bg)]
      border-t border-[var(--border)]
      shadow-[0_-10px_30px_rgba(0,0,0,0.2)]
      h-16 flex z-50
    ">
      {navItems.map((item) => {
        const isActive = item.path === "/"
          ? pathname === "/"
          : pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            className={`
              flex-1 flex flex-col items-center justify-center relative
              text-[9px] uppercase tracking-widest
              transition-all duration-200 active:scale-95
              ${isActive
                ? "text-[var(--accent)]"
                : "text-[var(--text)] opacity-60 hover:opacity-90"
              }
            `}
          >
            <div className="relative mb-1">
              <Icon
                size={20}
                strokeWidth={1.8}
                className={`transition-all duration-200 ${isActive ? "scale-110" : ""}`}
              />
              {/* Unread badge */}
              {item.badge != null && item.badge > 0 && (
                <span className="
                  absolute -top-1.5 -right-2
                  min-w-[16px] h-4 px-1
                  bg-[var(--accent)] text-white
                  rounded-full text-[9px] font-bold
                  flex items-center justify-center
                  leading-none
                ">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}