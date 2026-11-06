import type { DemoUser, Ride } from './types.ts';

export interface DemoUserRepository {
  list(): DemoUser[];
  findById(id: string): DemoUser | undefined;
}

export interface RideRepository {
  list(): Ride[];
  create(ride: Ride): Ride;
}

export class InMemoryDemoUserRepository implements DemoUserRepository {
  private readonly users: DemoUser[];

  constructor(users: DemoUser[]) {
    this.users = users;
  }

  list(): DemoUser[] {
    return this.users.map((user) => ({ ...user }));
  }

  findById(id: string): DemoUser | undefined {
    const user = this.users.find((candidate) => candidate.id === id);
    return user ? { ...user } : undefined;
  }
}

export class InMemoryRideRepository implements RideRepository {
  private readonly rides: Ride[];

  constructor(rides: Ride[] = []) {
    this.rides = rides;
  }

  list(): Ride[] {
    return this.rides.map((ride) => ({ ...ride }));
  }

  create(ride: Ride): Ride {
    if (this.rides.some((candidate) => candidate.id === ride.id)) {
      throw new Error(`Ride id already exists: ${ride.id}`);
    }
    this.rides.push({ ...ride });
    return { ...ride };
  }
}

export const demoUserRepository = new InMemoryDemoUserRepository([
  { id: 'demo-alex', displayName: 'Alex Morgan' },
  { id: 'demo-priya', displayName: 'Priya Shah' },
  { id: 'demo-omar', displayName: 'Omar Ali' },
  { id: 'demo-sara', displayName: 'Sara Chen' },
  { id: 'demo-jordan', displayName: 'Jordan Lee' },
]);

export const rideRepository = new InMemoryRideRepository();
