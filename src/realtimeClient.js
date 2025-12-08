const MODEL = 'gpt-4o-realtime-preview';
const API_URL = `https://api.openai.com/v1/realtime?model=${MODEL}`;

export default class RealtimeClient {
  constructor({ onToolCall, onEvent, audioEl }) {
    this.onToolCall = onToolCall;
    this.onEvent = onEvent || (() => {});
    this.audioEl = audioEl;
    this.pc = null;
    this.micStream = null;
    this.dataChannel = null;
  }

  async start() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_OPENAI_API_KEY missing. Set it in .env');
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
      if (!event.candidate) this.onEvent('ICE gathering complete');
    };

    this.onEvent('WebRTC connection established');
  }

  async handleData(raw) {
    try {
      const parsed = JSON.parse(raw);
      this.onEvent('Received event', parsed);

      // Detect tool calls (example schema: { type: "tool_call", name, args, id })
      if (parsed.type === 'tool_call' && this.onToolCall) {
        const result = await this.onToolCall({
          name: parsed.name,
          args: parsed.args,
          id: parsed.id
        });

        // Send result back to model if data channel is open
        if (this.dataChannel?.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'tool_result',
            id: parsed.id,
            result
          }));
          this.onEvent('Tool result sent', { id: parsed.id });
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
    } finally {
      this.pc = null;
      this.micStream = null;
      this.dataChannel = null;
    }
  }
}
