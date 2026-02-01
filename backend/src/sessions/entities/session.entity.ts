import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Mission } from '../../missions/entities/mission.entity';

export interface SessionType {
  id: string;
  missionId: string;
  mission: Mission;
  status: string;
  videoUrl: string;
  logs: any;
  transcript: string;
  analysis: any;
  events: any[];
}

@Entity()
export class Session implements SessionType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mission, (mission) => mission.sessions)
  mission: Mission;

  @Column()
  missionId: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column('text', { nullable: true })
  videoUrl: string;

  @Column('jsonb', { nullable: true })
  logs: any;

  @Column('jsonb', { nullable: true })
  analysis: any;

  @Column('jsonb', { nullable: true })
  transcript: string;

  @Column('jsonb', { nullable: true, default: [] })
  events: any[];

  @CreateDateColumn()
  createdAt: Date;
}
