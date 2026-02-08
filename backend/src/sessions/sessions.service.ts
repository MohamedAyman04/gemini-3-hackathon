import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';
import { GeminiService } from '../gemini/gemini.service';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private geminiService: GeminiService,
    @InjectQueue('analysis') private analysisQueue: Queue,
  ) { }

  create(createSessionDto: CreateSessionDto) {
    const session = this.sessionsRepository.create(createSessionDto);
    return this.sessionsRepository.save(session);
  }

  findAll() {
    return this.sessionsRepository.find({
      relations: ['mission'],
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string) {
    return this.sessionsRepository.findOne({
      where: { id },
      relations: ['mission'],
    });
  }

  update(id: string, updateSessionDto: UpdateSessionDto) {
    return this.sessionsRepository.update(id, updateSessionDto);
  }

  async finalize(id: string, file: Express.Multer.File, logs: any) {
    const session = await this.findOne(id);
    if (!session) {
      throw new Error('Session not found');
    }

    // Save file locally (for now)
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `${id}-${Date.now()}.webm`;
    const filepath = path.join(uploadDir, filename);

    if (file) {
      fs.writeFileSync(filepath, file.buffer);
      session.videoUrl = `/uploads/${filename}`;
    }

    session.logs = logs;
    session.status = 'COMPLETED';

    // Save the initial state (video uploaded, status completed)
    const savedSession = await this.sessionsRepository.save(session);

    // Trigger AI Analysis & Queue Jobs in the background (Fire-and-forget)
    this.runBackgroundAnalysis(savedSession, filepath).catch((e) =>
      console.error(`[SessionsService] Background analysis failed for session ${id}:`, e),
    );

    return savedSession;
  }

  private async runBackgroundAnalysis(session: Session, videoPath: string) {
    // 1. Generate Summary
    try {
      const summary = await this.geminiService.generateSessionSummary(
        session.transcript || '',
        session.logs,
        session.issues || [],
      );

      // Update session with summary
      await this.sessionsRepository.update(session.id, {
        analysis: { summary },
      } as any);
    } catch (e) {
      console.error(`[SessionsService] Failed to generate summary for ${session.id}`, e);
    }

    // 2. Queue Advanced Processing
    if (session.issues && session.issues.length > 0) {
      const absoluteVideoPath = require('path').resolve(videoPath);
      await this.analysisQueue.add('process_session_issues', {
        sessionId: session.id,
        issues: session.issues || [],
        videoPath: absoluteVideoPath,
        transcript: session.transcript || '',
        logs: session.logs || [],
        url: session.mission?.url,
        sessionStartTime: session.createdAt.getTime(),
      });
    }
  }

  async appendEvents(sessionId: string, newEvents: any[]) {
    // Use COALESCE to handle the case where the events column is initially NULL
    return this.sessionsRepository
      .createQueryBuilder()
      .update(Session)
      .set({
        events: () => `COALESCE(events, '[]'::jsonb) || :newEvents::jsonb`,
      })
      .setParameter('newEvents', JSON.stringify(newEvents)) // Driver handles escaping!
      .where('id = :id', { id: sessionId })
      .execute();
  }

  async appendTranscript(sessionId: string, text: string) {
    const session = await this.findOne(sessionId);
    const updatedTranscript = (session?.transcript || '') + text;
    return this.update(sessionId, { transcript: updatedTranscript });
  }

  async appendIssue(sessionId: string, issue: any) {
    console.log(`[SessionsService] Appending issue to session ${sessionId}:`, JSON.stringify(issue));
    try {
      const result = await this.sessionsRepository
        .createQueryBuilder()
        .update(Session)
        .set({
          issues: () => `COALESCE(issues, '[]'::jsonb) || :newIssue::jsonb`,
        })
        .setParameter('newIssue', JSON.stringify([issue]))
        .where('id = :id', { id: sessionId })
        .execute();

      console.log(`[SessionsService] Append result:`, result);
      return result;
    } catch (error) {
      console.error(`[SessionsService] Failed to append issue:`, error);
      throw error;
    }
  }

  remove(id: string) {
    return this.sessionsRepository.delete(id);
  }
}
