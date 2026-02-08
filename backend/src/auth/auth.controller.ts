import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.login(body.email, body.password);

    // Set cookie for the extension
    // In a real app, this would be a secure session ID
    response.cookie('connect.sid', user.id, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000 * 24 * 7,
      partitioned: true,
    } as any);

    return user;
  }

  @Post('signup')
  async signup(
    @Body() body: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.signup(
      body.name,
      body.email,
      body.password,
    );

    response.cookie('connect.sid', user.id, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000 * 24 * 7,
      partitioned: true,
    } as any);

    return user;
  }

  @Get('me')
  async me(@Req() request: Request) {
    const userId = request.cookies['connect.sid'];
    if (!userId) {
      throw new UnauthorizedException();
    }
    const user = await this.authService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('connect.sid', {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      partitioned: true,
    } as any);
    return { message: 'Logged out successfully' };
  }
}
