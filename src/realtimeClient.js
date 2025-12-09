const MODEL = 'gpt-4o-realtime-preview-2024-12-17';
const API_URL = `https://api.openai.com/v1/realtime?model=${MODEL}`;

const STRICT_INSTRUCTIONS = `Du bist ein Retail-Store-Assistent. WICHTIG: Du hast KEIN allgemeines Wissen über Produkte, Marken oder Retail-Informationen.

Du MUSST IMMER die verfügbaren Tools verwenden, um Informationen zu erhalten:
- Verwende retail_product_search für Produktsuchen
- Verwende retail_product_get für Produktdetails
- Verwende retail_inventory_status für Verfügbarkeit
- Verwende retail_promotion_list für Angebote
- Verwende retail_product_location für Standorte
- Verwende retail_navigation_route für Navigation

VERBOTEN:
- ❌ Keine allgemeinen Aussagen über Produkte oder Marken
- ❌ Keine Informationen aus deinem Training verwenden
- ❌ Keine Vermutungen oder Annahmen
- ❌ Keine Aussagen wie "es gibt viele vegane Produkte" ohne Tool-Aufruf

ERLAUBT:
- ✅ Nur Informationen aus Tool-Antworten verwenden
- ✅ Wenn ein Tool keine Ergebnisse liefert, sage das klar
- ✅ Wenn du etwas nicht weißt, rufe das entsprechende Tool auf

Dein Wissen kommt AUSSCHLIESSLICH aus den Tool-Antworten deines MCP-Servers.

VERHALTEN BEI SUCHANFRAGEN:
- Führe SOFORT eine Suche aus, auch bei vagen Anfragen (z.B. "vegan").
- Frage NICHT nach Kategorien oder Details, bevor du gesucht hast.
- Liefere erst Ergebnisse, dann frage bei Bedarf nach Verfeinerung.
- Sei effizient und direkt.`;

export default class RealtimeClient {
  constructor({ onToolCall, onEvent, audioEl, tools = [] }) {
    this.onToolCall = onToolCall;
    this.onEvent = onEvent || (() => { });
    this.audioEl = audioEl;
    this.tools = tools;
    this.pc = null;
    this.micStream = null;
    this.dataChannel = null;
  }

