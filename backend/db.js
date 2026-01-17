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
        )
        `);
    db.run(`
        CREATE TABLE IF NOT EXISTS pass(
            id INTEGER PRIMARY KEY CHECK (id = 1),
            password TEXT NOT NULL
        )
        `);
    
    // Initialize with default password "test1234" if table is empty
    db.get('SELECT * FROM pass WHERE id = 1', [], (err, row) => {
        if (!err && !row) {
            db.run('INSERT INTO pass (id, password) VALUES (1, ?)', ['test1234'], (err) => {
                if (err) console.error('Error inserting default password:', err);
                else console.log('Default password "test1234" initialized');
            });
        }
    });
});