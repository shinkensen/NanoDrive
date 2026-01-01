import { useEffect, useState, type FormEvent} from 'react';
import './App.css';

type FileRow = {
  id: number;
  name:string;
  file_name: string;
  mime_type: string;
  path: string;
  size: number;
  time: string;
};
type params = {
  authState:boolean;
  setAuthState:(val:boolean)=>void
}
function formatSpeed(bps: number) {
  if (!bps) return '';
  const kb = bps / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  return `${(kb / 1024).toFixed(1)} MB/s`;
}
export default function Main({authState,setAuthState}:params) {
  if (!authState){
  if (!localStorage.getItem("hash")){
    setAuthState(true);
  }
  const [files, setFiles] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speedBps,setSpeedBps] = useState(0);
  const [pct,setProgress]  = useState(0);
  useEffect(() => { loadFiles(); }, []);

  async function loadFiles() {
    setError(null);
    const res = await fetch('/files');
    if (!res.ok) return setError('Could not load files');
    setFiles(await res.json());
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const start = Date.now();
  const xhr = new XMLHttpRequest();
  const done = new Promise<Response>((resolve, reject) => {
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) resolve(new Response(xhr.response));
        else reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
  });

  xhr.upload.onprogress = ev => {
    if (!ev.lengthComputable) return;
    const pct = Math.round((ev.loaded / ev.total) * 100);
    const elapsed = (Date.now() - start) / 1000;
    const bps = elapsed > 0 ? ev.loaded / elapsed : 0;
    setProgress(pct);
    setSpeedBps(bps);
  };

  xhr.open('POST', '/upload');
  xhr.send(formData);
    setBusy(true);
    setError(null);
    const res = await fetch('/upload', { method: 'POST', body: formData });
    setBusy(false);
    if (!res.ok) {
      setError('Upload failed');
      return;
    }
    const uploaded = await res.json();
  e.currentTarget.reset();

  // Immediate UI update; still safe to refresh from server afterward if you like
  setFiles(prev => [
    {
      id: uploaded.id,
      name: uploaded.name,
      file_name: uploaded.filename,
      mime_type: uploaded.mimetype,
      path: uploaded.url,
      size: uploaded.size,
      time: new Date().toISOString(),
    },
    ...prev,
  ]);
    loadFiles();
  }

  return (
    <div className="page">
      <h1>NanoDrive</h1>
      <form onSubmit={upload} className="upload-box">
        <input name="file" type="file" required />
        <input name='name' required placeholder='name' />
        <button type="submit" disabled={busy}>{busy ? `Uploading…${formatSpeed(speedBps)}` : 'Upload'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="list">
        {files.map(f => (
          <div key={f.id} className="card">
            <div className="name">{f.file_name}</div>
            <div className="meta">{f.mime_type} • {(f.size / 1024).toFixed(1)} KB</div>
            <Files fileType={f.mime_type} href={`/uploads/${f.file_name}`}></Files>
            <a href={`/uploads/${f.file_name}`} target="_blank" rel="noreferrer">View / Download</a>
          </div>
        ))}
        {!files.length && <p>No files yet.</p>}
      </div>
    </div>
  );
  }
}
type prop1 = {
  fileType:string,
  href: string
}
function Files({fileType,href}:prop1){
  if (fileType.startsWith('image/')){
    return(<div>
      <img src= {href} width="50%" height="50%"></img>
    </div>);
  }
  return (<div></div>)
}

const res= await fetch('/auth',{method:'POST',body:localStorage.getItem("hash")})

/*
Okay so lets get this straight

- I need an authentication system with a password that has persistence through local storage
but i cannot just use plaintext with local storage because that would mean that anyone can just easily bypass it
What i can do (brilliant solution) is have it so that the node.js server generates a 'hash' essentially that is comprized of today's date
with 2 enpoints, genAuthKey and auth. genAuthKey creates a key, the correct hash if the password is correct and a random hash otherwise. Then what it does is that
it returns that hash. then the client side then puts that hash through the auth endpoint and also stores THAT hash in localstorage. So to an attacker, the 
local storage looks completley normal with some random hash, with them having no way of knowing what that hash means or if it is correct or not. 

Done with those but realized that there is another feature that this instills, daily rotating keys, maybe in the future, daily rotating passwords as well?
one problem that is derived from this however is the fact that i have to go soft on the incorrect password attempts. maybe a ip-based delay system with a "5 incorrect = ban list"?

*/