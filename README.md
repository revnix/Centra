# Evalyn - AI-Powered Hiring Automation

Evalyn is a next-generation hiring automation platform that leverages AI agents and stateful workflows to streamline the recruitment process.

## 🌟 Key Features

- **AI-Driven Job Generation**: Create high-quality job descriptions and social media posts using Llama 3.1.
- **Collaborative AI Experience**: Human-in-the-loop ensures recruiters have final control over AI-generated content.
- **Stateful Workflows**: Built with LangGraph for robust, resumable, and complex hiring pipelines.
- **Premium Candidate Portal**: Modern, fast, and high-fidelity user interface for both recruiters and candidates.

## 🏙️ Architecture

The project is split into two main components:

### [Frontend](./frontend)
- **Framework**: Next.js 15 (App Router)
- **Logic**: Integrates with LangGraph SDK for real-time streaming updates.
- **UI**: Premium design using TailwindCSS and shadcn/ui.

### [Backend](./backend)
- **Framework**: LangGraph (Python)
- **AI Models**: Groq-hosted Llama 3.1.
- **Workflow**: Manages the state of job creation, candidate screening, and more.

## 🚀 Getting Started

### Backend Setup

1. Navigate to `backend/`
2. Follow instructions in [backend/README.md](./backend/README.md)

### Frontend Setup

1. Navigate to `frontend/`
2. Follow instructions in [frontend/README.md](./frontend/README.md)

---

Built with ❤️ for modern HR teams.
