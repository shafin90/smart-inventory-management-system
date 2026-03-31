/**
 * RabbitMQ consumer for restock_events queue.
 * Processes low-stock notifications — logs them and can trigger
 * downstream actions (e.g. email alerts, external ERP calls).
 */

const { getChannel } = require("./rabbitmq");

async function startConsumer() {
  const channel = getChannel();
  if (!channel) {
    console.warn("Consumer: RabbitMQ channel not available.");
    return;
  }

  console.log("[Queue] Consumer listening on restock_events");

  channel.consume(
    "restock_events",
    (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        console.log(
          `[Queue] Restock event received — product #${event.productId} | priority: ${event.priority} | stock: ${event.stockQuantity}`
        );
        // Future: send email, call webhook, etc.
        channel.ack(msg);
      } catch (err) {
        console.error("[Queue] Failed to process restock event:", err.message);
        channel.nack(msg, false, false); // dead-letter without requeue
      }
    },
    { noAck: false }
  );
}

module.exports = { startConsumer };
