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
statusContainer.appendChild(statusDot);
statusContainer.appendChild(statusText);
controlContent.appendChild(statusContainer);

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
  baseUrl: 'http://localhost:9000/tools'
});

const client = new RealtimeClient({
  onToolCall: bridge.handleToolCall,
  onEvent: log,
  audioEl: remoteAudio
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
    await client.start();
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