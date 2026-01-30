import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from './sessions.service';
import { GeminiService } from '../gemini/gemini.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeSessions = new Map<string, any>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly geminiService: GeminiService,
    @InjectQueue('analysis') private analysisQueue: Queue,
  ) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Cleanup Gemini session if Host disconnects
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (sessionData.hostId === client.id) {
        console.log(`Host left session ${sessionId}. Cleaning up Gemini.`);
        this.server.to(sessionId).emit('session_ended', { reason: 'Host ended the session' });
        sessionData.geminiSession.close();
        this.sessionsService.update(sessionId, { status: 'COMPLETED' });
        this.activeSessions.delete(sessionId);
      }
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string; type?: 'host' | 'viewer' },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Client ${client.id} joining session ${data.sessionId} as ${data.type || 'unknown'}`);

    // If session is already active
    if (this.activeSessions.has(data.sessionId)) {
      client.join(data.sessionId);
      console.log(`Session ${data.sessionId} active. Client ${client.id} joined as ${data.type || 'viewer'}.`);

      // Request Snapshot from Host if a new Viewer joins
      if (data.type === 'viewer' || !data.type) {
        const session = this.activeSessions.get(data.sessionId);
        if (session && session.hostId) {
          console.log(`Requesting snapshot from host ${session.hostId}`);
          this.server.to(session.hostId).emit('request_snapshot');
        }
      }

      return { status: 'joined', sessionId: data.sessionId, role: data.type || 'viewer' };
    }

    // If not active, only HOST can start it
    if (data.type === 'viewer') {
      console.warn(`Viewer ${client.id} tried to join inactive session ${data.sessionId}`);
      return { status: 'error', message: 'Session not active' };
    }

    // Assume Host (or unknown) is starting the session
    client.join(data.sessionId);

    // Fetch session and mission details
    const sessionObj = await this.sessionsService.findOne(data.sessionId);
    const mission = sessionObj?.mission;

    // Initialize Gemini Live Session
    const geminiSession = this.geminiService.createLiveSession(
      data.sessionId,
      (audioBase64) => {
        // Emit to ALL clients in the room (Host + Viewers)
        this.server.to(data.sessionId).emit('ai_audio', { audio: audioBase64 });
      },
      (trigger) => {
        // AI detected a hurdle
        this.server.to(data.sessionId).emit('ai_intervention', { type: trigger });
      },
      (text) => {
        // AI sent a text reply
        this.server.to(data.sessionId).emit('ai_text', { text });
      },
      {
        url: mission?.url,
        context: mission?.context,
      },
    );

    this.activeSessions.set(data.sessionId, {
      hostId: client.id,
      geminiSession,
    });

    // Update status in DB
    await this.sessionsService.update(data.sessionId, { status: 'RUNNING' });

    console.log(`Session ${data.sessionId} started by host ${client.id}`);
    return { status: 'joined', sessionId: data.sessionId, role: 'host' };
  }

  @SubscribeMessage('audio_chunk')
  handleAudioChunk(
    @MessageBody() chunk: any,
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = Array.from(client.rooms).find((r) => r !== client.id);
    if (sessionId && this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      // chunk should be a Buffer or base64
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      session.geminiSession.sendAudio(buffer);
    }
  }

  @SubscribeMessage('screen_frame')
  handleScreenFrame(
    @MessageBody() data: { frame: string }, // base64 jpeg
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = Array.from(client.rooms).find((r) => r !== client.id);
    if (sessionId && this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      const buffer = Buffer.from(data.frame, 'base64');

      console.log(`Gateway: Received Screen Frame (${buffer.length} bytes) for session ${sessionId}`);

      session.geminiSession.sendImage(buffer);

      // Broadcast to frontend viewers (exclude sender)
      client.broadcast.to(sessionId).emit('screen_frame', data);
    }
  }

  @SubscribeMessage('rrweb_events')
  handleRrwebEvents(
    @MessageBody() events: any[],
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = Array.from(client.rooms).find((r) => r !== client.id);
    if (sessionId) {
      // Broadcast to all viewers (excluding sender ideally, but sender is extension so it's fine)
      client.broadcast.to(sessionId).emit('rrweb_events', events);
    }
  }

  @SubscribeMessage('trigger_report')
  async handleTriggerReport(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Hurdle detected! Triggering report generation.');
    const sessionId = Array.from(client.rooms).find((r) => r !== client.id);

    await this.analysisQueue.add('reproduce', {
      sessionId,
      ...data, // Contains rrweb_log, transcript, etc.
    });

    return { status: 'queued' };
  }
}
