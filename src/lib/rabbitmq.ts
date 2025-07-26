import amqp from "amqplib";
import { CodeChange } from "@/types/collaboration";

export class RabbitMQCollaboration {
  private static connection: any;
  private static channel: any;

  static async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:password@localhost:5672"
      );
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange("collaboration", "direct", {
        durable: true,
      });
      await this.channel.assertQueue("code-changes", { durable: true });
      await this.channel.assertQueue("conflict-resolution", { durable: true });

      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
    }
  }

  static async publishCodeChange(
    sessionId: string,
    change: CodeChange
  ): Promise<void> {
    if (!this.channel) await this.connect();

    const message = JSON.stringify({ sessionId, change });
    await this.channel.publish(
      "collaboration",
      "code-change",
      Buffer.from(message)
    );
  }

  static async consumeCodeChanges(
    callback: (sessionId: string, change: CodeChange) => void
  ): Promise<void> {
    if (!this.channel) await this.connect();

    await this.channel.consume("code-changes", (msg: any) => {
      if (msg) {
        const { sessionId, change } = JSON.parse(msg.content.toString());
        callback(sessionId, change);
        this.channel.ack(msg);
      }
    });
  }

  static async publishConflictResolution(
    sessionId: string,
    resolvedCode: string
  ): Promise<void> {
    if (!this.channel) await this.connect();

    const message = JSON.stringify({
      sessionId,
      resolvedCode,
      timestamp: Date.now(),
    });
    await this.channel.publish(
      "collaboration",
      "conflict-resolved",
      Buffer.from(message)
    );
  }

  static async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
