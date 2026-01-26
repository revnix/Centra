#!/usr/bin/env python3
"""
Script to create sample jobs via the API
This should be run after you have a user account created.
"""

import requests
import json

# Configuration
API_BASE_URL = "http://localhost:2024/api/v1"
EMAIL = "admin@evalyn.com"  # Change this to your admin email
PASSWORD = "admin123"  # Change this to your admin password

def login():
    """Login and get access token"""
    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    return data.get("access_token")

def create_job(token, job_data):
    """Create a job via API"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{API_BASE_URL}/admin/jobs",
        headers=headers,
        json=job_data
    )
    if response.status_code not in [200, 201]:
        print(f"Failed to create job: {response.status_code}")
        print(response.text)
        return None
    return response.json()

def publish_job(token, job_id):
    """Publish a job"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{API_BASE_URL}/jobs/{job_id}/publish",
        headers=headers
    )
    if response.status_code != 200:
        print(f"Failed to publish job: {response.status_code}")
        print(response.text)
        return None
    return response.json()

def main():
    # Sample jobs
    sample_jobs = [
        {
            "title": "Senior Full Stack Engineer",
            "description": "We're looking for an experienced Full Stack Engineer to join our dynamic team. You'll work on cutting-edge web applications using React, Node.js, and PostgreSQL. This role offers the opportunity to make a significant impact on our product and company culture.",
            "short_description": "Build cutting-edge web applications with React, Node.js, and PostgreSQL",
            "company_name": "TechCorp Inc.",
            "location": "San Francisco, CA",
            "job_type": "full_time",
            "experience_level": "mid_senior",
            "department": "Engineering",
            "salary_min": 120000,
            "salary_max": 180000,
            "required_skills": ["React", "Node.js", "PostgreSQL", "TypeScript", "REST APIs"],
            "preferred_skills": ["Next.js", "GraphQL", "Docker", "AWS"],
            "benefits": ["Health Insurance", "401k", "Remote Work", "Flexible Hours"],
        },
        {
            "title": "Product Designer",
            "description": "Join our design team to create beautiful and intuitive user experiences. You'll work closely with product managers and engineers to design features that delight our users. We value creativity, empathy, and attention to detail.",
            "short_description": "Create beautiful and intuitive user experiences for our products",
            "company_name": "Creative Labs",
            "location": "Remote",
            "job_type": "full_time",
            "experience_level": "associate",
            "department": "Design",
            "salary_min": 90000,
            "salary_max": 130000,
            "required_skills": ["Figma", "UI/UX Design", "Prototyping", "User Research"],
            "preferred_skills": ["Adobe Creative Suite", "Animation", "Design Systems"],
            "benefits": ["Health Insurance", "Remote Work", "Learning Budget", "Stock Options"],
        },
        {
            "title": "Data Scientist",
            "description": "We're seeking a talented Data Scientist to help us unlock insights from our data. You'll build machine learning models, conduct A/B tests, and present findings to stakeholders. Experience with Python, SQL, and statistical analysis is essential.",
            "short_description": "Build ML models and unlock insights from large datasets",
            "company_name": "DataFlow Systems",
            "location": "New York, NY",
            "job_type": "full_time",
            "experience_level": "mid_senior",
            "department": "Data Science",
            "salary_min": 130000,
            "salary_max": 170000,
            "required_skills": ["Python", "SQL", "Machine Learning", "Statistics", "Pandas"],
            "preferred_skills": ["TensorFlow", "PyTorch", "Spark", "AWS"],
            "benefits": ["Health Insurance", "401k", "Gym Membership", "Commuter Benefits"],
        },
        {
            "title": "DevOps Engineer",
            "description": "Help us build and maintain robust infrastructure for our applications. You'll work with Kubernetes, AWS, and CI/CD pipelines to ensure our services are reliable and scalable. Automation and infrastructure-as-code are core to this role.",
            "short_description": "Build and maintain cloud infrastructure with K8s and AWS",
            "company_name": "CloudTech",
            "location": "Austin, TX",
            "job_type": "full_time",
            "experience_level": "mid_senior",
            "department": "Infrastructure",
            "salary_min": 115000,
            "salary_max": 155000,
            "required_skills": ["Kubernetes", "AWS", "Docker", "CI/CD", "Terraform"],
            "preferred_skills": ["Go", "Python", "Monitoring", "Security"],
            "benefits": ["Health Insurance", "401k", "Remote Work", "Professional Development"],
        },
        {
            "title": "Frontend Developer",
            "description": "Build responsive and performant web applications using modern frontend technologies. You'll collaborate with designers and backend engineers to create exceptional user experiences. We use React, TypeScript, and modern CSS frameworks.",
            "short_description": "Build responsive web apps with React and TypeScript",
            "company_name": "WebWorks",
            "location": "Remote",
            "job_type": "full_time",
            "experience_level": "associate",
            "department": "Engineering",
            "salary_min": 95000,
            "salary_max": 135000,
            "required_skills": ["React", "TypeScript", "HTML", "CSS", "JavaScript"],
            "preferred_skills": ["Next.js", "Tailwind CSS", "Jest", "Redux"],
            "benefits": ["Health Insurance", "Remote Work", "Unlimited PTO", "Stock Options"],
        },
        {
            "title": "Mobile Developer (React Native)",
            "description": "Develop cross-platform mobile applications using React Native. You'll work on features for both iOS and Android, collaborating with designers and product managers to deliver high-quality mobile experiences.",
            "short_description": "Build cross-platform mobile apps with React Native",
            "company_name": "AppWorks",
            "location": "Seattle, WA",
            "job_type": "contract",
            "experience_level": "associate",
            "department": "Mobile",
            "salary_min": 85000,
            "salary_max": 125000,
            "required_skills": ["React Native", "JavaScript", "iOS", "Android", "REST APIs"],
            "preferred_skills": ["TypeScript", "Redux", "Native Modules", "Firebase"],
            "benefits": ["Health Insurance", "Flexible Hours", "Remote Work"],
        },
    ]
    
    # Login
    print("Logging in...")
    token = login()
    if not token:
        print("Failed to login. Please check your credentials.")
        return
    
    print(f"Successfully logged in!")
    
    # Create and publish jobs
    created_jobs = []
    for job_data in sample_jobs:
        print(f"\nCreating job: {job_data['title']}...")
        job = create_job(token, job_data)
        if job:
            created_jobs.append(job)
            print(f"✓ Created job {job['id']}: {job['title']}")
            
            # Publish the job
            print(f"  Publishing job {job['id']}...")
            published = publish_job(token, job['id'])
            if published:
                print(f"  ✓ Published job {job['id']}")
            else:
                print(f"  ✗ Failed to publish job {job['id']}")
        else:
            print(f"✗ Failed to create job: {job_data['title']}")
    
    print(f"\n{'='*50}")
    print(f"Summary: Created {len(created_jobs)} jobs")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
