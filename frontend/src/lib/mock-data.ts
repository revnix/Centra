export const MOCK_JOBS = [
    {
        id: 1,
        title: "Senior Full Stack Engineer",
        department: "Engineering",
        location: "San Francisco, CA (Remote)",
        type: "Full-time",
        salary: "$160k - $210k",
        description: "We are looking for an experienced Full Stack Engineer to lead our core product team. You will be responsible for...",
        requirements: [
            "5+ years of experience with React and Node.js",
            "Experience with TypeScript and PostgreSQL",
            "Strong understanding of system design",
            "Excellent communication skills"
        ],
        postedAt: "2 days ago",
        status: "published"
    },
    {
        id: 2,
        title: "AI Researcher",
        department: "R&D",
        location: "New York, NY",
        type: "Full-time",
        salary: "$180k - $250k",
        description: "Join our AI research lab to push the boundaries of Large Language Models...",
        requirements: [
            "PhD in Computer Science or related field",
            "Deep understanding of Transformers and Attention mechanisms",
            "Experience with PyTorch or JAX",
            "Published papers in top-tier conferences"
        ],
        postedAt: "1 week ago",
        status: "published"
    },
    {
        id: 3,
        title: "Product Designer",
        department: "Design",
        location: "London, UK (Hybrid)",
        type: "Contract",
        salary: "£60k - £80k",
        description: "We need a creative Product Designer to help shape the future of our user experience...",
        requirements: [
            "3+ years of product design experience",
            "Proficiency in Figma and prototyping tools",
            "Strong portfolio showcasing user-centric design",
            "Experience working in an agile environment"
        ],
        postedAt: "3 days ago",
        status: "published"
    }
];

export const MOCK_APPLICATIONS = [
    {
        id: 101,
        jobId: 1,
        candidateName: "Alex Chen",
        candidateEmail: "alex.chen@example.com",
        status: "interviewing",
        appliedAt: "1 day ago",
        aiScore: 85,
        summary: "Strong technical skills, communicated clearly. Good fit for the role."
    },
    {
        id: 102,
        jobId: 1,
        candidateName: "Sarah Jones",
        candidateEmail: "sarah.j@example.com",
        status: "applied",
        appliedAt: "2 days ago",
        aiScore: 0,
        summary: "Pending review."
    },
    {
        id: 103,
        jobId: 2,
        candidateName: "Dr. Michael Ross",
        candidateEmail: "m.ross@uni.edu",
        status: "hired",
        appliedAt: "1 week ago",
        aiScore: 98,
        summary: "Exceptional candidate. Deep knowledge of LLMs."
    }
];
