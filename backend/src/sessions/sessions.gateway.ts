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

@WebSocketGateway({
  cors: {
    origin: '*', // Allow extension to connect from any origin
  },
})
export class SessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly sessionsService: SessionsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Client ${client.id} joining session ${data.sessionId}`);
    client.join(data.sessionId);
    return { status: 'joined', sessionId: data.sessionId };
  }

  @SubscribeMessage('audio_chunk')
  handleAudioChunk(
    @MessageBody() chunk: ArrayBuffer, // or Buffer/Blob depending on how it's sent
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Pipe to Gemini Live Service
    // For now, just log size
    // console.log(`Received audio chunk: ${chunk.byteLength} bytes`);
  }

  @SubscribeMessage('trigger_report')
  handleTriggerReport(
    @MessageBody() data: any, // { timestamp, dom_events, video_blob, transcript }
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Hurdle detected! Triggering report generation.');
    // TODO: Send to BullMQ Analysis Queue
  }
}
