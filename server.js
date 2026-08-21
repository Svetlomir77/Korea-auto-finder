const express=require('express');
const app=express();
const PORT=process.env.PORT||3000;
const KOREA_KEY=process.env.XAPI_KOREA_KEY;
const AUTO_DEV_KEY=process.env.AUTO_DEV_API_KEY;
const cache=new Map();
const CACHE_TTL=60000;
app.use(express.static(__dirname));
const val=(o,...paths)=>{for(const p of paths){const v=p.split('.').reduce((x,k)=>x?.[k],o);if(v!==undefined&&v!==null&&v!=='')return v}return null};
async function korea(q){
 if(!KOREA_KEY) throw Error('Липсва XAPI_KOREA_KEY.');
 const u=new URL('https://api.xapikorea.com/v1/search');
 for(const k of ['brand','model','price_max','year_from','year_to','mileage_max','fuel_type','transmission','limit','lang']) if(q[k])u.searchParams.set(k,q[k]);
 const r=await fetch(u,{headers:{'X-API-Key':KOREA_KEY}}),t=await r.text(); if(!r.ok)throw Error('Korea API '+r.status+': '+t.slice(0,200));
 const d=JSON.parse(t),rows=Array.isArray(d.results)?d.results:(Array.isArray(d.data)?d.data:[]);
 return rows.map(c=>({source:'Korea',country:'KR',manufacturer:c.manufacturer||c.make||'',model:c.model||'',year:+c.year||null,mileage_km:+(c.mileage_km||c.mileage)||0,fuel_type:c.fuel_type||c.fuel||'',transmission:c.transmission||'',price_krw:+(c.price_krw||c.price)||0,price_usd:null,thumbnail:c.thumbnail||c.image||'',listing_url:c.encar_url||c.url||''}));
}
async function usa(q){
 if(!AUTO_DEV_KEY) throw Error('Липсва AUTO_DEV_API_KEY.');
 const u=new URL('https://api.auto.dev/listings');
 if(q.brand)u.searchParams.set('vehicle.make',q.brand);
 if(q.model)u.searchParams.set('vehicle.model',q.model);
 if(q.year_from||q.year_to)u.searchParams.set('vehicle.year',`${q.year_from||1900}-${q.year_to||2100}`);
 if(q.price_max)u.searchParams.set('retailListing.price',`1-${Math.round(+q.price_max)}`);
 if(q.mileage_max)u.searchParams.set('retailListing.miles',`0-${Math.round(+q.mileage_max)}`);
 if(q.fuel_type)u.searchParams.set('vehicle.fuel',q.fuel_type);
 if(q.transmission)u.searchParams.set('vehicle.transmission',q.transmission);
 u.searchParams.set('retailListing.used','true');u.searchParams.set('limit','20');u.searchParams.set('sort','updatedAt.desc');
 const r=await fetch(u,{headers:{Authorization:`Bearer ${AUTO_DEV_KEY}`,'Content-Type':'application/json'}}),t=await r.text(); if(!r.ok)throw Error('Auto.dev API '+r.status+': '+t.slice(0,250));
 const d=JSON.parse(t),rows=Array.isArray(d.data)?d.data:[];
 return rows.map(c=>{const miles=+val(c,'retailListing.miles','miles','vehicle.miles')||0;return {source:'USA',country:'US',manufacturer:val(c,'vehicle.make','make')||'',model:val(c,'vehicle.model','model')||'',year:+val(c,'vehicle.year','year')||null,mileage_km:Math.round(miles*1.609344),mileage_miles:miles,fuel_type:val(c,'vehicle.fuel','fuel')||'',transmission:val(c,'vehicle.transmission','transmission')||'',price_usd:+val(c,'retailListing.price','price')||0,price_krw:null,thumbnail:val(c,'retailListing.images.0.url','images.0.url','photoUrl')||'',listing_url:val(c,'retailListing.vdpUrl','vdpUrl','url')||''};});
}
app.get('/api/search',async(req,res)=>{const source=(req.query.source||'all').toLowerCase(),key=JSON.stringify(req.query),hit=cache.get(key);if(hit&&Date.now()-hit.time<CACHE_TTL)return res.json(hit.body);try{const jobs=[];if(source==='korea'||source==='all')jobs.push(korea(req.query).then(x=>({x})).catch(e=>({e:e.message})));if(source==='usa'||source==='all')jobs.push(usa(req.query).then(x=>({x})).catch(e=>({e:e.message})));const a=await Promise.all(jobs),body={results:a.flatMap(x=>x.x||[]),total_count:a.reduce((n,x)=>n+(x.x?.length||0),0),errors:a.filter(x=>x.e).map(x=>x.e)};cache.set(key,{time:Date.now(),body});res.json(body);}catch(e){res.status(500).json({error:e.message});}});
app.listen(PORT,()=>console.log('Korea Auto Finder v3 running on '+PORT));
