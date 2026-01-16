# Evalyn Backend - AI Job Flow

The backend for Evalyn is built using **LangGraph** to orchestrate complex AI workflows for hiring automation.

## 🚀 Orchestration with LangGraph

The core of the backend is a stateful graph that manages the job description generation process.

### Workflow Features
- **AI-Powered JD Generation**: Uses Groq (Llama 3.1) to generate structured job posts, including responsibilities, requirements, and technical stacks.
- **Human-in-the-Loop (HITL)**: Workflow interrupts after generation to allow recruiters to review, approve, or provide feedback for refinement.
- **Structured Output**: Enforces strict Pydantic schemas for consistent data flow between the AI and the frontend.
- **Feedback Loop**: Supports iterative refinement where AI adjusts the content based on specific human feedback.

## 🛠️ Tech Stack
- **Framework**: Python 3.11+
- **Graph Engine**: [LangGraph](https://github.com/langchain-ai/langgraph)
- **AI Models**: Groq (Llama 3.1 8B/70B)
- **Data Validation**: Pydantic
- **Environment**: Managed via `uv`

## 🏃 Running Locally

### Prerequisites
- Python 3.11+
- [LangGraph CLI](https://github.com/langchain-ai/langgraph-shell)

### Setup

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Configure `.env`:

   ```env
   GROQ_API_KEY=your_key_here
   ```

3. Start the development server:

   ```bash
   langgraph dev --allow-blocking --no-browser
   ```

The backend will be available at `http://localhost:2024`.

## 📁 Project Structure

```text
src/
├── flow/
│   ├── model/           # Pydantic schemas and LLM configuration
│   ├── post_creation/   # Graph nodes for generation and review
│   ├── prompts/         # AI system and human prompts
│   ├── states/          # Graph state definitions (TypedDict)
│   └── evalyn.py        # Main graph orchestration logic
├── main.py              # Entry point
```
