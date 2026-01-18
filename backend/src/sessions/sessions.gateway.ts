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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeSessions = new Map<string, any>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly geminiService: GeminiService,
    @InjectQueue('analysis') private analysisQueue: Queue,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Cleanup Gemini session if exists
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (sessionData.clientId === client.id) {
        sessionData.geminiSession.close();
        this.activeSessions.delete(sessionId);
      }
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Client ${client.id} joining session ${data.sessionId}`);
    client.join(data.sessionId);

    // Fetch session and mission details
    const sessionObj = await this.sessionsService.findOne(data.sessionId);
    const mission = sessionObj?.mission;

    // Initialize Gemini Live Session
    const geminiSession = this.geminiService.createLiveSession(
      data.sessionId,
      (audioBase64) => {
        // Emit back to extension for playback
        client.emit('ai_audio', { audio: audioBase64 });
      },
      (trigger) => {
        // AI detected a hurdle
        client.emit('ai_intervention', { type: trigger });
      },
      {
        url: mission?.url,
        context: mission?.context,
      },
    );

    this.activeSessions.set(data.sessionId, {
      clientId: client.id,
      geminiSession,
    });

    return { status: 'joined', sessionId: data.sessionId };
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
      session.geminiSession.sendImage(buffer);
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
