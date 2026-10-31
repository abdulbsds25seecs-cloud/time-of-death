import React, {useEffect,useId,useRef,useState} from 'react';
import {BAYER_8} from './dither.mjs';

export default function AmbientDither(){
  const ref=useRef(null),pattern=`ambient-${useId().replaceAll(':','')}`;
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(failed)return;
    const canvas=ref.current,ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx){setFailed(true);return;}
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const color=getComputedStyle(document.documentElement).getPropertyValue('--ash').trim().replace('#','');
    const rgb=[0,2,4].map(offset=>parseInt(color.slice(offset,offset+2),16));
    let raf=0,last=0,data,width=0,height=0;
    let xs,xc,ys,yc;
    const paint=time=>{
      const t=reduced.matches?0:time/1000;
      // Separable waves: only O(width + height) trig calls per frame.
      for(let x=0;x<width;x++){xs[x]=Math.sin(x/width*9-t*.42);xc[x]=Math.cos(x/width*15+t*.23);}
      for(let y=0;y<height;y++){ys[y]=Math.cos(y/height*8+t*.29);yc[y]=Math.sin(y/height*12-t*.31);}
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const wave=xs[x]*ys[y]+xc[x]*yc[y]*.6;
        const density=Math.max(.025,Math.min(.75,.28+wave*.26));
        data.data[(y*width+x)*4+3]=(BAYER_8[y%8][x%8]+.5)/64<density?255:0;
      }
      ctx.putImageData(data,0,0);
    };
    const tick=time=>{
      if(document.hidden||reduced.matches)return;
      if(time-last>=100){paint(time);last=time;}
      raf=requestAnimationFrame(tick);
    };
    const refresh=()=>{
      cancelAnimationFrame(raf);
      const bounds=canvas.parentElement.getBoundingClientRect();
      const cell=Math.max(4,Math.ceil(bounds.width/360));
      const w=Math.max(1,Math.ceil(bounds.width/cell)),h=Math.max(1,Math.ceil(bounds.height/cell));
      if(w!==width||h!==height){
        width=w;height=h;canvas.width=w;canvas.height=h;data=ctx.createImageData(w,h);
        xs=new Float32Array(w);xc=new Float32Array(w);ys=new Float32Array(h);yc=new Float32Array(h);
        for(let offset=0;offset<data.data.length;offset+=4){data.data[offset]=rgb[0];data.data[offset+1]=rgb[1];data.data[offset+2]=rgb[2];}
      }
      paint(performance.now());last=0;
      if(!document.hidden&&!reduced.matches)raf=requestAnimationFrame(tick);
    };
    const observer=new ResizeObserver(refresh);observer.observe(canvas.parentElement);
    reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);refresh();
    return()=>{cancelAnimationFrame(raf);observer.disconnect();reduced.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[failed]);
  return <div className="ambient-dither" aria-hidden="true">{failed?<svg width="100%" height="100%" focusable="false"><defs><pattern id={pattern} width="24" height="24" patternUnits="userSpaceOnUse">{BAYER_8.flatMap((row,y)=>row.map((rank,x)=>rank<19?<rect key={`${x}-${y}`} x={x*3} y={y*3} width="3" height="3"/>:null))}</pattern></defs><rect width="100%" height="100%" fill={`url(#${pattern})`}/></svg>:<canvas ref={ref}/>}</div>;
}
