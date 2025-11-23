"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Search,
  FileText,
  Briefcase,
  LogOut,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Users,
  Brain,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Image from "next/image";

const sidebarAnimation = {
  menuTrigger:
    "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
  chevron: "transition-transform duration-300",
  menuItem: "transition-all duration-200 hover:translate-x-1",
  logo: "transition-transform duration-300 hover:rotate-12",
  avatar: "transition-all duration-300 hover:scale-110 hover:shadow-lg",
  logoutButton:
    "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
};

interface SubMenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

  const subMenuItems: SubMenuItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pesquisar Candidatos", href: "/candidates/search", icon: Search },
    { name: "Banco de Talentos", href: "/candidates", icon: Users },
    { name: "Minhas Pesquisas", href: "/searches", icon: FileText },
    { name: "Vagas", href: "/jobs", icon: Briefcase },
    { name: "Análise IA", href: "/analysis", icon: Brain },
  ];

  const isActive = (href: string) => router.pathname === href;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-200 justify-center">
        <div className="flex items-center gap-2 ">
          <div className="flex items-center ">
            {/* Artheria Pltaform */}
            <Image
              src={"/icons/logo-sidebar1.svg"}
              width={50}
              height={50}
              alt="logo do sidebar"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full">
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg hover:bg-gray-100",
                sidebarAnimation.menuTrigger
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-gray-900">RecrutaIA</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-gray-500",
                  sidebarAnimation.chevron,
                  !isOpen && "-rotate-90"
                )}
              />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-1.5 space-y-0.5 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {subMenuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 ml-3 text-sm font-medium rounded-lg",
                    sidebarAnimation.menuItem,
                    isActive(item.href)
                      ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  {item.name}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <Separator className="my-2" />

      {/* User section */}
      <div className="p-3">
        <div className="flex items-center mb-2 px-2 group cursor-pointer">
          <div
            className={cn(
              "w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm",
              sidebarAnimation.avatar
            )}
          >
            {session?.user?.name?.[0]?.toUpperCase() ||
              session?.user?.email?.[0]?.toUpperCase() ||
              "U"}
          </div>
          <div className="ml-2.5 flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {session?.user?.name || "Usuário"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 text-sm text-gray-700 hover:bg-gray-100",
            sidebarAnimation.logoutButton
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
