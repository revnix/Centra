from fastapi import APIRouter

# Phase 1: no legacy org module exists yet.
router = APIRouter(prefix="/org", tags=["org"])
