export type Product = {
  id:string; slug:string; type:'COURSE'|'BOOK'; titleEn:string; titleFa:string;
  descriptionEn:string; descriptionFa:string; previewEn:string; previewFa:string;
  priceToman:number; targetKey:string|null; badge:string; active:boolean; purchased:boolean;
};

export type PurchaseItem = {
  productId:string; productType:'COURSE'|'BOOK'; titleEn:string; titleFa:string;
  quantity:number; unitPriceToman:number; lineTotalToman:number;
};

export type Purchase = {
  id:string; status:'APPROVED'|'REFUNDED'; subtotalToman:number; totalToman:number;
  currency:'TOMAN'; createdAt:string; invoiceId:string; invoiceNumber:string; items:PurchaseItem[];
};

export function productTitle(product:Product,locale:'en'|'fa') {
  return locale==='fa'?product.titleFa:product.titleEn;
}

export function productDescription(product:Product,locale:'en'|'fa') {
  return locale==='fa'?product.descriptionFa:product.descriptionEn;
}

export function productPreview(product:Product,locale:'en'|'fa') {
  return locale==='fa'?product.previewFa:product.previewEn;
}

export function itemTitle(item:PurchaseItem,locale:'en'|'fa') {
  return locale==='fa'?item.titleFa:item.titleEn;
}

export function toman(value:number,locale:'en'|'fa') {
  return new Intl.NumberFormat(locale==='fa'?'fa-IR':'en-US').format(value);
}
