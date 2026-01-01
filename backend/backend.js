import express from "express";
import {upload} from "./upload.js";
import { db } from "./db.js";
import fs from "fs";
import path from 'path';
import crypto from 'node:crypto';
import e from "express";
const app = express();
app.use(express.json())
app.use('/uploads',express.static('uploads'));
app.post('/upload', upload.single('file'), (req,res) =>{
    if  (!req.file){
        return res.status(400).json({error: "File not uploaded"})
    }
    const name = req.body.name;
    console.log(name);
    const {filename,mimetype,size,path:filePath} = req.file;
    // Store absolute path so later cleanup does not depend on process.cwd()
    const storedPath = path.resolve(process.cwd(), filePath);
    db.run(`INSERT INTO uploads (name, file_name, mime_type, path, size) VALUES (?,?,?,?,?)`,
        [name, filename, mimetype, storedPath, size],
        function (err){
            if (err) return res.status(500).json({error: err.message});
            return res.json({id: this.lastID,name,filename,mimetype,size,url: `/uploads/${filename}`})
        }
    )
})
function getPass(){
    db.all('SELECT * FROM pass',[],(err,pass)=>{
        if (err){
            return [false,err.message]
        }
        else return [true,pass[0]];
    })
}
function setPass(pass){
    if (!getPass()){
        db.run(`INSERT INTO pass (pass) VALUES (?)`,
            [pass],
            function (err){
                if (err){
                    return [false,err.message];
                }
                else{
                    return [true]
                }
            }
        )
    }
    else{
        db.run(`UPDATE table SET pass = '${pass} WHERE pass = ${getPass()}'`,(err)=>{
            return err? [false,err.message]:[true];
        })
    }
}
app.get('/files', (req, res) => {
  db.all('SELECT * FROM uploads ORDER BY time DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const keep = [];
    const toDelete = [];

    for (const row of rows) {
        const fullPath = row?.path ? path.resolve(process.cwd(), row.path) : null;
        if (fullPath && fs.existsSync(fullPath)) {
            keep.push(row);
        } else {
            toDelete.push(row.id);
            console.log(`Deleting missing file record id=${row.id}, path=${row.path}`);
        }
    }
    if (toDelete.length) {
        const stmt = db.prepare('DELETE FROM uploads WHERE id = ?');
        toDelete.forEach(id => stmt.run(id));
        stmt.finalize();
    }
    return res.json(keep);
  });
});
app.post('/genAuth',(req,res)=>{
    let data;
    const now = new Date();
    if (req.body.pass.toLowerCase()==getPass()){
        data = now.toISOString.split('T')[0];
    }
    else{
        data = `${Math.floor(Math.random(0,10000))}-${Math.floor(Math.random(0,12))}-${Math.floor(Math.random(0,32))}.`;
    }
    const hash =crypto.createHash('sha512').update(data).digest('base64');
    return res.status(200).json({hash});
})
app.post('/auth',(req,res)=>{
    if (req.body.hash == crypto.createHash('sha512').update(now.toISOString.split('T')[0]).digest('base64')){
        return true;
    }
    else {
        return false;
    }
})
app.listen(3000, ()=>{console.log('Live on 3000')});
//I need a safe way to store the password rather than in plain text...