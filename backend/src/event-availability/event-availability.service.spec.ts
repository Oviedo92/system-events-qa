import { Test, TestingModule } from '@nestjs/testing';
import { EventAvailabilityService } from './event-availability.service';

describe('EventAvailabilityService', () => {
  let service: EventAvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventAvailabilityService],
    }).compile();

    service = module.get<EventAvailabilityService>(EventAvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
