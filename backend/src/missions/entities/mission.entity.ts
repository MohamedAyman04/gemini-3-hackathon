import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';

@Entity()
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column('text')
  context: string;

  @Column('jsonb', { nullable: true })
  happyPath: any;

  @Column({ nullable: true })
  githubToken: string;

  @Column({ nullable: true })
  jiraToken: string;

  @Column({ nullable: true })
  trelloToken: string;

  @Column({
    type: 'enum',
    enum: ['none', 'jira', 'trello'],
    default: 'none',
  })
  integrationType: string;

  @OneToMany(() => Session, (session) => session.mission)
  sessions: Session[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
