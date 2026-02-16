"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";

interface SidebarContextValue {
  /** Whether the sidebar is currently open (mobile) or expanded (desktop) */
  isOpen: boolean;
  /** Whether the sidebar is collapsed to icon-only mode (desktop) */
  isCollapsed: boolean;
  /** Toggle sidebar open/closed state */
  toggle: () => void;
  /** Open the sidebar */
  open: () => void;
  /** Close the sidebar */
  close: () => void;
  /** Toggle collapsed mode (desktop only) */
  toggleCollapsed: () => void;
  /** Set collapsed mode explicitly */
  setCollapsed: (collapsed: boolean) => void;
  /** Whether we're on a mobile viewport */
  isMobile: boolean;
  /** Whether focus mode is active (hides sidebar, navbar, and page chrome) */
  isFocusMode: boolean;
  /** Enter focus mode */
  enterFocusMode: () => void;
  /** Exit focus mode */
  exitFocusMode: () => void;
  /** Toggle focus mode */
  toggleFocusMode: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined,
);

const MOBILE_BREAKPOINT = 768; // md breakpoint
const STORAGE_KEY = "sidebar-collapsed";

interface SidebarProviderProps {
  children: React.ReactNode;
  /** Default collapsed state for desktop */
  defaultCollapsed?: boolean;
}

// Custom hook to track viewport size
function useIsMobile(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("resize", callback);
    return () => window.removeEventListener("resize", callback);
  }, []);

  const getSnapshot = useCallback(() => {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }, []);

  const getServerSnapshot = useCallback(() => {
    return false; // Default to desktop on server
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Custom event name for same-tab localStorage notifications
const COLLAPSED_CHANGE_EVENT = "sidebar-collapsed-change";

// Helper to write collapsed state and notify subscribers
function setStoredCollapsed(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value));
  window.dispatchEvent(new Event(COLLAPSED_CHANGE_EVENT));
}

// Hydration-safe hook: reads collapsed state from localStorage via useSyncExternalStore
// Returns defaultCollapsed on server, actual stored value on client (no hydration mismatch)
function useCollapsedState(defaultCollapsed: boolean) {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener(COLLAPSED_CHANGE_EVENT, callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(COLLAPSED_CHANGE_EVENT, callback);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : defaultCollapsed;
  }, [defaultCollapsed]);

  const getServerSnapshot = useCallback(() => {
    return defaultCollapsed;
  }, [defaultCollapsed]);

  const isCollapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setIsCollapsed = useCallback(
    (valueOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      const current = localStorage.getItem(STORAGE_KEY);
      const currentValue =
        current !== null ? current === "true" : defaultCollapsed;
      const newValue =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(currentValue)
          : valueOrUpdater;
      setStoredCollapsed(newValue);
    },
    [defaultCollapsed],
  );

  return [isCollapsed, setIsCollapsed] as const;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  // Mobile sidebar open state
  const [isOpen, setIsOpen] = useState(false);
  // Desktop collapsed state - hydration-safe via useSyncExternalStore + localStorage
  const [isCollapsed, setIsCollapsed] = useCollapsedState(defaultCollapsed);
  // Track if we're on mobile
  const isMobile = useIsMobile();

  // Focus mode state (transient, not persisted)
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside sidebar
      if (!target.closest("[data-sidebar]")) {
        setIsOpen(false);
      }
    };

    // Add slight delay to avoid immediate close on toggle button click
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isMobile, isOpen]);

  // Close sidebar on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile, setIsCollapsed]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggleCollapsed = useCallback(
    () => setIsCollapsed((prev) => !prev),
    [setIsCollapsed],
  );
  const setCollapsedState = useCallback(
    (collapsed: boolean) => setIsCollapsed(collapsed),
    [setIsCollapsed],
  );
  const enterFocusMode = useCallback(() => setIsFocusMode(true), []);
  const exitFocusMode = useCallback(() => setIsFocusMode(false), []);
  const toggleFocusMode = useCallback(
    () => setIsFocusMode((prev) => !prev),
    [],
  );

  const value: SidebarContextValue = {
    isOpen,
    isCollapsed,
    toggle,
    open,
    close,
    toggleCollapsed,
    setCollapsed: setCollapsedState,
    isMobile,
    isFocusMode,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
