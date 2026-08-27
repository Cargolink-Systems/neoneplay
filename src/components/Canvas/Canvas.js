import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import ReactFlow, { addEdge, MiniMap, Controls, Background, useReactFlow, Connection, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import LOCard from './LOCard';
import useTabsStore from '@/storeTabs';
import useInternalStore from '@/store';
import FloatingEdge from './Edge/FloatingEdge';
import FloatingConnectionLine from './Edge/FloatingConnectionLine';
import EventPanel from './Events/EventPanel';


const Canvas = ({setRfInstance}) => {
    const activeTab = useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId));
    const { onNodesChange, onEdgesChange, addNode, setViewport } = useTabsStore()
    const highlightIds = useTabsStore((state) => state.highlightIds)
    const edges = activeTab.edges;

    const highlightSet = useMemo(() => new Set(highlightIds), [highlightIds]);
    const nodes = useMemo(() => activeTab.nodes.map((n) => highlightSet.has(n.id)
        ? { ...n, className: 'search-match' }
        : n), [activeTab.nodes, highlightSet]);

    const reactFlowInstance = useReactFlow();
    const rfCanvasRef = useRef(0)
    const { setAddNodeFlag, addNodeFlag, resetSearchbarValue, searchbarValue } = useInternalStore()

    const nodeTypes = useMemo(() => ({ LO: LOCard }), []);
    const edgeTypes = useMemo(() => ({ floating: FloatingEdge }), [])

    const [selectedObjectEvent,setSelectedObjectEvent] = useState('')
 
    const onPaneClick = (event) => {
        if (addNodeFlag) {
            setAddNodeFlag(false)
            const bounds = rfCanvasRef.current.getBoundingClientRect();
            const position = reactFlowInstance.project({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top
            })
            addNode({
                id: searchbarValue,
                type: 'LO',
                dragHandle: '#node-header',
                data: {
                    uri: searchbarValue,
                },
                position: position,
            })
            resetSearchbarValue();
        }
    }

    const test = (event, node) => {
        if(event.target.id.includes('logisticEvent')) {
            setSelectedObjectEvent(node.data.uri)
        }
    }


    return (
        <div className="absolute left-0 top-0 w-full h-full z-0 "
            style={{ flexDirection: "column", display: "flex", flexGrow: 1, height: "100%" }}>
            <ReactFlow className='dark:bg-slate-600 transition-color duration-300 '
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineComponent={FloatingConnectionLine}
                minZoom={0.25}
                onPaneClick={onPaneClick}
                ref={rfCanvasRef}
                style={{ cursor: (addNodeFlag ? "cell" : "") }}
                onInit={setRfInstance}
                onNodeClick={test}
                defaultViewport={activeTab.viewport}
                onMoveEnd={(event, viewport) => setViewport(activeTab.id, viewport)}
            >
                <MiniMap />
                <Controls />

                <Background color='black' variant='dots' />
            </ReactFlow>
            {addNodeFlag &&
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-violet-500 text-white text-sm px-4 py-2 rounded-full shadow-lg">
                    Click anywhere on the canvas to place the object
                </div>}
            <EventPanel
                selectedObject={selectedObjectEvent}
                setSelectedObject={setSelectedObjectEvent}
            />
        </div>
    );
};

export default Canvas;
