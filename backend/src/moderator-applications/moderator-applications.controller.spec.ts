import { Test, TestingModule } from '@nestjs/testing';
import { ModeratorApplicationsController } from './moderator-applications.controller';

describe('ModeratorApplicationsController', () => {
  let controller: ModeratorApplicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModeratorApplicationsController],
    }).compile();

    controller = module.get<ModeratorApplicationsController>(ModeratorApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
