'use client';

import * as React from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useSyncExternalStore } from 'react';

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
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

const MOBILE_BREAKPOINT = 768; // md breakpoint
const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarProviderProps {
  children: React.ReactNode;
  /** Default collapsed state for desktop */
  defaultCollapsed?: boolean;
}

// Helper to read from localStorage (returns null on server or if not available)
function getStoredCollapsedState(): boolean | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== null ? stored === 'true' : null;
}

// Custom hook to track viewport size
function useIsMobile(): boolean {
  // Subscribe to window resize events
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
  }, []);

  const getSnapshot = useCallback(() => {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }, []);

  const getServerSnapshot = useCallback(() => {
    return false; // Default to desktop on server
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  // Mobile sidebar open state
  const [isOpen, setIsOpen] = useState(false);
  // Desktop collapsed state - initialize from localStorage if available
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = getStoredCollapsedState();
    return stored !== null ? stored : defaultCollapsed;
  });
  // Track if we're on mobile
  const isMobile = useIsMobile();

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside sidebar
      if (!target.closest('[data-sidebar]')) {
        setIsOpen(false);
      }
    };

    // Add slight delay to avoid immediate close on toggle button click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, isOpen]);

  // Close sidebar on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggleCollapsed = useCallback(() => setIsCollapsed((prev) => !prev), []);
  const setCollapsedState = useCallback((collapsed: boolean) => setIsCollapsed(collapsed), []);

  const value: SidebarContextValue = {
    isOpen,
    isCollapsed,
    toggle,
    open,
    close,
    toggleCollapsed,
    setCollapsed: setCollapsedState,
    isMobile,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
