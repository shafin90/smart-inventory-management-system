const amqp = require("amqplib");
const { EventEmitter } = require("events");
const { rabbitmqUrl } = require("../config/env");

let channel = null;

// Emits 'disconnected' so server.js can schedule a reconnect
const mqEvents = new EventEmitter();

async function connectQueue() {
  const connection = await amqp.connect(rabbitmqUrl);
  channel = await connection.createChannel();

  // Limit unacknowledged messages per consumer — prevents memory pressure
  // under high restock event volume
  await channel.prefetch(10);
  await channel.assertQueue("restock_events", { durable: true });

  connection.on("error", (err) => {
    console.error("[MQ] Connection error:", err.message);
    channel = null;
  });

  connection.on("close", () => {
    console.warn("[MQ] Connection closed — scheduling reconnect");
    channel = null;
    mqEvents.emit("disconnected");
  });
}

function getChannel() {
  return channel;
}

function publishRestockEvent(payload) {
  if (!channel) {
    console.warn("[MQ] Channel not ready — restock event dropped:", payload);
    return;
  }
  channel.sendToQueue(
    "restock_events",
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
}

module.exports = { connectQueue, getChannel, publishRestockEvent, mqEvents };
