export default class MCPBridge {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  handleToolCall = async ({ name, args, id }) => {
    const url = `${this.baseUrl}/${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args ?? {})
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tool call failed (${res.status}): ${text}`);
    }

    const data = await res.json().catch(() => ({}));
    return { id, data };
  };
}
