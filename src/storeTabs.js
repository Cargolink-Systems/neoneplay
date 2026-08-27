import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import initialTabs from "@/demo/initialNodes";

let counter = 0;
const makeTabId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

const emptyTab = (name) => ({
    id: makeTabId(),
    name,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
});

const mapActiveTab = (state, updateFn) => ({
    tabs: state.tabs.map((t) => t.id === state.activeTabId ? updateFn(t) : t),
});

const useTabsStore = create(
    persist(
        (set, get) => ({
            ...initialTabs(),

            addTab: (name) => {
                const tab = emptyTab(name || `Canvas ${get().tabs.length + 1}`);
                set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
                return tab.id;
            },

            closeTab: (id) => set((state) => {
                const index = state.tabs.findIndex((t) => t.id === id);
                if (index === -1) return state;
                const remaining = state.tabs.filter((t) => t.id !== id);
                if (remaining.length === 0) {
                    const fresh = emptyTab("Canvas 1");
                    return { tabs: [fresh], activeTabId: fresh.id };
                }
                if (state.activeTabId !== id) return { tabs: remaining };
                const neighbour = state.tabs[index - 1] || state.tabs[index + 1];
                return { tabs: remaining, activeTabId: neighbour.id };
            }),

            renameTab: (id, name) => {
                const trimmed = (name || "").trim();
                if (!trimmed) return;
                set((state) => ({ tabs: state.tabs.map((t) => t.id === id ? { ...t, name: trimmed } : t) }));
            },

            setActiveTab: (id) => set((state) => state.tabs.some((t) => t.id === id) ? { activeTabId: id } : state),

            onNodesChange: (changes) => set((state) => mapActiveTab(state, (t) => ({ ...t, nodes: applyNodeChanges(changes, t.nodes) }))),

            onEdgesChange: (changes) => set((state) => mapActiveTab(state, (t) => ({ ...t, edges: applyEdgeChanges(changes, t.edges) }))),

            addNode: (node) => set((state) => mapActiveTab(state, (t) => ({ ...t, nodes: [...t.nodes, node] }))),

            setViewport: (id, viewport) => set((state) => ({ tabs: state.tabs.map((t) => t.id === id ? { ...t, viewport } : t) })),

            resetAllTabs: () => set(() => ({ ...initialTabs() })),

            // Search index — not persisted (see partialize below).
            searchIndex: {},
            setNodeIndex: (uri, entry) => set((state) => ({ searchIndex: { ...state.searchIndex, [uri]: entry } })),
            highlightIds: [],
            setHighlight: (ids) => set(() => ({ highlightIds: ids })),
        }),
        {
            name: "canvas-storage",
            version: 1,
            partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
        }
    )
);

export default useTabsStore;
