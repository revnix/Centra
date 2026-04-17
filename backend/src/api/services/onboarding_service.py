import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from src.api.models.onboarding import Onboarding, OnboardingStatus
from src.api.models.application import Application, ApplicationStatus
from src.api.schemas.onboarding import (
    CandidateOnboardingUpdate, 
    HRJoiningDetailsUpdate,
    CandidateDocumentUpload, 
    HROnboardingVerify, 
    ITOnboardingUpdate,
    HRInductionUpdate,
    ITInductionUpdate,
    ManagerInductionUpdate
)

logger = logging.getLogger(__name__)

class OnboardingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_application(self, application_id: int) -> Onboarding | None:
        result = await self.db.execute(
            select(Onboarding).where(Onboarding.application_id == application_id)
        )
        return result.scalars().first()

    async def get_all_onboardings(self) -> list[Onboarding]:
        result = await self.db.execute(select(Onboarding))
        return list(result.scalars().all())

    async def initiate_onboarding(self, application_id: int) -> Onboarding:
        # First ensure application exists and is in correct state
        app_result = await self.db.execute(select(Application).where(Application.id == application_id))
        app = app_result.scalars().first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
            
        # Optional: ensure we only initiate onboarding for HIRED or OFFER accepted applications
        # Update app status to ONBOARDING
        app.status = ApplicationStatus.ONBOARDING
        
        # Check if onboarding already exists
        existing = await self.get_by_application(application_id)
        if existing:
            return existing

        db_obj = Onboarding(
            application_id=application_id,
            user_id=app.candidate_id,
            status=OnboardingStatus.PENDING_CANDIDATE_JOINING
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update_candidate_joining_date(self, application_id: int, user_id: int, data: CandidateOnboardingUpdate) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        if onboarding.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this onboarding record")

        onboarding.joining_date = data.joining_date
        
        # Advance status
        if onboarding.status == OnboardingStatus.PENDING_CANDIDATE_JOINING:
            onboarding.status = OnboardingStatus.PENDING_HR_DETAILS

        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def hr_set_joining_details(self, application_id: int, data: HRJoiningDetailsUpdate) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")

        onboarding.reporting_time = data.reporting_time
        onboarding.office_location = data.office_location
        onboarding.shift_timing = data.shift_timing
        
        if onboarding.status == OnboardingStatus.PENDING_HR_DETAILS:
            onboarding.status = OnboardingStatus.PENDING_CANDIDATE_DOCS

        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def update_candidate_documents(self, application_id: int, user_id: int, data: CandidateDocumentUpload) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        if onboarding.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this onboarding record")
            
        if data.doc_front_picture_url is not None:
            onboarding.doc_front_picture_url = data.doc_front_picture_url
        if data.doc_id_card_url is not None:
            onboarding.doc_id_card_url = data.doc_id_card_url
        if data.doc_salary_slip_url is not None:
            onboarding.doc_salary_slip_url = data.doc_salary_slip_url
        if data.doc_experience_letter_url is not None:
            onboarding.doc_experience_letter_url = data.doc_experience_letter_url
            
        # If mandatory docs are present and candidate info is there, transition to PENDING_HR_DOCS
        if onboarding.doc_front_picture_url and onboarding.doc_id_card_url:
            onboarding.status = OnboardingStatus.PENDING_HR_DOCS

        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def hr_verify(self, application_id: int, data: HROnboardingVerify) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        onboarding.hr_verified = data.hr_verified
        
        if data.hr_verified:
            onboarding.status = OnboardingStatus.PENDING_IT_SETUP
        else:
            onboarding.status = OnboardingStatus.PENDING_CANDIDATE_DOCS
            
        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def it_setup_update(self, application_id: int, data: ITOnboardingUpdate) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        if data.it_slack_setup is not None: onboarding.it_slack_setup = data.it_slack_setup
        if data.it_gmail_setup is not None: onboarding.it_gmail_setup = data.it_gmail_setup
        if data.it_browser_extensions is not None: onboarding.it_browser_extensions = data.it_browser_extensions
        if data.it_gmail_signature is not None: onboarding.it_gmail_signature = data.it_gmail_signature
        if data.it_bordio_access is not None: onboarding.it_bordio_access = data.it_bordio_access
        if data.it_office365_access is not None: onboarding.it_office365_access = data.it_office365_access
        
        # Check if all IT tasks are done
        all_done = (
            onboarding.it_slack_setup and 
            onboarding.it_gmail_setup and 
            onboarding.it_browser_extensions and 
            onboarding.it_gmail_signature and 
            onboarding.it_bordio_access and 
            onboarding.it_office365_access
        )
        
        if all_done:
            onboarding.status = OnboardingStatus.PENDING_INDUCTION

        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def _check_induction_completed(self, onboarding: Onboarding):
        induction_done = (
            onboarding.ind_hr_welcome_session and
            onboarding.ind_hr_handbook_shared and
            onboarding.ind_hr_policies_explained and
            onboarding.ind_it_credentials_provided and
            onboarding.ind_it_security_induction and
            onboarding.ind_manager_buddy_assigned and
            onboarding.ind_manager_team_intro
        )
        if induction_done and onboarding.status == OnboardingStatus.PENDING_INDUCTION:
            onboarding.status = OnboardingStatus.COMPLETED
            # Update application status as well to HIRED/ACTIVE
            app_result = await self.db.execute(select(Application).where(Application.id == onboarding.application_id))
            app = app_result.scalars().first()
            if app:
                app.status = ApplicationStatus.HIRED

    async def hr_induction_update(self, application_id: int, data: HRInductionUpdate) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        if data.ind_hr_welcome_session is not None: onboarding.ind_hr_welcome_session = data.ind_hr_welcome_session
        if data.ind_hr_handbook_shared is not None: onboarding.ind_hr_handbook_shared = data.ind_hr_handbook_shared
        if data.ind_hr_policies_explained is not None: onboarding.ind_hr_policies_explained = data.ind_hr_policies_explained
        
        await self._check_induction_completed(onboarding)
        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def it_induction_update(self, application_id: int, data: ITInductionUpdate) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        if data.ind_it_credentials_provided is not None: onboarding.ind_it_credentials_provided = data.ind_it_credentials_provided
        if data.ind_it_security_induction is not None: onboarding.ind_it_security_induction = data.ind_it_security_induction
        
        await self._check_induction_completed(onboarding)
        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def manager_induction_update(self, application_id: int, data: ManagerInductionUpdate) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        if data.ind_manager_buddy_assigned is not None: onboarding.ind_manager_buddy_assigned = data.ind_manager_buddy_assigned
        if data.ind_manager_team_intro is not None: onboarding.ind_manager_team_intro = data.ind_manager_team_intro
        
        await self._check_induction_completed(onboarding)
        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding
