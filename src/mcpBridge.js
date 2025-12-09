export default class MCPBridge {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.toolMapping = new Map();
  }

  /**
   * Load tools from MCP server
   * Fetches from /mcp/tools, validates structure, and converts to Realtime API format
   */
  async loadToolsFromMcp() {
    const toolsUrl = `${this.baseUrl}/mcp/tools`;

    try {
      const res = await fetch(toolsUrl);

      if (!res.ok) {
        throw new Error(`Failed to fetch tools: ${res.status} ${res.statusText}`);
      }

      const tools = await res.json();

      if (!Array.isArray(tools)) {
        throw new Error('Invalid response format: Expected an array of tools');
      }

      // Clear previous mapping
      this.toolMapping.clear();

      // Validate and transform tools
      const validTools = tools
        .filter(tool => {
          const isValid = tool.name && tool.description && tool.input_schema;
          if (!isValid) {
            console.warn('Skipping invalid tool:', tool);
          }
          return isValid;
        })
        .map(tool => {
          // OpenAI Realtime API does not allow dots in tool names
          const sanitizedName = tool.name.replace(/\./g, '_');

          // Store mapping from sanitized name to original name
          this.toolMapping.set(sanitizedName, tool.name);

          return {
            type: 'function',
            name: sanitizedName,
            description: tool.description,
            parameters: tool.input_schema
          };
        });

      if (validTools.length === 0 && tools.length > 0) {
        console.warn('No valid tools found in response');
      }

      return validTools;

    } catch (err) {
      // Re-throw with clear message for UI logging
      throw new Error(`MCP Tool Load Error: ${err.message}`);
    }
  }

  handleToolCall = async ({ name, args, id }) => {
    // Execution endpoint is always /mcp/tools
    const url = `${this.baseUrl}/mcp/tools`;

    // Resolve original tool name from mapping (fallback to name if not found)
    const originalName = this.toolMapping.get(name) || name;

    // Wrap arguments in the specific format expected by this MCP server
    // Server expects: { tool, params, request_id }
    const payload = {
      tool: originalName,
      params: args ?? {},
      request_id: id
    };

    console.log('[MCP] Sending tool execution payload:', JSON.stringify(payload));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tool call failed (${res.status}): ${text}`);
    }

    const data = await res.json().catch(() => ({}));
    return { id, data };
  };
}
