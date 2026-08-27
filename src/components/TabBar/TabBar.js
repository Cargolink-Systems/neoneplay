import { useState } from "react";
import useTabsStore from "@/storeTabs";

const TabBar = () => {
    const { tabs, activeTabId, addTab, closeTab, renameTab, setActiveTab } = useTabsStore()
    const [editingId, setEditingId] = useState(null)
    const [draftName, setDraftName] = useState("")

    const startRename = (tab) => {
        setEditingId(tab.id)
        setDraftName(tab.name)
    }

    const commitRename = () => {
        if (editingId) renameTab(editingId, draftName)
        setEditingId(null)
    }

    return (
        <div className="w-full bg-slate-50 dark:bg-slate-700 flex items-center gap-1 px-2 pb-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <div key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    onDoubleClick={() => startRename(tab)}
                    className={`flex items-center gap-1 rounded-full px-4 py-1 text-sm cursor-pointer whitespace-nowrap transition-all duration-200
                        ${tab.id === activeTabId
                            ? "bg-violet-400 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-violet-100 dark:hover:bg-violet-900"}`}
                >
                    {editingId === tab.id
                        ? <input
                            autoFocus
                            className="bg-transparent border-b border-current outline-none w-24 text-inherit"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename()
                                if (e.key === "Escape") setEditingId(null)
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        : <span>{tab.name}</span>
                    }
                    {tabs.length > 1 &&
                        <button
                            title="Close tab"
                            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                            className="ml-1 leading-none opacity-70 hover:opacity-100"
                        >
                            <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14"><path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" /></svg>
                        </button>
                    }
                </div>
            ))}
            <button
                title="New canvas"
                onClick={() => addTab()}
                className="bg-violet-400 hover:bg-violet-600 active:bg-violet-800 dark:bg-violet-500 dark:hover:bg-violet-600 dark:active:bg-violet-800 rounded-full p-1 text-white transition-all duration-200"
            >
                <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16"><path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z" /></svg>
            </button>
        </div>
    )
}

export default TabBar;
