'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { StudentSidebar } from '@/components/WorkspaceNavigation';
import { Purchase, PurchaseItem, itemTitle, toman } from '@/lib/commerce';

export default function PurchasesPage(){
  const {user,loading,apiFetch,apiDownload}=useAuth();
  const {locale,t}=usePreferences();
  const router=useRouter();
  const [orders,setOrders]=useState<Purchase[]>([]);
  const [tab,setTab]=useState<'PURCHASES'|'INVOICES'>('PURCHASES');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const load=useCallback(()=>apiFetch<Purchase[]>('/api/v1/store/purchases').then(setOrders).catch(problem=>setError(problem.message)),[apiFetch]);

  useEffect(()=>{
    if(!loading&&!user)router.replace('/login');
    else if(user?.role==='ADMIN')router.replace('/admin');
    else if(user)load();
  },[loading,user,router,load]);

  async function download(path:string,filename:string,key:string){
    setBusy(key);setError('');
    try{saveBlob(await apiDownload(path),filename);}
    catch(problem){setError(problem instanceof Error?problem.message:t('commerce.failed'));}
    finally{setBusy('');}
  }

  if(loading||!user)return <main className="status-page"><section><div className="status-orb">▤</div><p className="page-eyebrow">ENACADEMY</p><h1>{t('commerce.loadingPurchases')}</h1></section></main>;

  return <main className="dashboard-shell commerce-shell">
    <StudentSidebar active="purchases"/>
    <section className="store-main">
      <header className="commerce-hero"><div><p className="page-eyebrow">{t('commerce.library')}</p><h1>{t('commerce.purchaseTitle')}</h1><p>{t('commerce.purchaseLeade')}</p></div><Link className="commerce-history-link" href="/store">{t('commerce.backStore')} →</Link></header>
      {error&&<div className="commerce-error" role="alert">{error}</div>}
      <div className="commerce-tabs purchase-tabs" role="tablist">
        <button role="tab" aria-selected={tab==='PURCHASES'} className={tab==='PURCHASES'?'active':''} onClick={()=>setTab('PURCHASES')}>{t('commerce.purchases')} <span>{orders.length}</span></button>
        <button role="tab" aria-selected={tab==='INVOICES'} className={tab==='INVOICES'?'active':''} onClick={()=>setTab('INVOICES')}>{t('commerce.invoices')} <span>{orders.length}</span></button>
      </div>

      {!orders.length?<section className="commerce-empty"><span>◫</span><h2>{t('commerce.empty')}</h2><p>{t('commerce.emptyBody')}</p><Link className="commerce-buy" href="/store">{t('commerce.explore')}</Link></section>:
      tab==='PURCHASES'?<section className="purchase-list">{orders.map(order=><article key={order.id}>
        <header><div><span className="status-pill approved">{t('commerce.statusApproved')}</span><strong>{formatDate(order.createdAt,locale)}</strong></div><b>{toman(order.totalToman,locale)} {t('commerce.toman')}</b></header>
        <div className="purchase-items">{order.items.map(item=><PurchaseItemRow key={item.productId} item={item} locale={locale} t={t} busy={busy} download={download}/>)}</div>
        <footer><span>{t('commerce.order')} {order.id.slice(0,8).toUpperCase()}</span><button onClick={()=>download(`/api/v1/store/invoices/${order.invoiceId}/pdf`,`${order.invoiceNumber}.pdf`,order.invoiceId)} disabled={busy===order.invoiceId}>↓ {t('commerce.invoicePdf')}</button></footer>
      </article>)}</section>:
      <section className="invoice-list"><div className="invoice-language-note"><span>فا</span><div><strong>{t('commerce.persianInvoices')}</strong><p>{t('commerce.persianInvoicesBody')}</p></div></div>{orders.map(order=><article key={order.invoiceId}>
        <span className="invoice-glyph">▤</span><div><small>{t('commerce.invoice')}</small><strong>{order.invoiceNumber}</strong><time>{formatDate(order.createdAt,locale)}</time></div><b>{toman(order.totalToman,locale)} {t('commerce.toman')}</b>
        <button onClick={()=>download(`/api/v1/store/invoices/${order.invoiceId}/pdf`,`${order.invoiceNumber}.pdf`,order.invoiceId)} disabled={busy===order.invoiceId}>{busy===order.invoiceId?t('commerce.preparingPdf'):'PDF ↓'}</button>
      </article>)}</section>}
    </section>
  </main>;
}

function PurchaseItemRow({item,locale,t,busy,download}:{item:PurchaseItem;locale:'en'|'fa';t:(key:string,values?:Record<string,string|number>)=>string;busy:string;download:(path:string,filename:string,key:string)=>Promise<void>}){
  return <div><span className={`purchase-type ${item.productType.toLowerCase()}`}>{item.productType==='COURSE'?'Aa':'PDF'}</span><div><strong>{itemTitle(item,locale)}</strong><small>{item.productType==='COURSE'?t('commerce.courseUnlocked'):t('commerce.bookReady')}</small></div><b>{toman(item.lineTotalToman,locale)} {t('commerce.toman')}</b>{item.productType==='COURSE'?<Link href="/dashboard">{t('commerce.open')} →</Link>:<button disabled={busy===item.productId} onClick={()=>download(`/api/v1/store/books/${item.productId}/download`,`${item.titleEn.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.pdf`,item.productId)}>↓ {t('commerce.download')}</button>}</div>;
}

function formatDate(value:string,locale:'en'|'fa'){
  return new Intl.DateTimeFormat(locale==='fa'?'fa-IR-u-ca-persian':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
}

function saveBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
