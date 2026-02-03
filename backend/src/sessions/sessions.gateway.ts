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

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Cleanup Gemini session if Host disconnects
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (sessionData.hostId === client.id) {
        console.log(`Host left session ${sessionId}. Cleaning up Gemini.`);
        const finalSession = await this.sessionsService.findOne(sessionId);

        // FIX: Add this null check
        if (!finalSession) {
          console.error(
            `Could not find session ${sessionId} for final analysis`,
          );
          return;
        }

        // 2. trigger the report generation with ACTUAL data
        await this.analysisQueue.add('reproduce', {
          sessionId: sessionId,
          transcript: finalSession.transcript,
          dom_events: finalSession.events,
        });

        // 3. cleanup gemini session
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
    console.log(
      `Client ${client.id} joining session ${data.sessionId} as ${data.type || 'unknown'}`,
    );

    // Always join the room first so the client can receive future broadcasts
    client.join(data.sessionId);

    // If session is already active
    if (this.activeSessions.has(data.sessionId)) {
      const session = this.activeSessions.get(data.sessionId);
      console.log(
        `Session ${data.sessionId} active. Client ${client.id} joined as ${data.type || 'viewer'}.`,
      );

      // Request Snapshot from Host if a new Viewer joins
      if (data.type === 'viewer' || !data.type) {
        if (session && session.hostId) {
          console.log(`Requesting snapshot from host ${session.hostId}`);
          this.server.to(session.hostId).emit('request_snapshot');
        }
      }

      return {
        status: 'joined',
        sessionId: data.sessionId,
        role: data.type || 'viewer',
      };
    }

    // If not active, only HOST can start it
    if (data.type === 'viewer') {
      console.warn(
        `Viewer ${client.id} joined room for inactive session ${data.sessionId}`,
      );
      return { status: 'waiting', message: 'Session not yet started by host' };
    }

    // Assume Host (or unknown) is starting the session
    // client.join(data.sessionId); // Already joined above

    // Fetch session and mission details
    const sessionObj = await this.sessionsService.findOne(data.sessionId);
    const mission = sessionObj?.mission;

    // Initialize Gemini Live Session
    const geminiSession = await this.geminiService.createLiveSession(
      data.sessionId,
      (audioBase64) => {
        // Emit to ALL clients in the room (Host + Viewers)
        this.server.to(data.sessionId).emit('ai_audio', { audio: audioBase64 });
      },
      (trigger) => {
        // AI detected a hurdle
        this.server
          .to(data.sessionId)
          .emit('ai_intervention', { type: trigger });
      },
      (text) => {
        this.sessionsService.appendTranscript(data.sessionId, text);
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

    console.log(
      `[SessionsGateway] Session ${data.sessionId} started by host ${client.id}. Gemini session created.`,
    );

    // Notify viewers and request initial snapshot from host
    this.server
      .to(data.sessionId)
      .emit('session_started', { sessionId: data.sessionId });
    client.emit('request_snapshot');

    // Update status in DB
    await this.sessionsService.update(data.sessionId, { status: 'RUNNING' });

    return { status: 'joined', sessionId: data.sessionId, role: 'host' };
  }

  @SubscribeMessage('audio_chunk')
  handleAudioChunk(
    @MessageBody() chunk: any,
    @ConnectedSocket() client: Socket,
  ) {
    let sessionId = Array.from(client.rooms).find((r) => r !== client.id);

    // Fallback search if room lookup fails
    if (!sessionId) {
      for (const [id, data] of this.activeSessions.entries()) {
        if (data.hostId === client.id) {
          sessionId = id;
          break;
        }
      }
    }

    if (sessionId && this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.geminiSession.sendRealtimeInput({
        media: {
          data: chunk,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
      // Log occasionally to avoid spam
      if (Math.random() < 0.01) {
        console.log(
          `[SessionsGateway] Forwarding audio chunk for session ${sessionId}`,
        );
      }
    }
  }

  @SubscribeMessage('screen_frame')
  handleScreenFrame(
    @MessageBody() data: { frame: string }, // base64 jpeg
    @ConnectedSocket() client: Socket,
  ) {
    let sessionId = Array.from(client.rooms).find((r) => r !== client.id);

    // Fallback search
    if (!sessionId) {
      for (const [id, sData] of this.activeSessions.entries()) {
        if (sData.hostId === client.id) {
          sessionId = id;
          break;
        }
      }
    }

    if (sessionId && this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.geminiSession.sendRealtimeInput({
        media: {
          data: data.frame,
          mimeType: 'image/jpeg',
        },
      });

      // Broadcast to frontend viewers (exclude sender)
      client.broadcast.to(sessionId).emit('screen_frame', data);

      if (Math.random() < 0.05) {
        console.log(
          `[SessionsGateway] Broadcasting screen frame for session ${sessionId}`,
        );
      }
    }
  }

  @SubscribeMessage('rrweb_events')
  handleRrwebEvents(
    @MessageBody() events: any[],
    @ConnectedSocket() client: Socket,
  ) {
    let sessionId = Array.from(client.rooms).find((r) => r !== client.id);

    if (!sessionId) {
      for (const [id, sData] of this.activeSessions.entries()) {
        if (sData.hostId === client.id) {
          sessionId = id;
          break;
        }
      }
    }

    if (sessionId) {
      console.log(
        `[SessionsGateway] Received ${events.length} events for session ${sessionId}`,
      );
      // Broadcast to all viewers (excluding sender ideally, but sender is extension so it's fine)
      client.broadcast.to(sessionId).emit('rrweb_events', events);

      this.sessionsService.appendEvents(sessionId, events);
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
