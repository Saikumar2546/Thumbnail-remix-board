"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Sparkles, Folder, Settings, Shapes, Type, UploadCloud, ImageIcon, Film, Palette } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navGroups = [
  { label: "Main", items: [{ id: "home", name: "Home", href: "/", icon: Home }, { id: "projects", name: "Projects", href: "/projects", icon: Folder }, { id: "templates", name: "Templates", href: "/templates", icon: Layers }] },
  { label: "Editor", items: [{ id: "elements", name: "Elements", href: "/elements", icon: Shapes }, { id: "text", name: "Text", href: "/text", icon: Type }, { id: "uploads", name: "Uploads", href: "/uploads", icon: UploadCloud }] }
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col py-2">
      {navGroups.map(group => (
        <SidebarGroup key={group.label}>
          <p className="text-xs text-muted-foreground font-semibold px-3 py-2">{group.label}</p>
          <SidebarMenu>
            {group.items.map(item => (
              <SidebarMenuItem key={item.id}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.name}>
                    <a><item.icon className="mr-3 h-5 w-5" /> <span>{item.name}</span></a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  );
}
