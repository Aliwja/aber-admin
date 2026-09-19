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
  owner_id: string;
  display_name_ar: string;
  display_name_en: string | null;
  legal_name: string;
  slug: string;
  description_ar: string | null;
  status: string;
  is_verified: boolean;
  cover_image_url: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
};

type Service = {
  id: string;
  name_ar: string;
  service_type: string;
  base_price: number;
  currency_code: string;
};

export default function BusinessDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const businessId = params.id;
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<'REJECTED' | 'SUSPENDED' | 'CHANGES_REQUESTED' | null>(null);

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

        const { data: bizData, error: bizErr } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .maybeSingle();

        if (bizErr) throw bizErr;
        if (!bizData) {
          setError('النشاط غير موجود');
          setLoading(false);
          return;
        }
        setBusiness(bizData as Business);

        const { data: svcData } = await supabase
          .from('business_services')
          .select('id, name_ar, service_type, base_price, currency_code')
          .eq('business_id', businessId)
          .is('deleted_at', null);

        setServices((svcData as Service[]) ?? []);
      } catch (e: any) {
        setError(e.message || 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId, router]);

  async function performAction(newStatus: string, reasonText?: string) {
    if (!business) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient(supabaseUrl, supabaseAnon);

      const { error: rpcErr } = await supabase.rpc('review_business', {
        p_business_id: business.id,
        p_new_status: newStatus,
        p_reason: reasonText || null,
      });

      if (rpcErr) {
        // Fallback: direct update if RPC not available
        const update: any = { status: newStatus };
        if (newStatus === 'APPROVED') {
          update.is_verified = true;
          update.verified_at = new Date().toISOString();
        }
        const { error: updErr } = await supabase
          .from('businesses')
          .update(update)
          .eq('id', business.id);
        if (updErr) throw updErr;

        // Log to approvals
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('business_approvals').insert({
          business_id: business.id,
          status: newStatus,
          reviewer_id: user?.id,
          reason: reasonText || null,
        });
      }

      const label =
        newStatus === 'APPROVED' ? 'تم اعتماد النشاط ✅' :
        newStatus === 'REJECTED' ? 'تم رفض النشاط ❌' :
        newStatus === 'SUSPENDED' ? 'تم إيقاف النشاط ⏸️' :
        newStatus === 'CHANGES_REQUESTED' ? 'تم طلب تعديلات 📝' :
        'تم التحديث';

      setSuccess(label);
      setBusiness({ ...business, status: newStatus, is_verified: newStatus === 'APPROVED' ? true : business.is_verified });
      setShowReasonInput(false);
      setPendingAction(null);
      setReason('');

      setTimeout(() => {
        router.push('/businesses');
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'حدث خطأ في العملية');
    } finally {
      setActionLoading(false);
    }
  }

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

  if (error && !business) {
    return (
      <main style={{ background: '#f5efe6', minHeight: '100vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ color: '#1a2942', marginBottom: '16px' }}>{error}</h1>
          <a href="/businesses" className="btn">← العودة للأنشطة</a>
        </div>
      </main>
    );
  }

  if (!business) return null;

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

      <div className="container" style={{ paddingTop: '32px', maxWidth: '900px' }}>
        <a href="/businesses" style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: 600 }}>
          ← العودة للأنشطة
        </a>

        {success && (
          <div className="form-success" style={{ marginTop: '16px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        {error && business && (
          <div className="form-error" style={{ marginTop: '16px', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Business Card */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            {business.cover_image_url ? (
              <img
                src={business.cover_image_url}
                alt={business.display_name_ar}
                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '16px' }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, #1e3a5f, #2d5080)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: 'white',
              }}>🏢</div>
            )}

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '24px', color: '#1a2942', fontWeight: 800 }}>
                  {business.display_name_ar}
                </h1>
                {business.is_verified && (
                  <span style={{ color: '#059669', fontSize: '14px', fontWeight: 700 }}>✓ موثق</span>
                )}
              </div>
              <p className="muted" style={{ fontSize: '14px', marginBottom: '8px' }}>
                {business.display_name_en || business.slug}
              </p>
              <StatusBadge status={business.status} />
            </div>
          </div>

          {business.description_ar && (
            <div style={{ padding: '16px', background: '#faf6ef', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#7a6f5f', marginBottom: '6px', fontWeight: 700 }}>الوصف</div>
              <p style={{ color: '#4a5568', lineHeight: 1.7, fontSize: '14px' }}>{business.description_ar}</p>
            </div>
          )}

          {/* Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            <InfoRow label="الاسم القانوني" value={business.legal_name} />
            <InfoRow label="Slug" value={business.slug} ltr />
            <InfoRow label="البريد" value={business.email || '—'} ltr />
            <InfoRow label="الهاتف" value={business.phone || '—'} ltr />
            <InfoRow label="الموقع" value={business.website || '—'} ltr />
            <InfoRow label="تاريخ التقديم" value={new Date(business.created_at).toLocaleDateString('ar-SA')} />
          </div>
        </div>

        {/* Services */}
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
            الخدمات ({services.length})
          </h2>
          {services.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>
              لا توجد خدمات مضافة
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {services.map((s) => (
                <div key={s.id} style={{
                  padding: '12px 16px',
                  background: '#faf6ef',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2942' }}>{s.name_ar}</div>
                    <div className="muted" style={{ fontSize: '12px' }}>{s.service_type}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e3a5f' }}>
                    {s.base_price} {s.currency_code}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>الإجراءات</h2>

          {business.status === 'APPROVED' ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <p className="muted" style={{ marginBottom: '20px' }}>
                هذا النشاط معتمد ومرئي للمسافرين
              </p>
              <button
                onClick={() => { setPendingAction('SUSPENDED'); setShowReasonInput(true); }}
                className="btn btn-reject"
                disabled={actionLoading}
              >
                ⏸️ إيقاف النشاط
              </button>
            </div>
          ) : business.status === 'REJECTED' ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
              <p className="muted" style={{ marginBottom: '20px' }}>
                هذا النشاط مرفوض
              </p>
              <button
                onClick={() => performAction('APPROVED')}
                className="btn btn-approve"
                disabled={actionLoading}
              >
                ✅ اعتماد النشاط
              </button>
            </div>
          ) : showReasonInput ? (
            <div>
              <div className="form-group">
                <label className="form-label">السبب / الملاحظات (اختياري)</label>
                <textarea
                  className="form-textarea"
                  placeholder="اكتب سبب القرار..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => pendingAction && performAction(pendingAction, reason)}
                  className="btn btn-reject"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'جاري...' : 'تأكيد'}
                </button>
                <button
                  onClick={() => { setShowReasonInput(false); setPendingAction(null); setReason(''); }}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                onClick={() => performAction('APPROVED')}
                className="btn btn-approve"
                disabled={actionLoading}
                style={{ padding: '16px', fontSize: '15px' }}
              >
                {actionLoading ? 'جاري...' : '✅ اعتماد النشاط'}
              </button>

              <button
                onClick={() => { setPendingAction('CHANGES_REQUESTED'); setShowReasonInput(true); }}
                className="btn btn-request"
                disabled={actionLoading}
                style={{ padding: '16px', fontSize: '15px' }}
              >
                📝 طلب تعديلات
              </button>

              <button
                onClick={() => { setPendingAction('REJECTED'); setShowReasonInput(true); }}
                className="btn btn-reject"
                disabled={actionLoading}
                style={{ padding: '16px', fontSize: '15px' }}
              >
                ❌ رفض النشاط
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div style={{ padding: '10px 14px', background: '#faf6ef', borderRadius: '10px' }}>
      <div style={{ fontSize: '11px', color: '#7a6f5f', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#1a2942', wordBreak: 'break-word' }} dir={ltr ? 'ltr' : 'rtl'}>{value}</div>
    </div>
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
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
    }}>{s.label}</span>
  );
}
