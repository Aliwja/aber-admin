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

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

type UserWithRoles = Profile & {
  roles: string[];
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('roles(code)')
          .eq('user_id', userId);

        const roles = ((roleData ?? []) as any[]).map((r) => r.roles?.code).filter(Boolean);
        if (!roles.some((r: string) => ADMIN_ROLES.includes(r))) {
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const { data: profilesData, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .order('created_at', { ascending: false });

        if (profErr) throw profErr;

        const ids = (profilesData ?? []).map((p: any) => p.id);

        let rolesMap: Record<string, string[]> = {};
        if (ids.length > 0) {
          const { data: urData } = await supabase
            .from('user_roles')
            .select('user_id, roles(code)')
            .in('user_id', ids);

          (urData ?? []).forEach((r: any) => {
            const code = r.roles?.code;
            if (!code) return;
            if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
            rolesMap[r.user_id].push(code);
          });
        }

        const merged: UserWithRoles[] = (profilesData ?? []).map((p: any) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at,
          roles: rolesMap[p.id] ?? [],
        }));

        setUsers(merged);
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

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <main style={{ background: '#f5efe6', minHeight: '100vh', paddingTop: '60px', textAlign: 'center' }}>
        <p className="muted">جاري التحميل...</p>
      </main>
    );
  }

  return (
    <main style={{ background: '#f5efe6', minHeight: '100vh' }}>
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
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', color: '#1a2942', marginBottom: '4px' }}>
            المستخدمون 👥
          </h1>
          <p className="muted" style={{ fontSize: '14px' }}>
            {users.length} مستخدم
          </p>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '24px' }}>⚠️ {error}</div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 ابحث بالبريد أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="rtl"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e5dcc9',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <p className="muted">لا يوجد مستخدمون مطابقون</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filtered.map((u) => (
              <div key={u.id} style={{
                padding: '16px 20px',
                background: 'white',
                borderRadius: '14px',
                border: '1px solid #e5dcc9',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#1e3a5f',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                }}>
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2942', marginBottom: '2px' }}>
                    {u.full_name || 'بدون اسم'}
                  </div>
                  <div className="muted" style={{ fontSize: '13px' }} dir="ltr">
                    {u.email}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {u.roles.length === 0 ? (
                    <span className="muted" style={{ fontSize: '12px' }}>لا أدوار</span>
                  ) : (
                    u.roles.map((r) => (
                      <span key={r} style={{
                        padding: '4px 10px',
                        background: r === 'ADMIN' || r === 'SUPER_ADMIN' ? '#1e3a5f' : '#e0f2fe',
                        color: r === 'ADMIN' || r === 'SUPER_ADMIN' ? 'white' : '#0284c7',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}>
                        {r}
                      </span>
                    ))
                  )}
                </div>

                <div className="muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(u.created_at).toLocaleDateString('ar-SA')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
