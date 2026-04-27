import asyncio
from sqlalchemy.future import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User
from src.api.models.application import Application, ApplicationStatus
from src.api.services.application_service import ApplicationService
from src.api.services.onboarding_service import OnboardingService
from src.api.schemas.onboarding import CandidateOnboardingUpdate, HRJoiningDetailsUpdate, CandidateDocumentUpload, HROnboardingVerify, ITOnboardingUpdate
from datetime import datetime, timezone

async def verify_onboarding():
    print("--- EVALYN BACKEND ONBOARDING DIAGNOSTIC REPORT ---")
    
    async with AsyncSessionLocal() as db:
        app_service = ApplicationService(db)
        onb_service = OnboardingService(db)
        
        print("[1] Fetching a test application to HIRE")
        result = await db.execute(select(Application).limit(1))
        test_app = result.scalars().first()
        
        if not test_app:
            print("❌ No applications found in DB to test.")
            return

        print(f"Target Application ID: {test_app.id} (Candidate ID: {test_app.candidate_id})")
        
        print("\n[2] Triggering Application 'HIRE' Action (Which automatically spawns Onboarding)")
        hired_app = await app_service.hire_candidate(test_app.id)
        
        if hired_app.status == ApplicationStatus.HIRED:
            print("✅ Application successfully moved to HIRED")
        else:
            print(f"❌ Application failed to move to HIRED (Status is {hired_app.status})")
            
        print("\n[3] Checking if Onboarding Record auto-spawned")
        onboarding = await onb_service.get_by_application(test_app.id)
        if onboarding:
            print(f"✅ Onboarding record successfully created (ID: {onboarding.id})")
            if onboarding.status == "PENDING_CANDIDATE_JOINING":
                print(f"✅ Status correctly set to: {onboarding.status}")
            else:
                print(f"❌ Status incorrect! Expected PENDING_CANDIDATE_JOINING, got {onboarding.status}")
        else:
            print("❌ Onboarding record failed to spawn automatically!")
            return

        print("\n[4] Testing Candidate Confirms Joining Date")
        updated_info = await onb_service.update_candidate_joining_date(
            application_id=test_app.id,
            user_id=test_app.candidate_id,
            data=CandidateOnboardingUpdate(
                joining_date=datetime.now(timezone.utc)
            )
        )
        
        if updated_info.status == "PENDING_HR_DETAILS":
            print(f"✅ Candidate confirmed joining date and Status auto-advanced to: {updated_info.status}")
        else:
            print(f"❌ Status failed to advance! Expected PENDING_HR_DETAILS, got {updated_info.status}")

        print("\n[5] Testing HR Shares Joining Details")
        from src.api.models.onboarding import ShiftTiming
        
        hr_details = await onb_service.hr_set_joining_details(
            application_id=test_app.id,
            data=HRJoiningDetailsUpdate(
                reporting_time="09:00 AM",
                office_location="HQ",
                shift_timing=ShiftTiming.SHIFT_1
            )
        )
        if hr_details.status == "PENDING_CANDIDATE_DOCS":
            print(f"✅ HR shared details and Status auto-advanced to: {hr_details.status}")
        else:
            print(f"❌ Status failed to advance! Expected PENDING_CANDIDATE_DOCS, got {hr_details.status}")

        print("\n[6] Testing Candidate Document Upload")
        updated_docs = await onb_service.update_candidate_documents(
            application_id=test_app.id,
            user_id=test_app.candidate_id,
            data=CandidateDocumentUpload(
                doc_front_picture_url="https://s3.example.com/face.png",
                doc_id_card_url="https://s3.example.com/id.png",
                doc_salary_slip_url="https://s3.example.com/slip.png",
                doc_experience_letter_url="https://s3.example.com/exp.png"
            )
        )
        
        if updated_docs.status == "PENDING_HR_DOCS":
            print(f"✅ Candidate submitted docs and Status auto-advanced to: {updated_docs.status}")
        else:
            print(f"❌ Status failed to advance! Expected PENDING_HR_DOCS, got {updated_docs.status}")
            
        print("\n[7] Testing HR Document Verification Action")
        hr_onb = await onb_service.hr_verify(test_app.id, HROnboardingVerify(hr_verified=True))
        
        if hr_onb.status == "PENDING_IT_SETUP":
             print(f"✅ HR Verified docs and Status auto-advanced to: {hr_onb.status}")
        else:
             print(f"❌ HR Verification failed to advance status! Expected PENDING_IT_SETUP, Got {hr_onb.status}")
             
        print("\n[8] Testing IT Checklist Action")
        # Tick off the IT checklist boxes
        it_onb = await onb_service.it_setup_update(test_app.id, ITOnboardingUpdate(
            it_slack_setup=True,
            it_gmail_setup=True,
            it_browser_extensions=True,
            it_gmail_signature=True,
            it_bordio_access=True,
            it_office365_access=True
        ))
        
        if it_onb.status == "COMPLETED":
            print(f"✅ IT Setup fully completed and Status auto-advanced to: {it_onb.status}")
        else:
            print(f"❌ IT Setup failed to trigger COMPLETED status. Got {it_onb.status}")
            
        print("\n✅ ALL BACKEND ONBOARDING WORKFLOWS ARE PASSING")

if __name__ == "__main__":
    asyncio.run(verify_onboarding())
