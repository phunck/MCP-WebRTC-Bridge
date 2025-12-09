import RealtimeClient from './realtimeClient.js';
import MCPBridge from './mcpBridge.js';
import { Button } from './components/Button.js';
import { Card, CardHeader, CardTitle, CardContent } from './components/Card.js';
import { cn } from './lib/utils.js';

const app = document.getElementById('app');
const remoteAudio = document.getElementById('remoteAudio');

// Create main layout
const container = document.createElement('div');
container.className = 'space-y-6';

// Header Card
const headerCard = Card({ className: 'mb-6' });
const headerContent = CardHeader({});
const title = CardTitle({ children: 'MCP WebRTC Bridge' });
headerContent.appendChild(title);
headerCard.appendChild(headerContent);
container.appendChild(headerCard);

// Control Card
const controlCard = Card({});
const controlHeader = CardHeader({});
const controlTitle = CardTitle({ className: 'text-lg', children: 'Voice Controls' });
controlHeader.appendChild(controlTitle);
controlCard.appendChild(controlHeader);

const controlContent = CardContent({ className: 'space-y-4' });

// Device Selector
const deviceContainer = document.createElement('div');
deviceContainer.className = 'space-y-2';
const deviceLabel = document.createElement('label');
deviceLabel.className = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
deviceLabel.textContent = 'Microphone';
const deviceSelect = document.createElement('select');
deviceSelect.className = 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
deviceContainer.appendChild(deviceLabel);
deviceContainer.appendChild(deviceSelect);

controlContent.appendChild(deviceContainer);

