'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { StudentSidebar } from '@/components/WorkspaceNavigation';
import { Product, Purchase, productDescription, productPreview, productTitle, toman } from '@/lib/commerce';

export default function StorePage(){
  const {user,loading,apiFetch,apiDownload}=useAuth();
  const {locale,t}=usePreferences();
  const router=useRouter();
  const [products,setProducts]=useState<Product[]>([]);
  const [kind,setKind]=useState<'COURSE'|'BOOK'>('COURSE');
  const [preview,setPreview]=useState<Product|null>(null);
  const [purchase,setPurchase]=useState<Purchase|null>(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(()=>apiFetch<Product[]>('/api/v1/store/products').then(setProducts).catch(problem=>setError(problem.message)),[apiFetch]);
  useEffect(()=>{
    if(!loading&&!user)router.replace('/login');
    else if(user?.role==='ADMIN')router.replace('/admin');
    else if(user)load();
  },[loading,user,router,load]);

  const visible=useMemo(()=>products.filter(product=>product.type===kind),[products,kind]);

  async function buy(product:Product){
    setBusy(product.id);setError('');
    try{
      const result=await apiFetch<Purchase>('/api/v1/store/purchases',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productIds:[product.id]})});
      setPurchase(result);
      setProducts(current=>current.map(item=>item.id===product.id?{...item,purchased:true}:item));
      setPreview(null);
    }catch(problem){setError(problem instanceof Error?problem.message:t('commerce.failed'));}
    finally{setBusy('');}
  }

  async function downloadBook(product:Product){
    setBusy(product.id);setError('');
    try{
      const blob=await apiDownload(`/api/v1/store/books/${product.id}/download`);
      saveBlob(blob,`${product.slug}.pdf`);
    }catch(problem){setError(problem instanceof Error?problem.message:t('commerce.failed'));}
    finally{setBusy('');}
  }

  if(loading||!user)return <CommerceLoading message={t('commerce.loading')}/>;

  return <main className="dashboard-shell commerce-shell">
    <StudentSidebar active="store"/>
    <section className="store-main">
      <header className="commerce-hero">
        <div><p className="page-eyebrow">{t('commerce.beta')}</p><h1>{t('commerce.title')}</h1><p>{t('commerce.lede')}</p></div>
        <Link className="commerce-history-link" href="/purchases">{t('commerce.viewPurchases')} →</Link>
      </header>

      <div className="beta-purchase-note"><span>β</span><div><strong>{t('commerce.instantTitle')}</strong><p>{t('commerce.instantBody')}</p></div></div>
      {error&&<div className="commerce-error" role="alert">{error}</div>}

      <div className="commerce-tabs" role="tablist">
        <button role="tab" aria-selected={kind==='COURSE'} className={kind==='COURSE'?'active':''} onClick={()=>setKind('COURSE')}>{t('commerce.courses')}</button>
        <button role="tab" aria-selected={kind==='BOOK'} className={kind==='BOOK'?'active':''} onClick={()=>setKind('BOOK')}>{t('commerce.books')}</button>
      </div>

      <section className="product-grid">
        {visible.map(product=><article className={`product-card ${product.type.toLowerCase()}`} key={product.id}>
          <div className="product-cover">
            <span>{product.type==='COURSE'?product.targetKey:'PDF'}</span>
            <i>{product.badge}</i>
            <b>{product.type==='COURSE'?'Aa':'▤'}</b>
          </div>
          <div className="product-copy">
            <p className="page-eyebrow">{product.type==='COURSE'?t('commerce.fullCourse'):t('commerce.digitalBook')}</p>
            <h2>{productTitle(product,locale)}</h2>
            <p>{productDescription(product,locale)}</p>
            <div className="product-price"><strong>{toman(product.priceToman,locale)}</strong><span>{t('commerce.toman')}</span></div>
            <div className="product-actions">
              <button className="commerce-preview" onClick={()=>setPreview(product)}>{t('commerce.preview')}</button>
              {!product.purchased&&<button className="commerce-buy" disabled={busy===product.id} onClick={()=>buy(product)}>{busy===product.id?t('commerce.approving'):(product.type==='COURSE'?t('commerce.buyUnlock'):t('commerce.buyDownload'))}</button>}
              {product.purchased&&product.type==='COURSE'&&<Link className="commerce-owned" href="/dashboard">✓ {t('commerce.openCourse')}</Link>}
              {product.purchased&&product.type==='BOOK'&&<button className="commerce-owned" disabled={busy===product.id} onClick={()=>downloadBook(product)}>↓ {t('commerce.download')}</button>}
            </div>
          </div>
        </article>)}
      </section>
    </section>

    {preview&&<div className="commerce-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)setPreview(null);}}>
      <section className="commerce-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <button className="modal-close" onClick={()=>setPreview(null)} aria-label={t('commerce.close')}>×</button>
        <span className="modal-product-icon">{preview.type==='COURSE'?preview.targetKey:'PDF'}</span>
        <p className="page-eyebrow">{t('commerce.previewLabel')}</p>
        <h2 id="preview-title">{productTitle(preview,locale)}</h2>
        <p>{productPreview(preview,locale)}</p>
        <div className="modal-delivery"><span>✓</span><div><strong>{preview.type==='COURSE'?t('commerce.courseDelivery'):t('commerce.bookDelivery')}</strong><small>{t('commerce.betaInvoiceIncluded')}</small></div></div>
        <div className="modal-purchase-row"><strong>{toman(preview.priceToman,locale)} {t('commerce.toman')}</strong>
          {!preview.purchased?<button disabled={busy===preview.id} onClick={()=>buy(preview)}>{t('commerce.approvePurchase')}</button>:<span>✓ {t('commerce.owned')}</span>}
        </div>
      </section>
    </div>}

    {purchase&&<div className="commerce-modal-backdrop">
      <section className="commerce-modal purchase-success" role="dialog" aria-modal="true">
        <span className="success-orb">✓</span><p className="page-eyebrow">{t('commerce.approved')}</p>
        <h2>{t('commerce.ready')}</h2><p>{t('commerce.readyBody')}</p>
        <div><Link className="commerce-buy" href="/purchases">{t('commerce.invoiceAndDownloads')}</Link><button className="commerce-preview" onClick={()=>setPurchase(null)}>{t('commerce.keepShopping')}</button></div>
      </section>
    </div>}
  </main>;
}

function saveBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function CommerceLoading({message}:{message:string}){
  return <main className="status-page"><section><div className="status-orb">◫</div><p className="page-eyebrow">ENACADEMY STORE</p><h1>{message}</h1></section></main>;
}
