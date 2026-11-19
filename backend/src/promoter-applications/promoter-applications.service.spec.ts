import { Test, TestingModule } from '@nestjs/testing';
import { PromoterApplicationsService } from './promoter-applications.service';

describe('PromoterApplicationsService', () => {
  let service: PromoterApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromoterApplicationsService],
    }).compile();

    service = module.get<PromoterApplicationsService>(PromoterApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
