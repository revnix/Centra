from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Any, Dict, Optional
import uuid
import json
import asyncio
from src.flow.main import graph

router = APIRouter()

# In-memory storage for threads (simplification for this fix)
# In a real app, you'd use a checkpointer like Postgres
threads = {}

@router.post("/threads")
async def create_thread():
    """LangGraph SDK creates a thread before running"""
    thread_id = str(uuid.uuid4())
    threads[thread_id] = {"id": thread_id, "metadata": {}}
    return {"thread_id": thread_id}

@router.get("/assistants")
async def list_assistants():
    """LangGraph SDK lists assistants to verify connectivity"""
    return [{"assistant_id": "workflow", "graph_id": "workflow", "name": "Evalyn Workflow"}]

@router.get("/assistants/{assistant_id}")
async def get_assistant(assistant_id: str):
    return {"assistant_id": assistant_id, "graph_id": "workflow"}

@router.post("/threads/{thread_id}/runs/stream")
async def stream_run(thread_id: str, request: Request):
    """
    LangGraph SDK streams the run events.
    Matches the protocol expected by @langchain/langgraph-sdk
    """
    try:
        body = await request.json()
        input_data = body.get("input", {})
        config = body.get("config", {})
        
        # Merge thread_id into config
        config["configurable"] = config.get("configurable", {})
        config["configurable"]["thread_id"] = thread_id

        async def event_generator():
            try:
                # We use graph.astream to get events
                async for event in graph.astream(input_data, config=config, stream_mode="values"):
                    # Protocol: event: <event_name>\ndata: <json>\n\n
                    yield f"event: values\ndata: {json.dumps(event)}\n\n"
                
                # Signal completion
                yield "event: end\ndata: {}\n\n"
            except Exception as e:
                yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/threads/{thread_id}/runs")
async def create_run(thread_id: str, request: Request):
    """LangGraph SDK non-streaming run"""
    body = await request.json()
    input_data = body.get("input", {})
    return await graph.ainvoke(input_data, config={"configurable": {"thread_id": thread_id}})
