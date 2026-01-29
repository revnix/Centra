from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.schemas.integration import IntegrationResponse
from typing import List

router = APIRouter()

@router.get("/", response_model=List[IntegrationResponse])
async def list_integrations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from src.api.models.integration import UserIntegration
    from sqlalchemy.future import select
    
    user_id = current_user["user"].id
    print(f"DEBUG: list_integrations for user_id={user_id}")
    try:
        from src.api.models.integration import UserIntegration
        from sqlalchemy.future import select
        
        result = await db.execute(
            select(UserIntegration).where(UserIntegration.user_id == user_id)
        )
        integrations = result.scalars().all()
        print(f"DEBUG: found {len(integrations)} integrations")
        for i in integrations:
            print(f"DEBUG: Integration ID={i.id}, Platform={i.platform}")
        return integrations
    except Exception as e:
        print(f"DEBUG: list_integrations error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
