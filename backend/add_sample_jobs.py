"""
Script to add sample published jobs to the database for testing
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db_session
from src.api.models.job import Posts, JobStatus, JobType, ExperienceLevel
from src.api.models.user import User
from sqlalchemy import select


async def add_sample_jobs():
    """Add sample jobs to the database"""
    async for db in get_db_session():
        try:
            # Get the first user (admin) to be the creator
            result = await db.execute(select(User).limit(1))
            user = result.scalars().first()
            
            if not user:
                print("No users found. Please create a user first.")
                return
            
            print(f"Creating jobs for user: {user.email}")
            
            # Sample jobs
            sample_jobs = [
                {
                    "title": "Senior Full Stack Engineer",
                    "description": "We're looking for an experienced Full Stack Engineer to join our dynamic team. You'll work on cutting-edge web applications using React, Node.js, and PostgreSQL. This role offers the opportunity to make a significant impact on our product and company culture.",
                    "short_description": "Build cutting-edge web applications with React, Node.js, and PostgreSQL",
                    "company_name": "TechCorp Inc.",
                    "location": "San Francisco, CA",
                    "job_type": JobType.FULL_TIME,
                    "experience_level": ExperienceLevel.MID_SENIOR,
                    "department": "Engineering",
                    "salary_min": 120000,
                    "salary_max": 180000,
                    "salary_currency": "USD",
                    "salary_period": "yearly",
                    "required_skills": ["React", "Node.js", "PostgreSQL", "TypeScript", "REST APIs"],
                    "preferred_skills": ["Next.js", "GraphQL", "Docker", "AWS"],
                    "benefits": ["Health Insurance", "401k", "Remote Work", "Flexible Hours"],
                    "status": JobStatus.PUBLISHED,
                    "created_by": user.id,
                },
                {
                    "title": "Product Designer",
                    "description": "Join our design team to create beautiful and intuitive user experiences. You'll work closely with product managers and engineers to design features that delight our users. We value creativity, empathy, and attention to detail.",
                    "short_description": "Create beautiful and intuitive user experiences for our products",
                    "company_name": "Creative Labs",
                    "location": "Remote",
                    "job_type": JobType.FULL_TIME,
                    "experience_level": ExperienceLevel.ASSOCIATE,
                    "department": "Design",
                    "salary_min": 90000,
                    "salary_max": 130000,
                    "salary_currency": "USD",
                    "salary_period": "yearly",
                    "required_skills": ["Figma", "UI/UX Design", "Prototyping", "User Research"],
                    "preferred_skills": ["Adobe Creative Suite", "Animation", "Design Systems"],
                    "benefits": ["Health Insurance", "Remote Work", "Learning Budget", "Stock Options"],
                    "status": JobStatus.PUBLISHED,
                    "created_by": user.id,
                },
                {
                    "title": "Data Scientist",
                    "description": "We're seeking a talented Data Scientist to help us unlock insights from our data. You'll build machine learning models, conduct A/B tests, and present findings to stakeholders. Experience with Python, SQL, and statistical analysis is essential.",
                    "short_description": "Build ML models and unlock insights from large datasets",
                    "company_name": "DataFlow Systems",
                    "location": "New York, NY",
                    "job_type": JobType.FULL_TIME,
                    "experience_level": ExperienceLevel.MID_SENIOR,
                    "department": "Data Science",
                    "salary_min": 130000,
                    "salary_max": 170000,
                    "salary_currency": "USD",
                    "salary_period": "yearly",
                    "required_skills": ["Python", "SQL", "Machine Learning", "Statistics", "Pandas"],
                    "preferred_skills": ["TensorFlow", "PyTorch", "Spark", "AWS"],
                    "benefits": ["Health Insurance", "401k", "Gym Membership", "Commuter Benefits"],
                    "status": JobStatus.PUBLISHED,
                    "created_by": user.id,
                },
                {
                    "title": "DevOps Engineer",
                    "description": "Help us build and maintain robust infrastructure for our applications. You'll work with Kubernetes, AWS, and CI/CD pipelines to ensure our services are reliable and scalable. Automation and infrastructure-as-code are core to this role.",
                    "short_description": "Build and maintain cloud infrastructure with K8s and AWS",
                    "company_name": "CloudTech",
                    "location": "Austin, TX",
                    "job_type": JobType.FULL_TIME,
                    "experience_level": ExperienceLevel.MID_SENIOR,
                    "department": "Infrastructure",
                    "salary_min": 115000,
                    "salary_max": 155000,
                    "salary_currency": "USD",
                    "salary_period": "yearly",
                    "required_skills": ["Kubernetes", "AWS", "Docker", "CI/CD", "Terraform"],
                    "preferred_skills": ["Go", "Python", "Monitoring", "Security"],
                    "benefits": ["Health Insurance", "401k", "Remote Work", "Professional Development"],
                    "status": JobStatus.PUBLISHED,
                    "created_by": user.id,
                },
                {
                    "title": "Frontend Developer",
                    "description": "Build responsive and performant web applications using modern frontend technologies. You'll collaborate with designers and backend engineers to create exceptional user experiences. We use React, TypeScript, and modern CSS frameworks.",
                    "short_description": "Build responsive web apps with React and TypeScript",
                    "company_name": "WebWorks",
                    "location": "Remote",
                    "job_type": JobType.FULL_TIME,
                    "experience_level": ExperienceLevel.ASSOCIATE,
                    "department": "Engineering",
                    "salary_min": 95000,
                    "salary_max": 135000,
                    "salary_currency": "USD",
                    "salary_period": "yearly",
                    "required_skills": ["React", "TypeScript", "HTML", "CSS", "JavaScript"],
                    "preferred_skills": ["Next.js", "Tailwind CSS", "Jest", "Redux"],
                    "benefits": ["Health Insurance", "Remote Work", "Unlimited PTO", "Stock Options"],
                    "status": JobStatus.PUBLISHED,
                    "created_by": user.id,
                },
                {
                    "title": "Mobile Developer (React Native)",
                    "description": "Develop cross-platform mobile applications using React Native. You'll work on features for both iOS and Android, collaborating with designers and product managers to deliver high-quality mobile experiences.",
                    "short_description": "Build cross-platform mobile apps with React Native",
                    "company_name": "AppWorks",
                    "location": "Seattle, WA",
                    "job_type": JobType.CONTRACT,
                    "experience_level": ExperienceLevel.ASSOCIATE,
                    "department": "Mobile",
                    "salary_min": 85000,
                    "salary_max": 125000,
                    "salary_currency": "USD",
                    "salary_period": "yearly",
                    "required_skills": ["React Native", "JavaScript", "iOS", "Android", "REST APIs"],
                    "preferred_skills": ["TypeScript", "Redux", "Native Modules", "Firebase"],
                    "benefits": ["Health Insurance", "Flexible Hours", "Remote Work"],
                    "status": JobStatus.PUBLISHED,
                    "created_by": user.id,
                },
            ]
            
            # Check if jobs already exist
            result = await db.execute(select(Posts).where(Posts.status == JobStatus.PUBLISHED))
            existing_jobs = result.scalars().all()
            
            if existing_jobs:
                print(f"Found {len(existing_jobs)} existing published jobs.")
                response = input("Do you want to add more jobs anyway? (y/n): ")
                if response.lower() != 'y':
                    print("Skipping job creation.")
                    return
            
            # Create jobs
            for job_data in sample_jobs:
                job = Posts(**job_data)
                db.add(job)
            
            await db.commit()
            print(f"Successfully created {len(sample_jobs)} sample jobs!")
            
        except Exception as e:
            print(f"Error creating jobs: {e}")
            await db.rollback()
        finally:
            await db.close()
            break


if __name__ == "__main__":
    asyncio.run(add_sample_jobs())
