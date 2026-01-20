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
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
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
        signature TEXT
      );

      CREATE TABLE IF NOT EXISTS blocks (
        index_id INTEGER PRIMARY KEY,
        hash TEXT,
        prev_hash TEXT,
        validator TEXT,
        timestamp INTEGER,
        tx_count INTEGER,
        witness_sig TEXT
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

      CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game TEXT,
        username TEXT,
        score INTEGER,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS witnesses (
        username TEXT PRIMARY KEY,
        votes INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT 1
      );

      INSERT OR IGNORE INTO users (username, balance, has_pass, is_admin) VALUES ('tekraze', 1000000, 1, 1);
      INSERT OR IGNORE INTO users (username, balance, has_pass, is_admin) VALUES ('PROTOCOL_TREASURY', 0, 1, 1);
      INSERT OR IGNORE INTO witnesses (username, votes, active) VALUES ('tekraze', 1000, 1);
    `);
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
  window.location.reload(); // Refresh to re-init context with new state
};

export const getDb = () => dbInstance;