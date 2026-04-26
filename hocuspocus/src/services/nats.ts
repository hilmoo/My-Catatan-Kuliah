import { connect, type NatsConnection, type JetStreamClient } from "nats";

export class NatsService {
  private nc?: NatsConnection;
  public js?: JetStreamClient;

  constructor(private serverUrl: string) {}

  async connect(): Promise<void> {
    this.nc = await connect({ servers: this.serverUrl });
    this.js = this.nc.jetstream();

    await this.nc.flush();
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.close();
    }
  }
}
