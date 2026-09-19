'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'MODERATOR',
  'VERIFICATION_MANAGER',
  'FINANCE',
  'SUPPORT',
  'CONTENT_MANAGER',
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient(supabaseUrl, supabaseAnon);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error('فشل تسجيل الدخول');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('roles(code)')
        .eq('user_id', data.user.id);

      const roles = ((roleData ?? []) as any[])
        .map((r) => r.roles?.code)
        .filter(Boolean);

      const isAdmin = roles.some((r: string) => ADMIN_ROLES.includes(r));

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError('هذا الحساب ليس حساب إدارة. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      background: '#f5efe6',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '56px', marginBottom: '8px' }}>🔐</div>
          <h1 style={{ fontSize: '22px', color: '#1e3a5f', fontWeight: 800 }}>
            ABER Admin
          </h1>
          <p className="muted" style={{ fontSize: '13px' }}>
            لوحة الإدارة الداخلية
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '20px', textAlign: 'center', marginBottom: '8px' }}>
            دخول الإدارة
          </h2>
          <p className="muted" style={{ textAlign: 'center', marginBottom: '24px', fontSize: '13px' }}>
            مخصص للمصرح لهم فقط
          </p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">البريد الإلكتروني</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@aber.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">كلمة المرور</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                dir="ltr"
              />
            </div>

            <button type="submit" className="form-btn" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: '#7a6f5f',
        }}>
          © 2026 ABER — للإدارة فقط
        </p>
      </div>
    </main>
  );
}
