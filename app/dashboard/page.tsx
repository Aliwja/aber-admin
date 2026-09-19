'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const ADMIN_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_MANAGER',
  'FINANCE', 'SUPPORT', 'CONTENT_MANAGER',
];

type Stats = {
  businesses_total: number;
  businesses_pending: number;
  businesses_approved: number;
  users_total: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnon);

        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        if (!sessionData.session) {
          router.push('/login');
          return;
        }

        const userId = sessionData.session.user.id;
        setUserEmail(sessionData.session.user.email ?? null);

        // Verify role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('roles(code)')
          .eq('user_id', userId);

        const roles = ((roleData ?? []) as any[])
          .map((r) => r.roles?.code)
          .filter(Boolean);

        if (!roles.some((r: string) => ADMIN_ROLES.includes(r))) {
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        // Count businesses
        const { count: total } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        const { count: pending } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING')
          .is('deleted_at', null);

        const { count: approved } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'APPROVED')
          .is('deleted_at', null);

        const { count: users } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          businesses_total: total ?? 0,
          businesses_pending: pending ?? 0,
          businesses_approved: approved ?? 0,
          users_total: users ?? 0,
        });
      } catch (e: any) {
        setError(e.message || 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main style={{ background: '#f5efe6', minHeight: '100vh', paddingTop: '60px', textAlign: 'center' }}>
        <p className="muted">جاري التحميل...</p>
      </main>
    );
  }

  return (
    <main style={{ background: '#f5efe6', minHeight: '100vh' }}>
      {/* Admin Header */}
      <div className="admin-header">
        <a href="/dashboard" className="brand">
          🔐 ABER <span className="badge-admin">ADMIN</span>
        </a>
        <div className="nav">
          <a href="/dashboard">الرئيسية</a>
          <a href="/businesses">الأنشطة</a>
          <a href="/users">المستخدمون</a>
          <button onClick={handleLogout} className="logout-btn">خروج</button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', color: '#1a2942', marginBottom: '4px' }}>
            لوحة الإدارة 🏛️
          </h1>
          <p className="muted" style={{ fontSize: '14px' }} dir="ltr">
            {userEmail}
          </p>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '24px' }}>⚠️ {error}</div>
        )}

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.businesses_pending}</div>
              <div className="stat-label">⏳ أنشطة معلّقة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#059669' }}>
                {stats.businesses_approved}
              </div>
              <div className="stat-label">✅ أنشطة معتمدة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.businesses_total}</div>
              <div className="stat-label">🏢 إجمالي الأنشطة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.users_total}</div>
              <div className="stat-label">👥 المستخدمون</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <h2 style={{ fontSize: '20px', color: '#1a2942', marginBottom: '16px', marginTop: '32px' }}>
          إجراءات سريعة
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          <a href="/businesses" style={{
            display: 'block',
            padding: '24px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e5dcc9',
            textDecoration: 'none',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2942', marginBottom: '4px' }}>
              إدارة الأنشطة
            </div>
            <div className="muted" style={{ fontSize: '13px' }}>
              مراجعة، موافقة، رفض
            </div>
          </a>

          <a href="/users" style={{
            display: 'block',
            padding: '24px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e5dcc9',
            textDecoration: 'none',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2942', marginBottom: '4px' }}>
              المستخدمون
            </div>
            <div className="muted" style={{ fontSize: '13px' }}>
              عرض وإدارة المستخدمين
            </div>
          </a>

          <a href="/businesses?status=PENDING" style={{
            display: 'block',
            padding: '24px',
            background: stats && stats.businesses_pending > 0 ? '#fef3c7' : 'white',
            borderRadius: '16px',
            border: stats && stats.businesses_pending > 0 ? '1px solid #fcd34d' : '1px solid #e5dcc9',
            textDecoration: 'none',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2942', marginBottom: '4px' }}>
              المعلّقة ({stats?.businesses_pending ?? 0})
            </div>
            <div className="muted" style={{ fontSize: '13px' }}>
              تحتاج مراجعة
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}
