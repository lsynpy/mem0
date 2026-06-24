#!/usr/bin/env python3
"""Apply PR #5619 route aliases to server/main.py during Docker build."""
import re, sys

path = sys.argv[1]

with open(path) as f:
    content = f.read()

# Step 1: Add entity route imports
content = content.replace(
    'from routers import requests as requests_router',
    'from routers import requests as requests_router\nfrom routers.entities import EntityType, delete_entity, list_entities'
)

# Step 2: Insert entity route aliases AFTER the router include line
content = content.replace(
    "app.include_router(requests_router.router)",
    "app.include_router(requests_router.router)\n\n"
    '@app.get("/v1/entities/", include_in_schema=False)\n'
    "def v1_list_entities(_auth=Depends(verify_auth)):\n"
    '    """List entities (SDK compatibility alias)."""\n'
    "    return list_entities(_auth=_auth)\n"
    "\n"
    '@app.delete("/v2/entities/{entity_type}/{entity_id}/", include_in_schema=False)\n'
    "def v2_delete_entity(entity_type: EntityType, entity_id: str, _auth=Depends(require_admin)):\n"
    '    """Delete entity (SDK compatibility alias)."""\n'
    "    return delete_entity(entity_type=entity_type, entity_id=entity_id, _auth=_auth)"
)

# Step 3: Insert ping + dispatcher + add alias before add_memory decorator
old = '@app.post("/memories", summary="Create memories")\ndef add_memory(memory_create: MemoryCreate'
new = ('@app.get("/v1/ping/", include_in_schema=False)\n'
'def ping(_auth=Depends(verify_auth)):\n'
'    """Health check for SDK compatibility."""\n'
'    return {"status": "ok", "org_id": "self-hosted", "project_id": "default", "user_email": "self-hosted@local"}\n'
'\n'
'\n'
'@app.post("/v3/memories/", include_in_schema=False)\n'
'@app.post("/v1/memories/", include_in_schema=False)\n'
'async def v3_memories_dispatch(request: Request, _auth=Depends(verify_auth)):\n'
'    """Route POST /v1/v3/memories/ to add or get_all based on body content."""\n'
'    body = await request.json()\n'
'    if "messages" in body:\n'
'        memory_create = MemoryCreate(**body)\n'
'        return add_memory(memory_create, _auth=_auth)\n'
'    user_id = body.get("user_id")\n'
'    run_id = body.get("run_id")\n'
'    agent_id = body.get("agent_id")\n'
'    return get_all_memories(request, user_id=user_id, run_id=run_id, agent_id=agent_id, _auth=_auth)\n'
'\n'
'\n'
'@app.post("/v3/memories/add/", include_in_schema=False)\n'
'@app.post("/v1/memories/add/", include_in_schema=False)\n'
'@app.post("/memories", summary="Create memories")\n'
'def add_memory(memory_create: MemoryCreate')
content = content.replace(old, new)

# Step 4: Add versioned route aliases for other functions
replacements = [
    ('@app.get("/memories", summary="Get memories")\n'
     'def get_all_memories(',
     '@app.get("/v1/memories/", include_in_schema=False)\n'
     '@app.get("/memories", summary="Get memories")\n'
     'def get_all_memories('),
    ('@app.get("/memories/{memory_id}", summary="Get a memory")\n'
     'def get_memory(memory_id: str',
     '@app.get("/v1/memories/{memory_id}/", include_in_schema=False)\n'
     '@app.get("/memories/{memory_id}", summary="Get a memory")\n'
     'def get_memory(memory_id: str'),
    ('@app.post("/search", summary="Search memories")\n'
     'def search_memories(',
     '@app.post("/v3/memories/search/", include_in_schema=False)\n'
     '@app.post("/search", summary="Search memories")\n'
     'def search_memories('),
    ('@app.put("/memories/{memory_id}", summary="Update a memory")\n'
     'def update_memory(memory_id: str',
     '@app.put("/v1/memories/{memory_id}/", include_in_schema=False)\n'
     '@app.put("/memories/{memory_id}", summary="Update a memory")\n'
     'def update_memory(memory_id: str'),
    ('@app.get("/memories/{memory_id}/history", summary="Get memory history")\n'
     'def memory_history(memory_id: str',
     '@app.get("/v1/memories/{memory_id}/history/", include_in_schema=False)\n'
     '@app.get("/memories/{memory_id}/history", summary="Get memory history")\n'
     'def memory_history(memory_id: str'),
    ('@app.delete("/memories/{memory_id}", summary="Delete a memory", response_model=MessageResponse)\n'
     'def delete_memory(memory_id: str',
     '@app.delete("/v1/memories/{memory_id}/", include_in_schema=False)\n'
     '@app.delete("/memories/{memory_id}", summary="Delete a memory", response_model=MessageResponse)\n'
     'def delete_memory(memory_id: str'),
    ('@app.delete("/memories", summary="Delete all memories", response_model=MessageResponse)\n'
     'def delete_all_memories(',
     '@app.delete("/v1/memories/", include_in_schema=False)\n'
     '@app.delete("/memories", summary="Delete all memories", response_model=MessageResponse)\n'
     'def delete_all_memories('),
    ('@app.post("/reset", summary="Reset all memories")\n'
     'def reset_memory(',
     '@app.post("/v1/reset/", include_in_schema=False)\n'
     '@app.post("/reset", summary="Reset all memories")\n'
     'def reset_memory('),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
    else:
        print(f'WARNING: Could not find pattern: {old.split(chr(10))[0][:80]}', file=sys.stderr)

with open(path, 'w') as f:
    f.write(content)

print('Route aliases applied successfully')
