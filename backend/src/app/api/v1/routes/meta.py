from fastapi import APIRouter


router = APIRouter(tags=["meta"])


@router.get("/meta")
def meta():
    return {"app": "erp-backend", "api_version": "v1"}

