'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login
    router.replace('/login');
  }, [router]);

  return (
    <main style={{
      background: '#1e3a5f',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
    }}>
      <div>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔐</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
          ABER Admin
        </h1>
        <p style={{ opacity: 0.7, fontSize: '14px' }}>
          جاري التوجيه...
        </p>
      </div>
    </main>
  );
                    }
