import { Test, TestingModule } from '@nestjs/testing';
import { EventTemplatesController } from './event-templates.controller';

describe('EventTemplatesController', () => {
  let controller: EventTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventTemplatesController],
    }).compile();

    controller = module.get<EventTemplatesController>(EventTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