// Voice Selector
const voiceContainer = document.createElement('div');
voiceContainer.className = 'space-y-2';
const voiceLabel = document.createElement('label');
voiceLabel.className = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
voiceLabel.textContent = 'Voice';
const voiceSelect = document.createElement('select');
voiceSelect.className = 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const voices = ['alloy', 'echo', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'];
voices.forEach(voice => {
  const option = document.createElement('option');
  option.value = voice;
  option.text = voice.charAt(0).toUpperCase() + voice.slice(1);
  voiceSelect.appendChild(option);
});
// Restore previous voice selection
const savedVoice = localStorage.getItem('selectedVoice');
if (savedVoice && voices.includes(savedVoice)) {
  voiceSelect.value = savedVoice;
}
voiceSelect.addEventListener('change', (e) => {
  localStorage.setItem('selectedVoice', e.target.value);
});

voiceContainer.appendChild(voiceLabel);
voiceContainer.appendChild(voiceSelect);
controlContent.appendChild(voiceContainer);

const buttonContainer = document.createElement('div');
buttonContainer.className = 'flex gap-3';
const startBtn = Button({
  id: 'start',
  variant: 'default',
  children: '🎤 Start Voice',
  className: 'flex-1'
});
const stopBtn = Button({
  id: 'stop',
  variant: 'destructive',
  children: '⏹ Stop Voice',
  className: 'flex-1',
  disabled: true
});
buttonContainer.appendChild(startBtn);
buttonContainer.appendChild(stopBtn);
controlContent.appendChild(buttonContainer);

// Status indicator
const statusContainer = document.createElement('div');
statusContainer.className = 'flex items-center gap-2';
const statusDot = document.createElement('div');
statusDot.id = 'statusDot';
statusDot.className = 'w-3 h-3 rounded-full bg-muted';
const statusText = document.createElement('span');
statusText.id = 'statusText';
statusText.className = 'text-sm text-muted-foreground';
statusText.textContent = 'Disconnected';
statusContainer.appendChild(statusText);
controlContent.appendChild(statusContainer);

// Volume indicator
const volumeContainer = document.createElement('div');
volumeContainer.className = 'h-2 bg-muted rounded-full overflow-hidden mt-4';
const volumeBar = document.createElement('div');
volumeBar.className = 'h-full bg-green-500 transition-all duration-75 ease-out';
volumeBar.style.width = '0%';
volumeContainer.appendChild(volumeBar);
controlContent.appendChild(volumeContainer);

controlCard.appendChild(controlContent);
container.appendChild(controlCard);

// Log Card
const logCard = Card({});
const logHeader = CardHeader({});
const logTitle = CardTitle({ className: 'text-lg', children: 'Event Log' });
logHeader.appendChild(logTitle);
logCard.appendChild(logHeader);

const logContent = CardContent({});
const logEl = document.createElement('div');
logEl.id = 'log';
logEl.className = cn(
  'bg-muted rounded-md p-4 h-64 overflow-y-auto',
  'font-mono text-sm',
  'space-y-2'
);
logContent.appendChild(logEl);
logCard.appendChild(logContent);
container.appendChild(logCard);

app.appendChild(container);

// Initialize bridge and client
const bridge = new MCPBridge({
  baseUrl: '/api'
});

// Fetch available tools from MCP server (optional)
// If your MCP server doesn't provide a tools list endpoint,
// tools will be registered dynamically when first used
let availableTools = [];

const client = new RealtimeClient({
  onToolCall: bridge.handleToolCall,
  onEvent: log,
  audioEl: remoteAudio,
  tools: availableTools // Will be populated if MCP server provides tool definitions
});

let isActive = false;

function log(message, data) {
  const line = document.createElement('div');
  line.className = cn(
    'text-muted-foreground',
    'break-words'
  );
  const timestamp = new Date().toISOString();
  const payload = data ? ` ${JSON.stringify(data, null, 2)}` : '';
  line.textContent = `[${timestamp}] ${message}${payload}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function updateStatus(connected) {
  if (connected) {
    statusDot.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
    statusText.textContent = 'Connected';
    statusText.className = 'text-sm text-green-500';
  } else {
    statusDot.className = 'w-3 h-3 rounded-full bg-muted';
    statusText.textContent = 'Disconnected';
    statusText.className = 'text-sm text-muted-foreground';
  }
}

startBtn.addEventListener('click', async () => {
  if (isActive) return;

  try {
    isActive = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus(false);

    updateStatus(false);

    // Get selected device
    const deviceId = deviceSelect.value || null;
    const voice = voiceSelect.value || 'alloy';

    // Try to fetch tools from MCP server before starting
    try {
      log('Fetching tools from MCP server...');
      const tools = await bridge.loadToolsFromMcp();

      if (tools.length > 0) {
        client.tools = tools;
        log(`Loaded ${tools.length} tools from MCP server: ${tools.map(t => t.name).join(', ')}`);
      } else {
        log('No tools loaded from MCP server (empty response)');
        client.tools = [];
      }
    } catch (err) {
      log(`Failed to load tools from MCP server: ${err.message}`, { error: true });
      log('⚠️ Session will run without MCP tools');
      client.tools = [];
    }

    await client.start(deviceId, voice);

    // Setup audio visualization
    client.setupAudioAnalysis((volume) => {
      volumeBar.style.width = `${volume * 100}%`;
    });

    log('Voice session started');
    updateStatus(true);
  } catch (err) {
    console.error(err);
    log('Failed to start', { error: err.message });
    isActive = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus(false);
  }
});

stopBtn.addEventListener('click', () => {
  if (!isActive) return;

  client.stop();
  log('Voice session stopped');
  isActive = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus(false);
});

// Initialize device list
(async () => {
  try {
    const devices = await client.getAudioInputDevices();
    deviceSelect.innerHTML = '';

    if (devices.length === 0) {
      const option = document.createElement('option');
      option.text = 'Default Microphone';
      option.value = '';
      deviceSelect.appendChild(option);
      return;
    }

    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Microphone ${device.deviceId.slice(0, 5)}...`;
      deviceSelect.appendChild(option);
    });

    // Restore previous selection if possible
    const savedDevice = localStorage.getItem('selectedAudioDevice');
    if (savedDevice && devices.some(d => d.deviceId === savedDevice)) {
      deviceSelect.value = savedDevice;
    }
  } catch (err) {
    console.error('Failed to load devices:', err);
  }
})();

deviceSelect.addEventListener('change', (e) => {
  localStorage.setItem('selectedAudioDevice', e.target.value);
});