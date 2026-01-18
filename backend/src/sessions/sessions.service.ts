import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

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

  remove(id: string) {
    return this.sessionsRepository.delete(id);
  }
}
