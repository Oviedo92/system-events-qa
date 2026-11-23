import { Test, TestingModule } from '@nestjs/testing';
import { ModeratorApplicationsService } from './moderator-applications.service';

describe('ModeratorApplicationsService', () => {
  let service: ModeratorApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModeratorApplicationsService],
    }).compile();

    service = module.get<ModeratorApplicationsService>(ModeratorApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
