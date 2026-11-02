import mysql from "mysql2/promise";
import { blindIndex, seal } from "./crypto";

// All times UTC. Every user-owned table carries user_id (directly or via card_id) and every query filters on it.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(160) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    pass_hash VARCHAR(200) NOT NULL,
    role ENUM('user','support','admin') NOT NULL DEFAULT 'user',
    status ENUM('pending','active','blocked') NOT NULL DEFAULT 'pending',
    token_ver INT NOT NULL DEFAULT 1,
    totp_secret VARCHAR(200) NULL,
    plan ENUM('free','pro','top') NOT NULL DEFAULT 'free',
    plan_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS email_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    purpose ENUM('verify','reset') NOT NULL,
    code_hash CHAR(64) NOT NULL,
    tries TINYINT NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    INDEX idx_user (user_id, purpose),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code CHAR(8) NOT NULL UNIQUE,
    slug VARCHAR(40) NOT NULL UNIQUE,
    theme VARCHAR(30) NOT NULL,
    status ENUM('draft','live','off','blocked') NOT NULL DEFAULT 'draft',
    data JSON NOT NULL,
    style JSON NOT NULL,
    photo_key VARCHAR(80) NULL,
    logo_key VARCHAR(80) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS card_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    type VARCHAR(16) NOT NULL,
    src ENUM('nfc','qr','link') NOT NULL DEFAULT 'link',
    visitor CHAR(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_card_time (card_id, created_at),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    name VARCHAR(600) NOT NULL,
    phone VARCHAR(200) NOT NULL,
    phone_h CHAR(64) NULL,
    note TEXT NULL,
    consent_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_card_phone_h (card_id, phone_h),
    INDEX idx_card_time (card_id, created_at),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NOT NULL,
    action VARCHAR(40) NOT NULL,
    target VARCHAR(60) NOT NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_time (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS abuse_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    reason VARCHAR(40) NOT NULL,
    note VARCHAR(300) NULL,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status, created_at),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Columns added after v1: [table, column, definition]. Only ADD, never drop or rename.
const COLUMNS = [
  ["leads", "phone_h", "CHAR(64) NULL"],
];

function makePool() {
  const url = process.env.DATABASE_URL;
  const base = url
    ? { uri: url }
    : {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };
  const pool = mysql.createPool({
    ...base,
    connectionLimit: Number(process.env.DB_POOL || 8),
    waitForConnections: true,
    timezone: "Z",
    charset: "utf8mb4",
    dateStrings: false,
  });
  pool.pool.on("connection", (c) => c.query("SET time_zone = '+00:00'"));
  return pool;
}

// Leads hold other people's names and phone numbers, so they are encrypted at rest.
// This upgrades databases made before that: wider columns, a blind index for duplicates, and encrypts old rows.
async function lockLeads(pool) {
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME AS c, CHARACTER_MAXIMUM_LENGTH AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME IN ('name','phone','note')"
  );
  const len = Object.fromEntries(cols.map((r) => [r.c, Number(r.n)]));
  if ((len.name || 0) < 600 || (len.phone || 0) < 200 || (len.note || 0) < 65535) {
    await pool.query("ALTER TABLE `leads` MODIFY `name` VARCHAR(600) NOT NULL, MODIFY `phone` VARCHAR(200) NOT NULL, MODIFY `note` TEXT NULL");
  }
  const [idx] = await pool.query("SELECT INDEX_NAME AS i FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads'");
  const have = new Set(idx.map((r) => r.i));
  if (!have.has("uniq_card_phone_h")) await pool.query("ALTER TABLE `leads` ADD UNIQUE KEY `uniq_card_phone_h` (`card_id`, `phone_h`)");
  if (have.has("uniq_card_phone")) await pool.query("ALTER TABLE `leads` DROP INDEX `uniq_card_phone`");
  const [old] = await pool.query("SELECT id, name, phone, note FROM leads WHERE phone_h IS NULL LIMIT 5000");
  for (const r of old) {
    const plain = !String(r.phone).startsWith("enc:v1:");
    await pool.query("UPDATE leads SET name = ?, phone = ?, note = ?, phone_h = ? WHERE id = ?", [
      plain ? seal(r.name) : r.name,
      plain ? seal(r.phone) : r.phone,
      plain && r.note ? seal(r.note) : r.note,
      plain ? blindIndex(r.phone) : blindIndex(String(r.id)),
      r.id,
    ]);
  }
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
  await lockLeads(pool);
  // widen users.plan on databases created before the Top plan existed (keeps every existing value)
  const [pl] = await pool.query(
    "SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plan'"
  );
  if (pl.length && !String(pl[0].t).includes("'top'")) {
    await pool.query("ALTER TABLE `users` MODIFY `plan` ENUM('free','pro','top') NOT NULL DEFAULT 'free'");
  }
}

function pool() {
  if (!globalThis.__cardsPool) {
    globalThis.__cardsPool = makePool();
    globalThis.__cardsReady = migrate(globalThis.__cardsPool).catch((e) => {
      globalThis.__cardsPool = null;
      throw e;
    });
  }
  return globalThis.__cardsPool;
}

export async function q(sql, params = []) {
  const p = pool();
  await globalThis.__cardsReady;
  const [rows] = await p.query(sql, params);
  return rows;
}

export async function dbOk() {
  try {
    await q("SELECT 1");
    return true;
  } catch (e) {
    console.error("db", e.code || e.message);
    return false;
  }
}