  /**
   * Register tools with the Realtime API
   * Sends tools.update event to make tools available to the model
   */
  registerTools(tools) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.onEvent('Warning: Cannot register tools, data channel not open');
      return;
    }

    if (!Array.isArray(tools) || tools.length === 0) {
      this.onEvent('No tools to register');
      return;
    }

    // Convert MCP tool format to Realtime API format
    const realtimeTools = tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      parameters: tool.inputSchema || tool.parameters || {}
    }));

    const toolsUpdateEvent = {
      type: 'tools.update',
      tools: realtimeTools
    };

    this.dataChannel.send(JSON.stringify(toolsUpdateEvent));
    this.onEvent(`Registered ${realtimeTools.length} tools`, { tools: realtimeTools.map(t => t.name) });
  }

  /**
   * Get list of available audio input devices
   */
  async getAudioInputDevices() {
    try {
      // requesting permission first to ensure labels are available
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
      return [];
    }
  }

  async start(deviceId = null, voice = 'alloy') {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_OPENAI_API_KEY missing. Set it in .env');
    }

    const constraints = deviceId
      ? { audio: { deviceId: { exact: deviceId } } }
      : { audio: true };

    this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.addEventListener('track', (event) => {
      if (event.track.kind === 'audio') {
        const [remoteStream] = event.streams;
        this.audioEl.srcObject = remoteStream;
      }
    });

    // Prepare sending audio
    for (const track of this.micStream.getAudioTracks()) {
      this.pc.addTransceiver(track, { direction: 'sendrecv' });
    }

    // Data channel for realtime events
    this.dataChannel = this.pc.createDataChannel('events');
    this.dataChannel.onmessage = (ev) => this.handleData(ev.data);
    this.dataChannel.onopen = () => this.onEvent('Data channel open');
    this.dataChannel.onerror = (err) => this.onEvent('Data channel error', { error: err.message });

    // Negotiate with OpenAI Realtime API
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp'
      },
      body: offer.sdp
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI Realtime negotiation failed: ${response.status} ${text}`);
    }

    const answerSdp = await response.text();
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    this.pc.onicecandidate = (event) => {
      // In this simple flow, trickle ICE to the server is not implemented.
      // The Realtime API currently returns an answer with candidates.
      if (!event.candidate) {
        this.onEvent('ICE gathering complete');
        // Register tools once data channel is ready
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          // Send session update to set voice and tools
          const sessionUpdate = {
            type: 'session.update',
            session: {
              voice: voice,
              tools: this.tools,
              tool_choice: 'auto',
              instructions: STRICT_INSTRUCTIONS
            }
          };
          this.dataChannel.send(JSON.stringify(sessionUpdate));
          this.onEvent(`Session config: ${voice}, ${this.tools.length} functional tools`);
        }
      }
    };

    // Wait for data channel to open, then register tools
    const originalOnOpen = this.dataChannel.onopen;
    this.dataChannel.onopen = () => {
      originalOnOpen();
      // Send session update to set voice and tools
      const sessionUpdate = {
        type: 'session.update',
        session: {
          voice: voice,
          tools: this.tools,
          tool_choice: 'auto',
          instructions: STRICT_INSTRUCTIONS
        }
      };
      this.dataChannel.send(JSON.stringify(sessionUpdate));
      this.onEvent(`Session config: ${voice}, ${this.tools.length} functional tools`);
    };

    this.onEvent('WebRTC connection established');
  }

  async handleData(raw) {
    try {
      const parsed = JSON.parse(raw);
      this.onEvent('Received event', parsed);

      // Detect completed function calls
      // Event: response.output_item.done
      // Item type: function_call
      if (parsed.type === 'response.output_item.done' && parsed.item && parsed.item.type === 'function_call') {
        const { name, arguments: argsString, call_id } = parsed.item;

        let args;
        try {
          args = JSON.parse(argsString);
        } catch (e) {
          console.warn('Failed to parse function arguments:', argsString);
          args = {};
        }

        if (this.onToolCall) {
          const result = await this.onToolCall({
            name,
            args,
            id: call_id
          });

          // Send result back to model depending on API spec
          // Using conversation.item.create for tool_output based on standard realtime patterns
          if (this.dataChannel?.readyState === 'open') {
            const toolOutputItem = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: call_id,
                output: JSON.stringify(result.data || result)
              }
            };

            this.dataChannel.send(JSON.stringify(toolOutputItem));
            this.dataChannel.send(JSON.stringify({ type: 'response.create' })); // Trigger model response
            this.onEvent('Tool result sent', { id: call_id });
          }
        }
      }
    } catch (err) {
      this.onEvent('Failed to process event', { error: err.message });
    }
  }

  stop() {
    try {
      this.dataChannel?.close();
      this.pc?.getSenders().forEach((s) => s.track && s.track.stop());
      this.pc?.close();
      this.micStream?.getTracks().forEach((t) => t.stop());

      // Stop audio analysis
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      this.analyser = null;
      this.source = null;
    } finally {
      this.pc = null;
      this.micStream = null;
      this.dataChannel = null;
    }
  }

  /**
   * Sets up audio analysis for the microphone stream
   * @param {function} onVolumeChange - Callback(volume) where volume is 0.0-1.0
   */
  setupAudioAnalysis(onVolumeChange) {
    if (!this.micStream) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(this.micStream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Normalize to 0-1 (approximate max volume is 128-256 depending on mic)
        const volume = Math.min(1, average / 128);

        onVolumeChange(volume);

        requestAnimationFrame(update);
      };

      update();
    } catch (err) {
      console.error('Failed to setup audio analysis:', err);
    }
  }
}
