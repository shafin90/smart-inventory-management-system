const { Pool } = require("pg");
const { databaseUrl, dbPoolMax, dbPoolMin } = require("../config/env");

const pool = new Pool({
  connectionString: databaseUrl,
  max: dbPoolMax,                    // max simultaneous connections to PG
  min: dbPoolMin,                    // keep this many connections warm
  idleTimeoutMillis: 30_000,         // close idle connections after 30 s
  connectionTimeoutMillis: 5_000,    // error if we can't get a connection in 5 s
  statement_timeout: 30_000,         // kill any query running > 30 s
});

pool.on("error", (err) =>
  console.error("[DB] Unexpected pool client error:", err.message)
);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool, // exposed for health-check / metrics
};
