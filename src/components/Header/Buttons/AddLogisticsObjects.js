import { useEffect, useRef, useState } from "react";
import Select from 'react-select';
import iri_description from '@/ontology/iri-description';
import useInternalStore from '@/store';
import listObjects from '@/helpers/listObjects';

const PAGE_SIZE = 10;

const browseError = (result) => {
    if (result.parseError) return "Server returned an unexpected response";
    if (result.status == 401) return "Unauthorized — check the server token in the settings";
    if (result.status == 0) return "Server not reachable";
    return "Listing not supported by this server (HTTP " + result.status + ")";
}

const AddLogisticsObjects = () => {
    const [showPopup, setShowPopup] = useState(false)
    const { setAddNodeFlag, setSearchbarValue } = useInternalStore()

    const [LOType, setLOType] = useState("");
    const [server, setServer] = useState("");
    const [createdLO, setCreatedLO] = useState("")
    const [browseResult, setBrowseResult] = useState(null)
    const [browseOffset, setBrowseOffset] = useState(0)
    const [browsing, setBrowsing] = useState(false)
    const browseSeq = useRef(0)
    const { servers } = useInternalStore()

    const LOOptions = Object.values(iri_description).filter((item) => item.Type == 'Class').map((item) => { return { label: item.Label, value: item.Label } })
    const serverOptions = servers.map((item) => { return { label: item.org_name, value: item.host, protocol: item.protocol, token:item.token } })


    useEffect(() => {
        setLOType("")
        setServer("")
        setCreatedLO("")
    }, [showPopup])

    useEffect(() => {
        browseSeq.current++
        setBrowseResult(null)
        setBrowseOffset(0)
        setBrowsing(false)
    }, [showPopup, LOType, server])

    const createLO = async () => {
        let body_obj = {
            "@context": {
                "cargo": "https://onerecord.iata.org/ns/cargo#",
            },
            "@type": "cargo:" + LOType.value
        }
        let prom = fetch(server.protocol + '://' + server.value + "/logistics-objects", {
            method: "POST",
            headers: {
                "Content-Type": "application/ld+json",
                "Accept": "application/ld+json",
                "Authorization": "Bearer " + server.token
            },
            body: JSON.stringify(body_obj)
        })
        let res = await prom;
        if (res.status == 201) {
            //pass created lo
            let header_obj = {};
            res.headers.forEach((val, key) => { header_obj[key] = val })
            setCreatedLO(header_obj['location'])
            setSearchbarValue(header_obj['location'])
            setAddNodeFlag(true)
        }

    }

    const browse = async (offset) => {
        const seq = ++browseSeq.current
        setBrowsing(true)
        const result = await listObjects({
            protocol: server.protocol,
            host: server.value,
            token: server.token,
            typeIri: "https://onerecord.iata.org/ns/cargo#" + LOType.value,
            limit: PAGE_SIZE + 1,
            offset: offset
        })
        if (seq !== browseSeq.current) return
        setBrowsing(false)
        setBrowseOffset(offset)
        setBrowseResult({ ...result, hasMore: result.items.length > PAGE_SIZE, items: result.items.slice(0, PAGE_SIZE) })
    }

    const placeObject = (uri) => {
        setSearchbarValue(uri)
        setAddNodeFlag(true)
        setShowPopup(false)
    }

    return (
        <>
            <div className='has-tooltip '>
                <span className='tooltip rounded shadow-lg p-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 mt-12 -ml-10  duration-200 transition-colors' >Add Logistics Object</span>
                <button onClick={() => { setShowPopup(!showPopup) }}
                    className="rotate-45 p-2 bg-violet-400 hover:bg-violet-600 active:bg-violet-800 dark:bg-violet-500 dark:hover:bg-violet-600 dark:active:bg-violet-800 rounded-full mx-1 my-auto text-white  duration-200 transition-all">
                    <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" /></svg>
                </button>
            </div>
            {showPopup &&
                <div className="z-20 absolute w-[60%] h-[60%] top-[10%] left-[20%] ">
                    <div className="block bg-slate-100 m-2 p-4 w-full h-full rounded-3xl  overflow-y-scroll no-scrollbar">
                        <button onClick={() => { setShowPopup(!showPopup) }} className="block ml-auto p-2 bg-violet-400 hover:bg-violet-500 active:bg-violet-600 transition-color duration-200 text-white rounded-full">
                            <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" /></svg>
                        </button>
                        <div className="block bg-slate-200 p-2  m-2 ml-0 w-full rounded-3xl ">
                            <span className="text-xl font-medium pl-1">Create Logistics Object</span>
                            <div className="rounded-b-xl bg-slate-300 p-2">
                                <div className="py-2 grid grid-cols-2 gap-2">
                                    <span>Logistic Object Type</span>
                                    <Select options={LOOptions}
                                        isClearable={true}
                                        isSearchable={true}
                                        onChange={(item) => { setLOType(item ?? "") }}
                                    />
                                    <span>Servers</span>
                                    <Select options={serverOptions}
                                        isClearable={true}
                                        isSearchable={true}
                                        onChange={(item) => { setServer(item ?? "") }}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center justify-center gap-1 bg-violet-300 text-white font-light p-1 rounded-full w-full hover:bg-violet-400 active:bg-violet-500 transition-color duration-200 disabled:opacity-50"
                                        disabled={!LOType || !server}
                                        onClick={createLO}>
                                        <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z" /></svg>
                                        Create
                                    </button>
                                    <button className="flex items-center justify-center gap-1 bg-violet-300 text-white font-light p-1 rounded-full w-full hover:bg-violet-400 active:bg-violet-500 transition-color duration-200 disabled:opacity-50"
                                        disabled={!LOType || !server || browsing}
                                        onClick={() => { browse(0) }}>
                                        <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M280-600v-80h560v80H280Zm0 160v-80h560v80H280Zm0 160v-80h560v80H280ZM160-600q-17 0-28.5-11.5T120-640q0-17 11.5-28.5T160-680q17 0 28.5 11.5T200-640q0 17-11.5 28.5T160-600Zm0 160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520q17 0 28.5 11.5T200-480q0 17-11.5 28.5T160-440Zm0 160q-17 0-28.5-11.5T120-320q0-17 11.5-28.5T160-360q17 0 28.5 11.5T200-320q0 17-11.5 28.5T160-280Z" /></svg>
                                        {browsing ? "Loading…" : "Browse"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {createdLO != '' &&
                            <>
                                <span>Logistics Object Created Successfully</span>
                                <div className="mt-2"><span>{createdLO}</span></div>
                                <div className="flex justify-center">
                                <button onClick={() => { setShowPopup(!showPopup) }} className="w-[30%] mt-2 p-2 bg-violet-400 hover:bg-violet-500 active:bg-violet-600 transition-color duration-200 text-white rounded-full">
                                    Close Window
                                </button>
                                </div>
                            </>
                        }
                        {browseResult &&
                            <div className="block bg-slate-200 p-2  m-2 ml-0 w-full rounded-3xl ">
                                <span className="text-xl font-medium pl-1">{LOType.value} on {server.label}</span>
                                <div className="rounded-b-xl bg-slate-300 p-2">
                                    {!browseResult.ok &&
                                        <span className="block p-2">{browseError(browseResult)}</span>
                                    }
                                    {browseResult.ok && browseResult.items.length == 0 &&
                                        <span className="block p-2">No objects found</span>
                                    }
                                    {browseResult.ok && browseResult.items.map((item) => {
                                        return (
                                            <button key={item.id}
                                                className="block w-full text-left bg-slate-100 hover:bg-violet-100 active:bg-violet-200 rounded-xl p-2 mb-1 transition-color duration-200"
                                                title="Place on canvas"
                                                onClick={() => { placeObject(item.id) }}>
                                                <span className="font-medium mr-2">{item.type}</span>
                                                <span className="text-sm">{item.id.split("/").pop()}</span>
                                            </button>
                                        )
                                    })}
                                    <div className="flex justify-between mt-2">
                                        <button className="bg-violet-300 text-white px-4 py-1 rounded-full hover:bg-violet-400 active:bg-violet-500 transition-color duration-200 disabled:opacity-50"
                                            disabled={browseOffset == 0}
                                            onClick={() => { browse(browseOffset - PAGE_SIZE) }}>
                                            Prev
                                        </button>
                                        <span className="p-1">{browseResult.items.length > 0 ? `${browseOffset + 1} – ${browseOffset + browseResult.items.length}` : ""}</span>
                                        <button className="bg-violet-300 text-white px-4 py-1 rounded-full hover:bg-violet-400 active:bg-violet-500 transition-color duration-200 disabled:opacity-50"
                                            disabled={!browseResult.hasMore}
                                            onClick={() => { browse(browseOffset + PAGE_SIZE) }}>
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>

            }
        </>
    )

}

export default AddLogisticsObjects;
