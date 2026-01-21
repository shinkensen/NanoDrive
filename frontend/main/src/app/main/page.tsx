'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type FileRow = {
  id: number;
  name: string;
  file_name: string;
  mime_type: string;
  path: string;
  size: number;
  time: string;
};

function formatSpeed(bps: number) {
  if (!bps) return '';
  const kb = bps / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  return `${(kb / 1024).toFixed(1)} MB/s`;
}

type FilesProps = {
  fileType: string;
  href: string;
};

function Files({ fileType, href }: FilesProps) {
  if (fileType.startsWith('image/')) {
    return (
      <div>
        <img src={href} width="50%" height="50%" alt="uploaded file" />
      </div>
    );
  }
  return <div></div>;
}

export default function MainPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speedBps, setSpeedBps] = useState(0);
  const [pct, setProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!localStorage.getItem('hash')) {
      router.push('/auth');
      return;
    }
    loadFiles();
  }, [router]);

  async function loadFiles() {
    setError(null);
    const res = await fetch('/api/files');
    if (!res.ok) return setError('Could not load files');
    setFiles(await res.json());
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const start = Date.now();
    const xhr = new XMLHttpRequest();
    const done = new Promise<any>((resolve, reject) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300)
            resolve(xhr.responseText);
          else reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
    });

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      const elapsed = (Date.now() - start) / 1000;
      const bps = elapsed > 0 ? ev.loaded / elapsed : 0;
      setProgress(pct);
      setSpeedBps(bps);
    };

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
    setBusy(true);
    setError(null);
    let uploaded: any;
    try {
      const responseText = await done;
      uploaded = JSON.parse(responseText);
    } catch (err) {
      setError('Upload failed');
      setBusy(false);
      return;
    }
    setBusy(false);
    form.reset();
    setProgress(0);
    setSpeedBps(0);

    setFiles((prev) => [
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

  if (!isClient) {
    return null;
  }

  return (
    <div className="page">
      <h1>NanoDrive</h1>
      <form onSubmit={upload} className="upload-box">
        <input name="file" type="file" required />
        <input name="name" required placeholder="name" />
        <button type="submit" disabled={busy}>
          {busy ? `Uploading…${formatSpeed(speedBps)}` : 'Upload'}
        </button>
      </form>
      {busy && (
        <div className="progress">
          <div className="bar" style={{ width: `${pct}%` }} />
          <span className="pct">{pct}%</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="list">
        {files.map((f) => (
          <div key={f.id} className="card">
            <div className="name">{f.name}</div>
            <div className="meta">
              {f.mime_type} • {(f.size / 1024).toFixed(1)} KB
            </div>
            <Files fileType={f.mime_type} href={`/uploads/${f.file_name}`} />
            <a href={`/uploads/${f.file_name}`} target="_blank" rel="noreferrer">
              View / Download
            </a>
          </div>
        ))}
        {!files.length && <p>No files yet.</p>}
      </div>
    </div>
  );
}
