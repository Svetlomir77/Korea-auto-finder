const express=require("express");
const app=express();
const PORT=process.env.PORT||3000;
const API_KEY=process.env.XAPI_KOREA_KEY;
const cache=new Map();
const CACHE_TTL=60*1000;

app.use(express.static(__dirname));

app.get("/api/search", async (req,res)=>{
  if(!API_KEY) return res.status(500).json({error:"Липсва XAPI_KOREA_KEY в Railway Variables."});
  try{
    const qs=new URLSearchParams(req.query).toString();
    const cached=cache.get(qs);
    if(cached && Date.now()-cached.time<CACHE_TTL){
      return res.status(200).type("application/json").send(cached.body);
    }
    const url=new URL("https://api.xapikorea.com/v1/search");
    for(const [k,v] of Object.entries(req.query)) url.searchParams.set(k,v);
    const r=await fetch(url,{headers:{"X-API-Key":API_KEY}});
    const text=await r.text();
    if(r.ok) cache.set(qs,{time:Date.now(),body:text});
    res.status(r.status).type("application/json").send(text);
  }catch(e){
    res.status(502).json({error:"Неуспешна връзка с XAPI Korea."});
  }
});

app.listen(PORT,()=>console.log("Korea Auto Finder running on "+PORT));
