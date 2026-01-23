import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private geminiService: GeminiService,
  ) { }

  create(createSessionDto: CreateSessionDto) {
    const session = this.sessionsRepository.create(createSessionDto);
    return this.sessionsRepository.save(session);
  }

  findAll() {
    return this.sessionsRepository.find();
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

    // Generate Summary
    try {
      // For now we don't have a separate transcript field, assuming logs might contain it or we just use logs
      // In a real scenario, we'd capture the transcript from the live session and store it.
      // Since we don't have transcript storage yet, we'll pass empty string or extract from logs if possible.
      const summary = await this.geminiService.generateSessionSummary('', logs);
      session.analysis = { summary };
    } catch (e) {
      console.error("Failed to generate summary", e);
    }

    return this.sessionsRepository.save(session);
  }

  remove(id: string) {
    return this.sessionsRepository.delete(id);
  }
}
