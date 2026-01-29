import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.cookies['connect.sid'];

    if (!userId) {
      throw new UnauthorizedException('No session cookie found');
    }

    const user = await this.authService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    // Attach user to request
    request.user = user;
    return true;
  }
}
