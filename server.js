const express=require("express");
const path=require("path");
const app=express();
const PORT=process.env.PORT||3000;
const API_KEY=process.env.XAPI_KOREA_KEY;
app.use(express.static(path.join(__dirname)));
app.get("/api/search",async(req,res)=>{
  if(!API_KEY)return res.status(500).json({error:"Липсва XAPI_KOREA_KEY в environment variables."});
  try{
    const url=new URL("https://api.xapikorea.com/v1/search");
    for(const [k,v] of Object.entries(req.query)) url.searchParams.set(k,v);
    const r=await fetch(url,{headers:{"X-API-Key":API_KEY}});
    const text=await r.text();
    res.status(r.status).type("application/json").send(text);
  }catch(e){res.status(502).json({error:"Неуспешна връзка с XAPI Korea."});}
});
app.listen(PORT,()=>console.log(`Korea Auto Finder: http://localhost:${PORT}`));