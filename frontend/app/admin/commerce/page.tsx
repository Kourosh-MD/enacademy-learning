'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { Product, toman } from '@/lib/commerce';

type AdminOrder={id:string;buyerName:string;buyerEmail:string;status:string;totalToman:number;createdAt:string;invoiceId:string;invoiceNumber:string};
type AdminOverview={metrics:{products:number;orders:number;approvedRevenueToman:number;entitlements:number};products:Product[];orders:AdminOrder[]};

export default function AdminCommercePage(){
  const {user,loading,logout,apiFetch,apiDownload}=useAuth();
  const {locale,t}=usePreferences();
  const router=useRouter();
  const [data,setData]=useState<AdminOverview|null>(null);
  const [prices,setPrices]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(()=>apiFetch<AdminOverview>('/api/v1/admin/commerce').then(result=>{setData(result);setPrices(Object.fromEntries(result.products.map(product=>[product.id,String(product.priceToman)])));}).catch(problem=>setError(problem.message)),[apiFetch]);
  useEffect(()=>{if(!loading&&(!user||user.role!=='ADMIN'))router.replace(user?'/dashboard':'/login');else if(user?.role==='ADMIN')load();},[loading,user,router,load]);

  async function update(product:Product,active=product.active){
    const price=Number(prices[product.id]);if(!Number.isSafeInteger(price)||price<0){setError(t('commerce.validPrice'));return;}
    setBusy(product.id);setError('');
    try{await apiFetch(`/api/v1/admin/commerce/products/${product.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({priceToman:price,active})});await load();}
    catch(problem){setError(problem instanceof Error?problem.message:t('commerce.failed'));}
    finally{setBusy('');}
  }

  async function invoice(order:AdminOrder){
    setBusy(order.invoiceId);setError('');
    try{saveBlob(await apiDownload(`/api/v1/admin/commerce/invoices/${order.invoiceId}/pdf`),`${order.invoiceNumber}.pdf`);}
    catch(problem){setError(problem instanceof Error?problem.message:t('commerce.failed'));}
    finally{setBusy('');}
  }

  async function signOut(){await logout();router.push('/');}
  if(loading||!user||!data)return <main className="status-page"><section><div className="status-orb">⌘</div><p className="page-eyebrow">{t('commerce.adminCommerce')}</p><h1>{error||t('admin.loading')}</h1></section></main>;

  return <main className="admin-shell">
    <aside className="admin-sidebar"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><span className="admin-badge">ADMIN</span><nav><Link href="/admin">⌂ {t('admin.overview')}</Link><Link href="/admin/exams">✓ {t('exam.exams')}</Link><Link className="active" href="/admin/commerce">▤ {t('commerce.commerce')}</Link><Link href="/dashboard">↗ {t('admin.studentView')}</Link></nav><button className="admin-signout" onClick={signOut}>{t('admin.signOut')} ↗</button></aside>
    <section className="admin-main commerce-admin-main">
      <header><div><p className="page-eyebrow">{t('commerce.adminCommerce')}</p><h1>{t('commerce.adminTitle')}</h1><p>{t('commerce.adminLeade')}</p></div><span className="admin-avatar">{user.fullName.slice(0,2).toUpperCase()}</span></header>
      {error&&<div className="commerce-error admin-commerce-error" role="alert">{error}</div>}
      <div className="admin-stats"><article><span>◫</span><div><strong>{data.metrics.products}</strong><small>{t('commerce.products')}</small></div></article><article><span>▤</span><div><strong>{data.metrics.orders}</strong><small>{t('commerce.orders')}</small></div></article><article><span>◆</span><div><strong>{toman(data.metrics.approvedRevenueToman,locale)}</strong><small>{t('commerce.revenueToman')}</small></div></article><article><span>✓</span><div><strong>{data.metrics.entitlements}</strong><small>{t('commerce.accessGranted')}</small></div></article></div>

      <section className="admin-table-section commerce-catalog"><div><p className="page-eyebrow">{t('commerce.catalog')}</p><h2>{t('commerce.catalogTitle')}</h2></div><div className="catalog-admin-list">{data.products.map(product=><article key={product.id}>
        <span className={`catalog-type ${product.type.toLowerCase()}`}>{product.type==='COURSE'?product.targetKey:'PDF'}</span>
        <div><strong>{locale==='fa'?product.titleFa:product.titleEn}</strong><small>{product.slug} · {product.type}</small></div>
        <label><span>{t('commerce.priceToman')}</span><input inputMode="numeric" value={prices[product.id]??''} onChange={event=>setPrices(current=>({...current,[product.id]:event.target.value.replace(/\D/g,'')}))}/></label>
        <button className={product.active?'catalog-active':'catalog-paused'} disabled={busy===product.id} onClick={()=>update(product,!product.active)}>{product.active?t('commerce.active'):t('commerce.paused')}</button>
        <button className="catalog-save" disabled={busy===product.id} onClick={()=>update(product)}>{busy===product.id?t('commerce.saving'):t('commerce.save')}</button>
      </article>)}</div></section>

      <section className="admin-table-section commerce-orders-admin"><div><p className="page-eyebrow">{t('commerce.orderHistory')}</p><h2>{t('commerce.recentOrders')}</h2></div>{data.orders.length?<div>{data.orders.map(order=><article key={order.id}><span className="invoice-glyph">▤</span><div><strong>{order.buyerName}</strong><small>{order.buyerEmail} · {order.invoiceNumber}</small></div><time>{new Intl.DateTimeFormat(locale==='fa'?'fa-IR-u-ca-persian':'en-GB',{dateStyle:'medium'}).format(new Date(order.createdAt))}</time><b>{toman(order.totalToman,locale)} {t('commerce.toman')}</b><button disabled={busy===order.invoiceId} onClick={()=>invoice(order)}>PDF ↓</button></article>)}</div>:<div className="admin-empty"><span>▤</span><h3>{t('commerce.noOrders')}</h3><p>{t('commerce.noOrdersBody')}</p></div>}</section>
    </section>
  </main>;
}

function saveBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
