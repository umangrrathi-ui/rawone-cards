import mysql from "mysql2/promise";

const TABLES = [
  `CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(12) NOT NULL UNIQUE,
    slug VARCHAR(40) NOT NULL UNIQUE,
    theme VARCHAR(30) NOT NULL,
    status ENUM('active','off') NOT NULL DEFAULT 'active',
    name VARCHAR(80) NOT NULL,
    company VARCHAR(80) NULL,
    data MEDIUMTEXT NULL,
    photo MEDIUMTEXT NULL,
    logo MEDIUMTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS card_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    type VARCHAR(16) NOT NULL,
    src VARCHAR(8) NOT NULL DEFAULT 'link',
    visitor VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_card_time (card_id, created_at),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS card_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    name VARCHAR(80) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    note VARCHAR(300) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_card_phone (card_id, phone),
    INDEX idx_card_time (card_id, created_at),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Columns added after v1 go here: [table, column, definition]. Only ADD, never drop/rename.
const COLUMNS = [];

function makePool() {
  const url = process.env.DATABASE_URL;
  const opts = url
    ? { uri: url }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };
  const pool = mysql.createPool({ ...opts, connectionLimit: 6, waitForConnections: true, timezone: "Z", charset: "utf8mb4" });
  pool.pool.on("connection", (c) => c.query("SET time_zone = '+00:00'"));
  return pool;
}

async function migrate(pool) {
  for (const sql of TABLES) await pool.query(sql);
  for (const [table, col, def] of COLUMNS) {
    const [r] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, col]
    );
    if (!r.length) {
      try {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      } catch (e) {
        if (e.code !== "ER_DUP_FIELDNAME") throw e;
      }
    }
  }
}

export async function q(sql, params = []) {
  if (!globalThis.__cardsPool) {
    globalThis.__cardsPool = makePool();
    globalThis.__cardsReady = migrate(globalThis.__cardsPool).catch((e) => {
      globalThis.__cardsPool = null;
      throw e;
    });
  }
  await globalThis.__cardsReady;
  const [rows] = await globalThis.__cardsPool.query(sql, params);
  return rows;
}
