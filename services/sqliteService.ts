let dbInstance: any = null;

export const initDB = async () => {
  if (dbInstance) return dbInstance;

  if (typeof (window as any).initSqlJs !== 'function') {
    console.error("SQL.js not loaded");
    return null;
  }

  // @ts-ignore
  const SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  const savedDb = localStorage.getItem('quest_sqlite_db');
  if (savedDb) {
    try {
      const parsed = JSON.parse(savedDb);
      const uInt8Array = new Uint8Array(parsed);
      dbInstance = new SQL.Database(uInt8Array);
      // Run migrations on existing DB to ensure new columns exist
      runMigrations(dbInstance);
    } catch (e) {
      console.error("Failed to load saved DB, resetting", e);
      dbInstance = new SQL.Database();
      runMigrations(dbInstance);
    }
  } else {
    dbInstance = new SQL.Database();
    runMigrations(dbInstance);
  }

  return dbInstance;
};

const runMigrations = (db: any) => {
  try {
    // 1. Create tables if they don't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        staked_balance INTEGER DEFAULT 0,
        mana REAL DEFAULT 100.0,
        last_mana_sync INTEGER DEFAULT 0,
        has_pass BOOLEAN DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        last_node_activation INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        from_user TEXT,
        to_user TEXT,
        amount INTEGER,
        type TEXT,
        timestamp INTEGER,
        memo TEXT,
        signature TEXT,
        block_index INTEGER DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS blocks (
        index_id INTEGER PRIMARY KEY,
        hash TEXT,
        prev_hash TEXT,
        validator TEXT,
        timestamp INTEGER,
        tx_count INTEGER,
        witness_sig TEXT,
        block_data TEXT,
        merkle_root TEXT,
        chain_id TEXT
      );

      CREATE TABLE IF NOT EXISTS nfts (
        id TEXT PRIMARY KEY,
        owner TEXT,
        type TEXT,
        sub_type TEXT,
        value INTEGER,
        rarity TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        number INTEGER,
        amount INTEGER,
        timestamp INTEGER,
        draw_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS witnesses (
        username TEXT PRIMARY KEY,
        votes INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT 1
      );
    `);

    // 2. Dirty Migrations (Add columns to existing tables if they are missing)
    try { db.run("ALTER TABLE transactions ADD COLUMN block_index INTEGER DEFAULT NULL"); } catch (e) {}
    try { db.run("ALTER TABLE blocks ADD COLUMN merkle_root TEXT"); } catch (e) {}
    try { db.run("ALTER TABLE blocks ADD COLUMN chain_id TEXT"); } catch (e) {}
    try { db.run("ALTER TABLE users ADD COLUMN last_node_activation INTEGER DEFAULT 0"); } catch (e) {}

    // 3. Ensure Genesis State
    db.run(`INSERT OR IGNORE INTO users (username, balance, has_pass, is_admin, mana) VALUES ('tekraze', 1000000, 1, 1, 1000000);`);
    db.run(`INSERT OR IGNORE INTO users (username, balance, has_pass, is_admin, mana) VALUES ('PROTOCOL_TREASURY', 0, 1, 1, 0);`);
    db.run(`INSERT OR IGNORE INTO users (username, balance, has_pass, is_admin, mana) VALUES ('QUEST_BURN_VOID', 0, 1, 1, 0);`);
    db.run(`INSERT OR IGNORE INTO witnesses (username, votes, active) VALUES ('tekraze', 1000, 1);`);
    
    saveDB();
  } catch (e) {
    console.error("Migration error", e);
  }
};

export const saveDB = () => {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const arr = Array.from(data);
    localStorage.setItem('quest_sqlite_db', JSON.stringify(arr));
  } catch (e) {
    console.warn("Database save failed", e);
  }
};

export const exportSnapshot = (): Uint8Array | null => {
  if (!dbInstance) return null;
  return dbInstance.export();
};

export const importSnapshot = async (data: Uint8Array) => {
  if (typeof (window as any).initSqlJs !== 'function') return;
  // @ts-ignore
  const SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
  dbInstance = new SQL.Database(data);
  saveDB();
  window.location.reload(); 
};

export const getDb = () => dbInstance;