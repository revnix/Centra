import { create } from 'zustand';
import type { CandidateFilters, Notification } from '@/lib/types';

/**
 * UI State Store
 * Manages client-side UI state like sidebar, filters, notifications
 */

interface UIState {
    // Sidebar
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // Filters
    activeFilters: CandidateFilters;
    setFilters: (filters: CandidateFilters) => void;
    clearFilters: () => void;

    // Notifications
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    clearNotification: (id: string) => void;
    clearAllNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Sidebar state
    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (open) => set({ isSidebarOpen: open }),

    // Filters state
    activeFilters: {},
    setFilters: (filters) => set({ activeFilters: filters }),
    clearFilters: () => set({ activeFilters: {} }),

    // Notifications state
    notifications: [],
    addNotification: (notification) =>
        set((state) => ({
            notifications: [
                {
                    ...notification,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    read: false,
                },
                ...state.notifications,
            ],
        })),
    markAsRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            ),
        })),
    clearNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),
    clearAllNotifications: () => set({ notifications: [] }),
}));
