import express from "express";
import cors from "cors";
import {upload} from "./upload.js";
import { db } from "./db.js";
import fs from "fs";
import path from 'path';
import crypto from 'node:crypto';
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { error } from "node:console";
import sharp from "sharp";
import { pathToFileURL } from "node:url";
import { url } from "node:inspector";
ffmpeg.setFfmpegPath(ffmpegStatic);
const app = express();
app.use(cors());
app.use(express.json({ limit: '500gb' }));
app.use(express.text({ type: 'text/plain', limit: '1mb' }));
app.use('/uploads',express.static('uploads'));
app.post('/upload', upload.single('file'), (req,res) =>{
    if  (!req.file){
        return res.status(400).json({error: "File not uploaded"})
    }
    const name = req.body.name;
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
function getPass(callback){
    db.get('SELECT password FROM pass WHERE id = 1', [], (err, row) => {
        if (err) {
            callback(null, err.message);
        } else {
            callback(row?.password || null, null);
        }
    });
}

function setPass(newPass, callback) {
    db.run('UPDATE pass SET password = ? WHERE id = 1', [newPass], (err) => {
        if (err) {
            callback(false, err.message);
        } else {
            callback(true, null);
        }
    });
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
app.post('/genAuthKey', (req, res) => {
    const inputPassword = req.body.password;
    
    getPass((storedPassword, err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        const now = new Date();
        let data;
        if (inputPassword === storedPassword) {
            
            data = now.toISOString().split('T')[0];
        } else {
            data = `${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 12)}-${Math.floor(Math.random() * 32)}`;
        }
        
        const hash = crypto.createHash('sha512').update(data).digest('base64');
        return res.status(200).json({ hash });
    });
});

app.post('/auth', (req, res) => {
    const now = new Date();
    const todayHash = crypto.createHash('sha512').update(now.toISOString().split('T')[0]).digest('base64');
    
    const receivedHash = typeof req.body === 'string' ? req.body : '';
    if (!receivedHash) {
        return res.status(400).json({ success: false, error: 'Missing auth hash' });
    }
    
    if (receivedHash === todayHash) {
        return res.status(200).json({ success: true });
    } else {
        return res.status(401).json({ success: false });
    }
});
const convertVideos = (inputPath,newEnding,callback)=>{
    const outputPat = `${file.slice(0,file.indexOf("."))}${Math.floor(Math.random()*46656).toString(36)}.${newEnding}`;
    const outputPath = "uploads/" +outputPat;
    ffmpeg(inputPath)
        .output(outputPath)
        .on('end',()=>{
            if(callback){
                callback(null,outputPath, outputPat);
            }
        })
        .on('error',(err)=>{
            if (callback){
                callback(err);
            }
        })
}
app.post('/convert',(req,res)=>{
    const file = req.body.file;
    const newFormat = req.body.format;
    const name = req.body.name;
    let currentFormat;
    let size=0;
    db.get(`SELECT mime_type FROM uploads WHERE file_name=?`,[file],(err,row)=>{
        if (err){
            return res.status(500).json({error: error.message});
        }
        if (!row){
            return res.status(404).json({error: "File Not Found"});
        }
        currentFormat = row.mime_type;
    })
    currentFormat = currentFormat.slice(0,currentFormat.indexOf("/"));
    formats =currentFormat.slice(0,currentFormat.indexOf("/"));
    if (formats == "image"){
        const inputPath = `uploads/${file}`;
        const outputPat = `${file.slice(0,file.indexOf("."))}${Math.floor(Math.random()*46656).toString(36)}.${newFormat}`;
        const outputPath = "uploads/" +outputPat;
        sharp(inputPath)
            .toFormat(newFormat)
            .toFile(outputPath, (err,info)=>{
                if (err){
                    return res.status(500).json({error: err.message});
                }
                size= info.size;
            })
        const mimetype= "image/" + newFormat;
        const fullPath = path.resolve(process.cwd(), outputPat);
        db.run(`INSERT INTO uploads (name, file_name, mime_type, path, size) VALUES (?,?,?,?,?)`,
            [name, outputPat, mimetype, outputPath, size],
            function (err){
                if (err) return res.status(500).json({error: err.message});
                return res.json({id: this.lastID,name,outputPat,mimetype,size,url: `/uploads/${filename}`,fullPath})
            }
        )
        
        //yea i think this will work... hopefully
    }
    if (formats == "video"){
        let convertedPath,fullConvertedPath;
        convertVideos(file,newFormat,(err,fullPath,path)=>{
            if (err){
                return res.status(500).json({error:err});
            }
            convertedPath =path;
            fullConvertedPath = fullPath;
        })
        let size = 0;
        fs.stat(fullConvertedPath,(err,stats)=>{
            if (err){
                return res.status(500).json({err});
            }
            else{
                size = stats.size;
            }
        })
        const mimetype ="image/" + newFormat;
        db.run(`INSERT INTO uploads (name, file_name, mime_type, path, size) VALUES (?,?,?,?,?)`,
            [name,convertedPath,mimetype,fullConvertedPath,size], (err)=>{
                if (err) return res.status(500).json({error: err.message});
                return res.json({id:this.lastID,name,convertedPath,mimetype,size,url: `/uploads/${filename}`})
            })
    }   
})
app.listen(3001, ()=>{console.log('Backend server live on port 3001')});
