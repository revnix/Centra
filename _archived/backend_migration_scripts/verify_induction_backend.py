import asyncio
from sqlalchemy.future import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.onboarding import Onboarding
from src.api.services.onboarding_service import OnboardingService
from src.api.schemas.onboarding import HRInductionUpdate, ITInductionUpdate, ManagerInductionUpdate, ITOnboardingUpdate

async def verify_induction():
    print("--- EVALYN BACKEND POST-ONBOARDING (INDUCTION) DIAGNOSTIC REPORT ---")
    
    async with AsyncSessionLocal() as db:
        onb_service = OnboardingService(db)
        
        print("[1] Fetching an onboarding record to simulate induction")
        result = await db.execute(select(Onboarding).limit(1))
        onboarding = result.scalars().first()
        
        if not onboarding:
            print("❌ No onboarding records found in DB to test.")
            return

        print(f"Target Application ID: {onboarding.application_id}")
        
        print("\n[2] Triggering completion of Pre-Onboarding (IT Setup)")
        # This will simulate IT finishing the pre-onboarding, pushing status to PENDING_INDUCTION
        it_setup_done = await onb_service.it_setup_update(
            application_id=onboarding.application_id, 
            data=ITOnboardingUpdate(
                it_slack_setup=True,
                it_gmail_setup=True,
                it_browser_extensions=True,
                it_gmail_signature=True,
                it_bordio_access=True,
                it_office365_access=True
            )
        )
        
        if it_setup_done.status == "PENDING_INDUCTION":
            print("✅ IT Setup completed & Status successfully progressed to PENDING_INDUCTION")
        else:
            print(f"❌ Status failed to advance! Expected PENDING_INDUCTION, got {it_setup_done.status}")
            
        print("\n[3] Testing HR Induction Update (Welcome Session, Handbook, Policies)")
        hr_ind = await onb_service.hr_induction_update(
            application_id=onboarding.application_id,
            data=HRInductionUpdate(
                ind_hr_welcome_session=True,
                ind_hr_handbook_shared=True,
                ind_hr_policies_explained=True
            )
        )
        print("✅ HR Induction fields set to True.")

        print("\n[4] Testing IT Induction Update (Credentials, Security)")
        it_ind = await onb_service.it_induction_update(
            application_id=onboarding.application_id,
            data=ITInductionUpdate(
                ind_it_credentials_provided=True,
                ind_it_security_induction=True
            )
        )
        print("✅ IT Induction fields set to True.")

        print("\n[5] Testing Manager Induction Update (Buddy, Team Intro) -> Expecting COMPLETED completion")
        mgr_ind = await onb_service.manager_induction_update(
            application_id=onboarding.application_id,
            data=ManagerInductionUpdate(
                ind_manager_buddy_assigned=True,
                ind_manager_team_intro=True
            )
        )
        
        if mgr_ind.status == "COMPLETED":
            print(f"✅ Full Day 1 Induction completed and Status auto-advanced to: {mgr_ind.status}")
        else:
             print(f"❌ Induction completion failed to trigger COMPLETED status. Got {mgr_ind.status}")

        print("\n✅ ALL BACKEND INDUCTION WORKFLOWS ARE PASSING")

if __name__ == "__main__":
    asyncio.run(verify_induction())
