import asyncio
from langchain_ollama import ChatOllama
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent


async def main():

    client = MultiServerMCPClient(
        {
            "docs": {
                "transport": "http",
                "url": "http://127.0.0.1:2024/mcp/",
            }
        }
    )

    tools = await client.get_tools()

    print(f"Discovered {len(tools)} tools from MCP server.")

    for tool in tools:
        print("-", tool.name)

    model = ChatOllama(
        model="qwen3:4b",
        temperature=0
    )

    agent = create_agent(model, tools,debug=True)

    response = await agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": "How do I configure tools in LangGraph?"
                }
            ]
        }
    )

    print("\nFINAL RESPONSE:")
    print(response["messages"][-1].content)


if __name__ == "__main__":
    asyncio.run(main())