export class LiveActivityEvent {
  constructor(
    public readonly parkingAvenueId: string,
    public readonly type: 'RESERVATION' | 'WALK_IN',
    public readonly message: string,
    public readonly timestamp: Date = new Date(),
    public readonly metadata?: any,
  ) {}
}