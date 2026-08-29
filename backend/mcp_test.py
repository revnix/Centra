from fastmcp import Client
import asyncio

client = Client("http://127.0.0.1:2024/mcp/")

async def main():
    async with client:
        tools = await client.list_tools()
        print(tools)

        result = await client.call_tool("some_tool_name", {"arg": "value"})
        print(result)

asyncio.run(main())