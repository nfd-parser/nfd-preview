/* NFD: small bounded MP4 metadata probe, no full-file download. */
(function (global) {
'use strict';
const HEAD=128*1024, MAX_MOOV=4*1024*1024;
const u32=(a,p)=>((a[p]*16777216)+(a[p+1]<<16)+(a[p+2]<<8)+a[p+3])>>>0;
const str=(a,p)=>String.fromCharCode(a[p],a[p+1],a[p+2],a[p+3]);
function box(a,p,end) {
  if(p+8>end)return null;
  let n=u32(a,p),h=8;
  if(n===1){if(p+16>end)return null;n=u32(a,p+8)*4294967296+u32(a,p+12);h=16;}
  if(!Number.isSafeInteger(n)||n<h)return null;
  return {type:str(a,p+4),start:p,end:p+n,size:n,header:h};
}
function children(a,root){
  const out=[];if(!root||root.end>a.length)return out;
  for(let p=root.start+root.header;p+8<=root.end;){
    const v=box(a,p,root.end);if(!v||v.end>root.end)break;
    out.push(v);p=v.end;
  }
  return out;
}
const child=(a,root,type)=>children(a,root).find(x=>x.type===type)||null;
function parseMoov(data){
  const moov=box(data,0,data.length);
  if(!moov||moov.type!=='moov'||moov.end>data.length)throw Error('Invalid moov');
  const info={video:[],audio:[]};
  for(const trak of children(data,moov).filter(x=>x.type==='trak')){
    const mdia=child(data,trak,'mdia'),hdlr=child(data,mdia,'hdlr');
    if(!hdlr||hdlr.start+hdlr.header+12>hdlr.end)continue;
    const kind=str(data,hdlr.start+hdlr.header+8);
    if(kind!=='vide'&&kind!=='soun')continue;
    const stsd=child(data,child(data,child(data,mdia,'minf'),'stbl'),'stsd');
    if(!stsd||stsd.start+stsd.header+8>stsd.end)continue;
    let pos=stsd.start+stsd.header+8;
    const count=Math.min(u32(data,stsd.start+stsd.header+4),16);
    for(let i=0;i<count;i++){
      const entry=box(data,pos,stsd.end);if(!entry||entry.end>stsd.end)break;
      if(kind==='vide')info.video.push({
        codec:entry.type,
        width:entry.size>=36?data[pos+32]*256+data[pos+33]:0,
        height:entry.size>=36?data[pos+34]*256+data[pos+35]:0
      });
      else info.audio.push({
        codec:entry.type,
        channels:entry.size>=28?data[pos+24]*256+data[pos+25]:0
      });
      pos=entry.end;
    }
  }
  return info;
}
async function range(url,start,n,signal){
  const res=await fetch(url,{method:'GET',mode:'cors',
    headers:{Range:'bytes='+start+'-'+(start+n-1)},signal});
  if(res.status!==206){
    if(res.body)res.body.cancel().catch(()=>{});
    throw Error('HTTP Range unavailable (status '+res.status+')');
  }
  const length=Number(res.headers.get('Content-Length')||0);
  if(length>n){if(res.body)res.body.cancel().catch(()=>{});throw Error('Unexpected large Range');}
  const b=new Uint8Array(await res.arrayBuffer());
  if(!b.byteLength||b.byteLength>n)throw Error('Invalid Range response size');
  return b;
}
async function inspect(url) {
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
  try {
    let bytes=await range(url,0,HEAD,ctrl.signal),windowStart=0,offset=0;
    for(let i=0;i<48;i++){
      if(offset-windowStart+16>bytes.byteLength){
        bytes=await range(url,offset,HEAD,ctrl.signal);windowStart=offset;
      }
      const pos=offset-windowStart,part=box(bytes,pos,bytes.length);
      if(!part)throw Error('Invalid MP4 box at '+offset);
      if(i===0&&part.type!=='ftyp'&&part.type!=='styp')
        throw Error('Source is not ISO BMFF/MP4');
      if(part.type==='moov'){
        if(part.size>MAX_MOOV)throw Error('MP4 moov too large for quick probe');
        const moov=part.end<=bytes.length?bytes.slice(pos,part.end):
          await range(url,offset,part.size,ctrl.signal);
        return parseMoov(moov);
      }
      offset+=part.size;
      if(!Number.isSafeInteger(offset)||offset<=0)throw Error('MP4 box offset invalid');
    }
    throw Error('MP4 moov not found');
  }finally{clearTimeout(timer);}
}
function choose(info,name){
  const hq=/(?:4k|2160p|uhd|hdr|dolby.?vision|hevc|h265|10bit|10-bit)/i.test(String(name||''));
  if(!info||!info.video.length)
    return {player:hq?'movi':'dplayer',reason:hq?'filename-hq':'metadata-unavailable'};
  const advancedVideo=info.video.some(t=>!['avc1','avc3','mp4v'].includes(t.codec)
     ||t.width>=2560||t.height>=1440);
  const advancedAudio=info.audio.some(t=>!['mp4a','mp3 ','Opus'].includes(t.codec));
  const noAudio=info.audio.length===0;
  return {player:advancedVideo||advancedAudio||noAudio||hq?'movi':'dplayer',
    reason:advancedAudio?'audio-codec':advancedVideo?'video-codec-or-resolution':
      noAudio?'audio-metadata-missing':hq?'filename-hq':'native-compatible'};
}
global.NfdMp4Probe={inspect,choose};
})(window);
