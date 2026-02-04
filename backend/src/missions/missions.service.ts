import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { Mission } from './entities/mission.entity';
import { encrypt } from '../utils/encryption.util';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private missionsRepository: Repository<Mission>,
  ) {}

  create(createMissionDto: CreateMissionDto) {
    const data = { ...createMissionDto };
    if (data.githubToken) data.githubToken = encrypt(data.githubToken);
    if (data.jiraToken) data.jiraToken = encrypt(data.jiraToken);
    if (data.trelloToken) data.trelloToken = encrypt(data.trelloToken);

    const mission = this.missionsRepository.create(data);
    return this.missionsRepository.save(mission);
  }

  findAll() {
    return this.missionsRepository.find({
      relations: ['sessions'],
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string) {
    return this.missionsRepository.findOne({ where: { id } });
  }

  update(id: string, updateMissionDto: UpdateMissionDto) {
    return this.missionsRepository.update(id, updateMissionDto);
  }

  remove(id: string) {
    return this.missionsRepository.delete(id);
  }
}
