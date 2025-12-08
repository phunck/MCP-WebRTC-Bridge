import RealtimeClient from './realtimeClient.js';
import MCPBridge from './mcpBridge.js';

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const logEl = document.getElementById('log');
const remoteAudio = document.getElementById('remoteAudio');

const bridge = new MCPBridge({
  baseUrl: 'http://localhost:9000/tools'
});

const client = new RealtimeClient({
  onToolCall: bridge.handleToolCall,
  onEvent: log,
  audioEl: remoteAudio
});

function log(message, data) {
  const line = document.createElement('div');
  line.className = 'log-line';
  const payload = data ? ` ${JSON.stringify(data)}` : '';
  line.textContent = `[${new Date().toISOString()}] ${message}${payload}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

startBtn.addEventListener('click', async () => {
  try {
    await client.start();
    log('Voice session started');
  } catch (err) {
    console.error(err);
    log('Failed to start', { error: err.message });
  }
});

stopBtn.addEventListener('click', () => {
  client.stop();
  log('Voice session stopped');
});