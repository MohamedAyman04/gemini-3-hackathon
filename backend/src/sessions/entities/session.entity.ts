import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Mission } from '../../missions/entities/mission.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mission, (mission) => mission.sessions)
  mission: Mission;

  @Column()
  missionId: string;

  @Column({ default: 'PENDING' })
  status: string; // PENDING, RUNNING, COMPLETED, FAILED, ANALYZED

  @Column('text', { nullable: true })
  videoUrl: string;

  @Column('jsonb', { nullable: true })
  logs: any;

  @Column('jsonb', { nullable: true })
  analysis: any;

  @CreateDateColumn()
  createdAt: Date;
}
