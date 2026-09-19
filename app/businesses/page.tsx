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

type Business = {
  id: string;
  display_name_ar: string;
  display_name_en: string | null;
  slug: string;
  status: string;
  is_verified: boolean;
  cover_image_url: string | null;
  created_at: string;
  owner_id: string;
};

type Tab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('PENDING');

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

        const roles = ((roleData ?? []) as any[])
          .map((r) => r.roles?.code)
          .filter(Boolean);

        if (!roles.some((r: string) => ADMIN_ROLES.includes(r))) {
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const { data, error: bizErr } = await supabase
          .from('businesses')
          .select('id, display_name_ar, display_name_en, slug, status, is_verified, cover_image_url, created_at, owner_id')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (bizErr) throw bizErr;
        setBusinesses((data as Business[]) ?? []);
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

  const filtered = tab === 'ALL' ? businesses : businesses.filter((b) => b.status === tab);

  const counts = {
    ALL: businesses.length,
    PENDING: businesses.filter((b) => b.status === 'PENDING').length,
    APPROVED: businesses.filter((b) => b.status === 'APPROVED').length,
    REJECTED: businesses.filter((b) => b.status === 'REJECTED').length,
    SUSPENDED: businesses.filter((b) => b.status === 'SUSPENDED').length,
  };

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
            إدارة الأنشطة 🏢
          </h1>
          <p className="muted" style={{ fontSize: '14px' }}>
            عرض، مراجعة، موافقة أو رفض الأنشطة
          </p>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '24px' }}>⚠️ {error}</div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'PENDING' ? 'active' : ''}`} onClick={() => setTab('PENDING')}>
            ⏳ معلّقة ({counts.PENDING})
          </button>
          <button className={`tab ${tab === 'APPROVED' ? 'active' : ''}`} onClick={() => setTab('APPROVED')}>
            ✅ معتمدة ({counts.APPROVED})
          </button>
          <button className={`tab ${tab === 'REJECTED' ? 'active' : ''}`} onClick={() => setTab('REJECTED')}>
            ❌ مرفوضة ({counts.REJECTED})
          </button>
          <button className={`tab ${tab === 'SUSPENDED' ? 'active' : ''}`} onClick={() => setTab('SUSPENDED')}>
            ⏸️ موقوفة ({counts.SUSPENDED})
          </button>
          <button className={`tab ${tab === 'ALL' ? 'active' : ''}`} onClick={() => setTab('ALL')}>
            📋 الكل ({counts.ALL})
          </button>
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <p className="muted">لا توجد أنشطة في هذه الفئة</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filtered.map((biz) => (
              <a
                key={biz.id}
                href={`/businesses/${biz.id}`}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e5dcc9',
                  alignItems: 'center',
                  textDecoration: 'none',
                  flexWrap: 'wrap',
                }}
              >
                {biz.cover_image_url ? (
                  <img
                    src={biz.cover_image_url}
                    alt={biz.display_name_ar}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px' }}
                  />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #1e3a5f, #2d5080)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: 'white',
                  }}>🏢</div>
                )}

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '16px', color: '#1a2942', fontWeight: 700 }}>
                      {biz.display_name_ar}
                    </h3>
                    {biz.is_verified && (
                      <span style={{ color: '#059669', fontSize: '12px', fontWeight: 700 }}>✓ موثق</span>
                    )}
                  </div>
                  <p className="muted" style={{ fontSize: '13px', marginBottom: '6px' }}>
                    {biz.display_name_en || biz.slug}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={biz.status} />
                    <span className="muted" style={{ fontSize: '12px' }}>
                      {new Date(biz.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>

                <span style={{
                  color: '#1e3a5f',
                  fontWeight: 700,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                }}>مراجعة →</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PENDING: { label: '⏳ قيد المراجعة', bg: '#fef3c7', color: '#92400e' },
    APPROVED: { label: '✅ معتمد', bg: '#d1fae5', color: '#065f46' },
    REJECTED: { label: '❌ مرفوض', bg: '#fee2e2', color: '#991b1b' },
    SUSPENDED: { label: '⏸️ موقوف', bg: '#ede9fe', color: '#5b21b6' },
    CHANGES_REQUESTED: { label: '📝 يحتاج تعديل', bg: '#fef3c7', color: '#92400e' },
  };
  const s = map[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
    }}>{s.label}</span>
  );
}
