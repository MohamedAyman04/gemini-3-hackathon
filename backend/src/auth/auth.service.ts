import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async login(email: string, pass: string) {
    // For hackathon: simple mock auth
    // In real app, verify password hash
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Create a mock user for convenience during hackathon
      user = this.userRepository.create({
        email,
        name: email.split('@')[0],
        password: pass, // Should be hashed
        avatarUrl: `https://ui-avatars.com/api/?name=${email}&background=random`,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  async signup(name: string, email: string, password: string) {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = this.userRepository.create({
      name,
      email,
      password, // Should be hashed in production
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    });

    return await this.userRepository.save(user);
  }

  async findById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }
}
