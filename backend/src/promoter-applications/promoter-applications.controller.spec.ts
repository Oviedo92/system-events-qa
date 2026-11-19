import { Test, TestingModule } from '@nestjs/testing';
import { PromoterApplicationsController } from './promoter-applications.controller';

describe('PromoterApplicationsController', () => {
  let controller: PromoterApplicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromoterApplicationsController],
    }).compile();

    controller = module.get<PromoterApplicationsController>(PromoterApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
