const amqp = require("amqplib");
const { rabbitmqUrl } = require("../config/env");

let channel;

async function connectQueue() {
  const connection = await amqp.connect(rabbitmqUrl);
  channel = await connection.createChannel();
  await channel.assertQueue("restock_events", { durable: true });

  connection.on("error", (err) => console.error("RabbitMQ connection error:", err.message));
  connection.on("close", () => console.warn("RabbitMQ connection closed"));
}

function getChannel() {
  return channel;
}

function publishRestockEvent(payload) {
  if (!channel) {
    console.warn("RabbitMQ channel not ready — restock event dropped:", payload);
    return;
  }
  channel.sendToQueue("restock_events", Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}

module.exports = { connectQueue, getChannel, publishRestockEvent };
