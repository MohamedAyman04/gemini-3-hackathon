import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionsService } from './sessions.service';
import { SessionsGateway } from './sessions.gateway';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsGateway: SessionsGateway,
  ) { }

  @Post()
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @Get()
  findAll() {
    return this.sessionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const session = await this.sessionsService.findOne(id);
    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }
    return session;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto) {
    return this.sessionsService.update(id, updateSessionDto);
  }

  @Post(':id/finalize')
  @UseInterceptors(FileInterceptor('video'))
  async finalize(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('logs') logs: string, // Received as stringified JSON
  ) {
    const parsedLogs = logs ? JSON.parse(logs) : [];
    const updatedSession = await this.sessionsService.finalize(
      id,
      file,
      parsedLogs,
    );
    this.sessionsGateway.notifySessionEnded(id, updatedSession);
    return updatedSession;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }
}
