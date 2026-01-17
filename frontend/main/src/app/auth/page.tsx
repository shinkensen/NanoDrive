'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function AuthPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const genRes = await fetch('http://localhost:3001/genAuthKey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!genRes.ok) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      const { hash } = await genRes.json();

      // Verify the hash
      const authRes = await fetch('/api/auth', {
        method: 'POST',
        body: hash,
      });

      if (!authRes.ok) {
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      // Store hash in localStorage
      localStorage.setItem('hash', hash);
      
      // Redirect to main page
      router.push('/main');
    } catch (err) {
      setError('Authentication error');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>NanoDrive</h1>
      <h2>Authentication Required</h2>
      
      <form onSubmit={handleAuth} className="upload-box">
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Authenticating...' : 'Login'}
        </button>
      </form>
      
      {error && <p className="error">{error}</p>}
    </div>
  );
}
