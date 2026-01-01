import sqlite3 from 'sqlite3'
export const db = new sqlite3.Database('./files.db');
db.serialize(()=>{
    db.run(`
        CREATE TABLE IF NOT EXISTS uploads(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            file_name TEXT,
            mime_type TEXT,
            path TEXT,
            size INTEGER,
            time DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS pass(
            pass TEXT PRIMARY KEY
        )
        `)
});