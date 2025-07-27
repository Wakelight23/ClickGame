class TestDatabase {
  constructor() {
    if (TestDatabase.instance) {
      return TestDatabase.instance;
    }

    this.db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
    this.initializeTables();
    TestDatabase.instance = this;
  }

  initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id  TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        address  TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
    `);
  }

  getDb() {
    return this.db;
  }

  static getInstance() {
    if (!TestDatabase.instance) {
      new TestDatabase();
    }
    return TestDatabase.instance;
  }

  static reset() {
    if (TestDatabase.instance) {
      TestDatabase.instance.db.close();
      TestDatabase.instance = null;
    }
  }
}
