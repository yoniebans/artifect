import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() { }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}