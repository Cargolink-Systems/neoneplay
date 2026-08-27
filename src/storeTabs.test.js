global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

const useTabsStore = require('./storeTabs').default

describe('tabs', () => {
    beforeEach(() => useTabsStore.getState().resetAllTabs())

    it('starts with at least one tab, active tab pointing at an existing tab', () => {
        const { tabs, activeTabId } = useTabsStore.getState()
        expect(tabs.length).toBeGreaterThan(0)
        expect(tabs.some((t) => t.id === activeTabId)).toBe(true)
    })

    it('addTab appends a new tab, activates it, and gives it a distinct id', () => {
        const before = useTabsStore.getState().tabs.map((t) => t.id)
        const id = useTabsStore.getState().addTab('New one')
        const { tabs, activeTabId } = useTabsStore.getState()
        expect(tabs).toHaveLength(before.length + 1)
        expect(before).not.toContain(id)
        expect(activeTabId).toBe(id)
        expect(tabs.find((t) => t.id === id).name).toBe('New one')
    })

    it('renameTab renames only the target tab', () => {
        const otherId = useTabsStore.getState().tabs[0].id
        const id = useTabsStore.getState().addTab('Original')
        useTabsStore.getState().renameTab(id, 'Renamed')
        const tabs = useTabsStore.getState().tabs
        expect(tabs.find((t) => t.id === id).name).toBe('Renamed')
        expect(tabs.find((t) => t.id === otherId).name).not.toBe('Renamed')
    })

    it('renameTab ignores an empty or whitespace-only name', () => {
        const id = useTabsStore.getState().addTab('Keep me')
        useTabsStore.getState().renameTab(id, '   ')
        expect(useTabsStore.getState().tabs.find((t) => t.id === id).name).toBe('Keep me')
    })

    it('closeTab removes the tab and activates a neighbour when the active tab is closed', () => {
        const first = useTabsStore.getState().tabs[0].id
        const second = useTabsStore.getState().addTab('Second')
        useTabsStore.getState().closeTab(second)
        const { tabs, activeTabId } = useTabsStore.getState()
        expect(tabs.map((t) => t.id)).not.toContain(second)
        expect(activeTabId).toBe(first)
    })

    it('closeTab on the only tab leaves exactly one fresh, empty tab', () => {
        const only = useTabsStore.getState().tabs[0].id
        useTabsStore.getState().addNode({ id: 'x', type: 'LO', data: { uri: 'x' }, position: { x: 0, y: 0 } })
        useTabsStore.getState().closeTab(only)
        const { tabs, activeTabId } = useTabsStore.getState()
        expect(tabs).toHaveLength(1)
        expect(tabs[0].nodes).toHaveLength(0)
        expect(activeTabId).toBe(tabs[0].id)
    })

    it('addNode only touches the active tab, leaving other tabs referentially identical', () => {
        const firstId = useTabsStore.getState().tabs[0].id
        const secondId = useTabsStore.getState().addTab('Second')
        useTabsStore.getState().setActiveTab(firstId)
        const secondTabBefore = useTabsStore.getState().tabs.find((t) => t.id === secondId)

        useTabsStore.getState().addNode({ id: 'n1', type: 'LO', data: { uri: 'n1' }, position: { x: 0, y: 0 } })

        const { tabs } = useTabsStore.getState()
        expect(tabs.find((t) => t.id === firstId).nodes).toHaveLength(1)
        expect(tabs.find((t) => t.id === secondId).nodes).toHaveLength(0)
        expect(tabs.find((t) => t.id === secondId)).toBe(secondTabBefore)
    })

    it('onEdgesChange with a remove change drops the edge from the active tab only', () => {
        const firstId = useTabsStore.getState().tabs[0].id
        const secondId = useTabsStore.getState().addTab('Second')
        useTabsStore.getState().setActiveTab(secondId)
        useTabsStore.getState().onEdgesChange([{ type: 'add', item: { id: 'e1', source: 'a', target: 'b' } }])
        useTabsStore.getState().onEdgesChange([{ type: 'remove', id: 'e1' }])
        const tabs = useTabsStore.getState().tabs
        expect(tabs.find((t) => t.id === secondId).edges).toHaveLength(0)
        expect(tabs.find((t) => t.id === firstId).edges).toHaveLength(0)
    })

    it('setActiveTab then addNode writes into the newly active tab', () => {
        const firstId = useTabsStore.getState().tabs[0].id
        const secondId = useTabsStore.getState().addTab('Second')
        useTabsStore.getState().setActiveTab(firstId)
        useTabsStore.getState().addNode({ id: 'n1', type: 'LO', data: { uri: 'n1' }, position: { x: 0, y: 0 } })
        const tabs = useTabsStore.getState().tabs
        expect(tabs.find((t) => t.id === firstId).nodes).toHaveLength(1)
        expect(tabs.find((t) => t.id === secondId).nodes).toHaveLength(0)
    })
})
