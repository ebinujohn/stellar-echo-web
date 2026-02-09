"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  PhoneCall,
  Settings,
  Mic,
  Database,
  Smartphone,
} from "lucide-react";

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Navigation" },
  { name: "Calls", href: "/calls", icon: Phone, group: "Navigation" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, group: "Navigation" },
  { name: "Agents", href: "/agents", icon: PhoneCall, group: "Navigation" },
  { name: "RAG Settings", href: "/settings/rag", icon: Database, group: "Settings" },
  { name: "Voice Settings", href: "/settings/voice", icon: Mic, group: "Settings" },
  { name: "Phone Settings", href: "/settings/phone", icon: Smartphone, group: "Settings" },
  { name: "General Settings", href: "/settings", icon: Settings, group: "Settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  const navPages = pages.filter((p) => p.group === "Navigation");
  const settingsPages = pages.filter((p) => p.group === "Settings");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navPages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => runCommand(() => router.push(page.href))}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          {settingsPages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => runCommand(() => router.push(page.href))}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
