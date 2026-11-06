import { demoUserRepository, rideRepository } from './repositories.ts';
import { RideService } from './service.ts';

export const rideService = new RideService(rideRepository, demoUserRepository);
