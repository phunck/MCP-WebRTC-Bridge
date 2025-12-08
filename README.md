# MCP-WebRTC-Bridge

A browser-based WebRTC client that connects OpenAI's Realtime API with your local MCP-Retail-Adapter server. This project enables real-time voice interactions with AI models while seamlessly forwarding tool calls to your MCP server.

## Overview

MCP-WebRTC-Bridge acts as a bridge between:
- **OpenAI Realtime API** (WebRTC connection for voice interactions)
- **MCP-Retail-Adapter** (Local HTTP server for tool execution)

The application captures microphone audio, streams it to OpenAI's Realtime API, receives audio responses, and automatically forwards any tool-call requests to your MCP server.

## Features

- 🎤 Real-time voice interaction with OpenAI Realtime API
- 🔄 Automatic tool-call forwarding to MCP-Retail-Adapter
- 📡 WebRTC-based audio streaming
- 🎯 Clean, modern UI with event logging
- ⚡ Built with Vite for fast development and production builds

## Project Structure

```
MCP-WebRTC-Bridge/
├── index.html              # Main HTML file with UI
├── src/
│   ├── main.js            # Application entry point and UI logic
│   ├── realtimeClient.js  # WebRTC client for OpenAI Realtime API
│   └── mcpBridge.js       # Bridge to MCP-Retail-Adapter server
├── public/                # Static assets
├── .env.example           # Environment variables template
├── vite.config.js         # Vite configuration
└── package.json           # Project dependencies
```

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- OpenAI API key with access to Realtime API
- MCP-Retail-Adapter server running on `http://localhost:9000`
- Modern browser with WebRTC support (Chrome, Firefox, Edge, Safari)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/phunck/MCP-WebRTC-Bridge.git
   cd MCP-WebRTC-Bridge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```

4. **Start the MCP-Retail-Adapter server**
   
   Ensure your MCP-Retail-Adapter is running and accessible at:
   ```
   http://localhost:9000/tools/<toolName>
   ```
   
   The server should accept POST requests with JSON payloads.

## Usage

### Development Mode

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Using the Application

1. **Start the MCP-Retail-Adapter server** on `http://localhost:9000`
2. **Open the application** in your browser (e.g., `http://localhost:5173`)
3. **Click "Start Voice"** to begin the voice session
   - Your browser will request microphone permissions
   - The application will establish a WebRTC connection to OpenAI Realtime API
4. **Interact with the AI** through voice
5. **Monitor events** in the log area
6. **Click "Stop Voice"** to end the session

## How It Works

### Architecture

```
┌─────────────┐         WebRTC          ┌──────────────┐
│   Browser   │ ◄─────────────────────► │ OpenAI       │
│  (Client)   │    Audio + DataChannel  │ Realtime API │
└──────┬──────┘                          └──────────────┘
       │
       │ Tool Calls (HTTP POST)
       ▼
┌─────────────┐
│ MCP-Retail- │
│  Adapter    │
│  Server     │
└─────────────┘
```

### Components

#### `realtimeClient.js`
- Establishes WebRTC connection to OpenAI Realtime API
- Captures microphone audio and streams it to the API
- Handles incoming audio via autoplay
- Opens a DataChannel for receiving realtime model events
- Detects tool-call events and forwards them to `mcpBridge.js`
- Sends tool results back to the Realtime API

#### `mcpBridge.js`
- Receives tool-call requests from `realtimeClient.js`
- Forwards tool calls to MCP-Retail-Adapter HTTP endpoints
  - Format: `http://localhost:9000/tools/<toolName>`
  - Method: POST
  - Body: JSON with tool arguments
- Returns tool results back to `realtimeClient.js`

#### `main.js`
- Provides basic UI (Start Voice, Stop Voice buttons)
- Initializes `realtimeClient.js` and registers the tool-call handler
- Displays event logs in real-time

## Configuration

### MCP Server URL

By default, the bridge connects to `http://localhost:9000/tools`. To change this, edit `src/main.js`:

```javascript
const bridge = new MCPBridge({
  baseUrl: 'http://your-server:port/tools'
});
```

### OpenAI Model

The default model is `gpt-4o-realtime-preview`. To change it, edit `src/realtimeClient.js`:

```javascript
const MODEL = 'your-model-name';
```

## Tool Call Format

The bridge expects tool calls in the following format:

**From Realtime API:**
```json
{
  "type": "tool_call",
  "name": "toolName",
  "args": { ... },
  "id": "call-id"
}
```

**To MCP Server:**
- URL: `POST http://localhost:9000/tools/toolName`
- Headers: `Content-Type: application/json`
- Body: Tool arguments as JSON

**Response from MCP Server:**
- Should return JSON that will be forwarded back to the Realtime API

## Troubleshooting

### Microphone Permissions
- Ensure your browser has permission to access the microphone
- Check browser settings if the permission prompt doesn't appear

### Audio Not Playing
- Some browsers require user interaction before autoplay works
- Try clicking the page or a button before starting the voice session

### Connection Errors
- Verify your OpenAI API key is correct and has Realtime API access
- Check that the MCP-Retail-Adapter server is running
- Ensure CORS is properly configured if accessing from a different origin

### Tool Calls Not Working
- Verify the MCP server is accessible at the configured URL
- Check that tool endpoints accept POST requests with JSON
- Review the browser console and event log for error messages

## Development

### Code Style
- Modern JavaScript (ES6+ modules)
- Clean, documented, production-ready code
- Minimal but clear structure

### Dependencies
- **Vite**: Build tool and dev server
- No additional libraries (vanilla JavaScript)

## License

This project is private and proprietary.

## Contributing

This is a private project. For issues or questions, please contact the repository owner.

## Support

For issues related to:
- **OpenAI Realtime API**: See [OpenAI Documentation](https://platform.openai.com/docs/guides/realtime)
- **MCP-Retail-Adapter**: Refer to your MCP server documentation
- **This Bridge**: Open an issue in this repository

---

Built with ❤️ using Vite and WebRTC

