import logging
import secrets
from typing import Optional
from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.onboarding import Onboarding, OnboardingStatus
from src.api.models.application import Application, ApplicationStatus
from src.api.core.config import settings
from src.api.services.email_service import EmailService
from src.api.models.user import User, UserRole
from sqlalchemy.orm import selectinload, joinedload
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

    async def get_all_onboardings(self) -> list[dict]:
        from src.api.models.application import Application
        from src.api.models.job import Posts
        
        try:
            # Use explicit joins to fetch all required data in one query.
            # This is the most robust way to avoid MissingGreenlet errors in async environments.
            stmt = (
                select(
                    Onboarding,
                    User.full_name.label("cand_name"),
                    User.email.label("cand_email"),
                    Posts.title.label("job_title_val")
                )
                .outerjoin(Application, Onboarding.application_id == Application.id)
                .outerjoin(User, Application.candidate_id == User.id)
                .outerjoin(Posts, Application.job_id == Posts.id)
                .order_by(Onboarding.created_at.desc())
            )
            
            result = await self.db.execute(stmt)
            rows = result.all()
            
            logger.info(f"Retrieved {len(rows)} onboarding records with explicit joins")
            
            final_results = []
            for row in rows:
                o = row.Onboarding
                
                # Construct dictionary matching OnboardingResponse schema
                d = {
                    "id": o.id,
                    "application_id": o.application_id,
                    "user_id": o.user_id,
                    "status": o.status,
                    "candidate_name": row.cand_name or "N/A",
                    "email": row.cand_email or "N/A",
                    "job_title": row.job_title_val or "N/A",
                    "joining_date": o.joining_date,
                    "reporting_time": o.reporting_time,
                    "office_location": o.office_location,
                    "shift_timing": o.shift_timing,
                    "cnic_number": o.cnic_number,
                    "phone_number": o.phone_number,
                    "current_address": o.current_address,
                    "emergency_contact": o.emergency_contact,
                    "bank_name": o.bank_name,
                    "bank_iban": o.bank_iban,
                    "doc_front_picture_url": o.doc_front_picture_url,
                    "doc_id_card_url": o.doc_id_card_url,
                    "doc_salary_slip_url": o.doc_salary_slip_url,
                    "doc_experience_letter_url": o.doc_experience_letter_url,
                    "doc_educational_documents_url": o.doc_educational_documents_url,
                    "doc_police_clearance_url": o.doc_police_clearance_url,
                    "doc_resume_url": o.doc_resume_url,
                    "doc_additional_files_json": o.doc_additional_files_json,
                    "hr_verified": bool(o.hr_verified),
                    "it_slack_setup": bool(o.it_slack_setup),
                    "it_gmail_setup": bool(o.it_gmail_setup),
                    "it_browser_extensions": bool(o.it_browser_extensions),
                    "it_gmail_signature": bool(o.it_gmail_signature),
                    "it_bordio_access": bool(o.it_bordio_access),
                    "it_office365_access": bool(o.it_office365_access),
                    "ind_hr_welcome_session": bool(o.ind_hr_welcome_session),
                    "ind_hr_handbook_shared": bool(o.ind_hr_handbook_shared),
                    "ind_hr_policies_explained": bool(o.ind_hr_policies_explained),
                    "ind_it_credentials_provided": bool(o.ind_it_credentials_provided),
                    "ind_it_security_induction": bool(o.ind_it_security_induction),
                    "ind_manager_buddy_assigned": bool(o.ind_manager_buddy_assigned),
                    "ind_manager_team_intro": bool(o.ind_manager_team_intro),
                    "created_at": o.created_at,
                    "updated_at": o.updated_at
                }
                final_results.append(d)
            
            return final_results
        except Exception as e:
            logger.error(f"FATAL error in get_all_onboardings: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal database mapping error: {str(e)}")

    async def get_hr_onboarding_details(self, application_id: int) -> dict:
        from src.api.models.application import Application
        from src.api.models.onboarding import OnboardingDocument
        from src.api.models.job import Posts
        
        # Fetch application with candidate and job info using explicit join for safety
        stmt = (
            select(
                Application,
                User.full_name.label("cand_name"),
                User.email.label("cand_email"),
                Posts.title.label("job_title_val")
            )
            .outerjoin(User, Application.candidate_id == User.id)
            .outerjoin(Posts, Application.job_id == Posts.id)
            .where(Application.id == application_id)
        )
        
        result = await self.db.execute(stmt)
        row = result.first()
        
        if not row:
            raise HTTPException(status_code=404, detail="Application not found")
            
        app = row.Application
            
        # Fetch uploaded documents
        doc_result = await self.db.execute(
            select(OnboardingDocument).where(OnboardingDocument.application_id == application_id)
        )
        documents = doc_result.scalars().all()
        
        return {
            "candidate_name": row.cand_name or "N/A",
            "email": row.cand_email or "N/A",
            "job_title": row.job_title_val or "N/A",
            "status": app.status,
            "documents": [
                {
                    "id": doc.id,
                    "file_name": doc.file_name,
                    "file_url": doc.file_url,
                    "file_type": doc.file_type,
                    "uploaded_at": doc.uploaded_at
                } for doc in documents
            ]
        }

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
            # Backfill token if missing
            if not existing.onboarding_token:
                existing.onboarding_token = secrets.token_urlsafe(32)
                await self.db.commit()
                await self.db.refresh(existing)
            return existing

        db_obj = Onboarding(
            application_id=application_id,
            user_id=app.candidate_id,
            status=OnboardingStatus.PENDING_CANDIDATE_JOINING,
            onboarding_token=secrets.token_urlsafe(32)
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def _check_auth(self, onboarding: Onboarding, user: User | None = None, token: str | None = None):
        # If token is provided and matches, allow access
        if token and onboarding.onboarding_token and token == onboarding.onboarding_token:
            return
        if token and onboarding.onboarding_token and token != onboarding.onboarding_token:
            logger.warning(
                f"TOKEN MISMATCH for app_id={onboarding.application_id}: "
                f"provided={token[:10]}... stored={onboarding.onboarding_token[:10]}..."
            )

        if not user:
            logger.warning(f"AUTH DENIED: No user and invalid/missing token for onboarding app_id={onboarding.application_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this onboarding record")

        # Admins and Reviewers can access any onboarding record
        if user.role in [UserRole.ADMIN, UserRole.REVIEWER]:
            return
            
        # Candidates can only access their own onboarding record
        if onboarding.user_id != user.id:
            logger.warning(
                f"AUTH DENIED: onboarding.user_id={onboarding.user_id} "
                f"vs current user.id={user.id} (role={user.role})"
            )
            raise HTTPException(
                status_code=403,
                detail="Not authorized to update this onboarding record"
            )

    async def update_candidate_joining_date(self, application_id: int, current_user: User | None, data: CandidateOnboardingUpdate, token: str | None = None) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        await self._check_auth(onboarding, current_user, token)

        if data.joining_date is not None:
            onboarding.joining_date = data.joining_date
        
        # Update personal info
        if data.cnic_number is not None: onboarding.cnic_number = data.cnic_number
        if data.phone_number is not None: onboarding.phone_number = data.phone_number
        if data.current_address is not None: onboarding.current_address = data.current_address
        if data.emergency_contact is not None: onboarding.emergency_contact = data.emergency_contact
        if data.bank_name is not None: onboarding.bank_name = data.bank_name
        if data.bank_iban is not None: onboarding.bank_iban = data.bank_iban
        
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

        if data.reporting_time is not None:
            onboarding.reporting_time = data.reporting_time
        if data.office_location is not None:
            onboarding.office_location = data.office_location
        if data.shift_timing is not None:
            onboarding.shift_timing = data.shift_timing
        
        # Advance status only if all joining details are now present
        if (onboarding.reporting_time and 
            onboarding.office_location and 
            onboarding.shift_timing):
            if onboarding.status == OnboardingStatus.PENDING_HR_DETAILS:
                onboarding.status = OnboardingStatus.PENDING_CANDIDATE_DOCS

        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def update_candidate_documents(self, application_id: int, current_user: User | None, data: CandidateDocumentUpload, token: str | None = None) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        await self._check_auth(onboarding, current_user, token)
            
        if data.doc_front_picture_url is not None:
            onboarding.doc_front_picture_url = data.doc_front_picture_url
        if data.doc_id_card_url is not None:
            onboarding.doc_id_card_url = data.doc_id_card_url
        if data.doc_salary_slip_url is not None:
            onboarding.doc_salary_slip_url = data.doc_salary_slip_url
        if data.doc_experience_letter_url is not None:
            onboarding.doc_experience_letter_url = data.doc_experience_letter_url
        if data.doc_educational_documents_url is not None:
            onboarding.doc_educational_documents_url = data.doc_educational_documents_url
        if data.doc_police_clearance_url is not None:
            onboarding.doc_police_clearance_url = data.doc_police_clearance_url
        if data.doc_resume_url is not None:
            onboarding.doc_resume_url = data.doc_resume_url
        if data.doc_additional_files_json is not None:
            onboarding.doc_additional_files_json = data.doc_additional_files_json
            
        # If mandatory docs are present and candidate info is there, transition to PENDING_HR_DOCS
        if onboarding.doc_front_picture_url and onboarding.doc_id_card_url:
            onboarding.status = OnboardingStatus.PENDING_HR_DOCS

        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding

    async def upload_onboarding_documents(
        self, 
        application_id: int, 
        current_user: User | None, 
        cnic: Optional[UploadFile] = None,
        resume: Optional[UploadFile] = None,
        degree: Optional[UploadFile] = None,
        front_picture: Optional[UploadFile] = None,
        salary_slip: Optional[UploadFile] = None,
        experience_letter: Optional[UploadFile] = None,
        police_clearance: Optional[UploadFile] = None,
        token: Optional[str] = None
    ) -> Onboarding:
        """
        Handles physical file uploads for onboarding documents.
        """
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        await self._check_auth(onboarding, current_user, token)

        from src.api.services.file_service import FileService
        
        # Mapping of upload arguments to document types and model fields
        uploads = [
            (cnic, "cnic", "doc_id_card_url"),
            (resume, "resume", "doc_resume_url"),
            (degree, "degree", "doc_educational_documents_url"),
            (front_picture, "front_pic", "doc_front_picture_url"),
            (salary_slip, "salary", "doc_salary_slip_url"),
            (experience_letter, "experience", "doc_experience_letter_url"),
            (police_clearance, "police", "doc_police_clearance_url")
        ]

        from src.api.models.onboarding import OnboardingDocument
        
        for file_obj, doc_type, field_name in uploads:
            if file_obj:
                try:
                    url = await FileService.save_onboarding_document(file_obj, application_id, doc_type)
                    setattr(onboarding, field_name, url)
                    
                    # Save metadata to onboarding_documents table
                    file_ext = file_obj.filename.split('.')[-1].lower() if file_obj.filename else "file"
                    doc_meta = OnboardingDocument(
                        application_id=application_id,
                        file_name=file_obj.filename,
                        file_url=url,
                        file_type=file_ext
                    )
                    self.db.add(doc_meta)
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=str(e))

        # Check for state transition (mandatory: ID and Picture)
        if onboarding.doc_front_picture_url and onboarding.doc_id_card_url:
            if onboarding.status == OnboardingStatus.PENDING_CANDIDATE_DOCS:
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

    async def send_welcome_email(self, application_id: int) -> bool:
        """
        Sends an onboarding welcome email to the candidate.
        """
        # Fetch onboarding with user (candidate) details
        result = await self.db.execute(
            select(Onboarding)
            .where(Onboarding.application_id == application_id)
            .options(selectinload(Onboarding.user))
        )
        onboarding = result.scalars().first()
        
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        candidate = onboarding.user
        if not candidate or not candidate.email:
            raise HTTPException(status_code=400, detail="Candidate email not found")
            
        # Generate onboarding link with token
        token_param = f"?token={onboarding.onboarding_token}" if onboarding.onboarding_token else ""
        onboarding_link = f"{settings.FRONTEND_URL}/portal/onboarding/{application_id}{token_param}"
        
        # Send email
        success = await EmailService.send_onboarding_welcome(
            candidate_email=candidate.email,
            candidate_name=candidate.full_name or candidate.email,
            onboarding_link=onboarding_link
        )
        
        return success

    async def mark_completed(self, application_id: int, current_user: User | None, token: str | None = None) -> Onboarding:
        onboarding = await self.get_by_application(application_id)
        if not onboarding:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        await self._check_auth(onboarding, current_user, token)
        
        onboarding.status = OnboardingStatus.COMPLETED
        
        # Also update application status
        app_result = await self.db.execute(select(Application).where(Application.id == application_id))
        app = app_result.scalars().first()
        if app:
            app.status = ApplicationStatus.HIRED
            
        await self.db.commit()
        await self.db.refresh(onboarding)
        return onboarding
