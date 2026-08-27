import { useEffect, useState } from "react";
import useInternalStore from "@/store";
import useTabsStore from "@/storeTabs";
import useEventListener from "@/hooks/useEventListener";
import isValidUrl from "@/helpers/isValidUrl";
import matchNodes from "@/helpers/matchNodes";

const shortUri = (uri) => String(uri).split("/").slice(-2).join("/");

const Searchbar = ({ reactFlow }) => {
    const [isURI, setIsUri] = useState(false)
    const { setAddNodeFlag, addNodeFlag, searchbarValue, setSearchbarValue, } = useInternalStore()
    const activeTab = useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId))
    const searchIndex = useTabsStore((state) => state.searchIndex)
    const setHighlight = useTabsStore((state) => state.setHighlight)

    const matches = isURI ? [] : matchNodes(activeTab.nodes, searchIndex, searchbarValue)

    const focusNode = (id) => {
        reactFlow && reactFlow.fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.2 })
    }

    const handleSearch = (searchValue) => {
        setSearchbarValue(searchValue);
        if (isValidUrl(searchValue)) {
            // if is uri
            setIsUri(true)
            setHighlight([])
        } else {
            setIsUri(false)
            setHighlight(matchNodes(activeTab.nodes, searchIndex, searchValue))
        }
    };


    useEffect(() => {
        if (searchbarValue == "") {
            setIsUri(false)
        }
    }, [addNodeFlag])

    const showResults = !isURI && searchbarValue.trim() !== ""

    return (
        <div className="relative flex w-1/2 m-auto m-3 rounded-full bg-white border-0 border-slate-200  ">
            <input
                className={`inline w-full p-3 pl-5 text-2xl rounded-3xl focus:outline-none text-xl ${isURI ? "text-violet-400" : "text-violet-950"} `}
                type='text'
                onChange={(e) => { handleSearch(e.target.value) }}
                onKeyDown={(e) => { if (e.key === "Enter" && matches.length > 0) focusNode(matches[0]) }}
                value={searchbarValue}
                placeholder="Search"
            />
            {isURI &&
                <div className={`${isURI ? "" : "w-0"} text-slate-50 text-center font-medium bg-violet-400 hover:bg-violet-600 active:bg-violet-900 dark:bg-violet-500 dark:hover:bg-violet-600 dark:active:bg-violet-900    rounded-full transition-all duration-200 m-2 my-1 px-2`}>
                    <div className="relative flex w-1/12 m-2   items-center align-center">
                        {/* <button className=" text-slate-50 mt-[0.82vh] my-auto"> */}
                        <button
                            onClick={() => { setAddNodeFlag(true) }}
                            className=" flex my-auto mx-auto">Add</button>
                    </div>
                </div>
            }
            {showResults &&
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 rounded-2xl shadow-lg z-20 overflow-hidden">
                    {matches.length === 0 &&
                        <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
                            Nothing matching on this canvas — paste a logistics object URL to add one.
                        </div>
                    }
                    {matches.slice(0, 6).map((id) => {
                        const entry = searchIndex[id]
                        return (
                            <button key={id}
                                onClick={() => focusNode(id)}
                                className="block w-full text-left p-2 hover:bg-violet-100 dark:hover:bg-violet-900 text-sm"
                            >
                                <span className="font-semibold">{(entry && entry.type) || "Object"}</span>
                                <span className="text-slate-500 dark:text-slate-400 ml-2">{shortUri(id)}</span>
                            </button>
                        )
                    })}
                </div>
            }
        </div>

    )
}

export default Searchbar;
