import React, { useEffect, useId, useRef, useState } from 'react';
import { BAYER_8 } from './dither.mjs';

function rgb(value) { const text=value.trim().replace('#',''); return [0,2,4].map(i=>parseInt(text.slice(i,i+2),16)); }

export default function Dither({ range, tone = 'oxblood', density = .42, animate = false, className = '', svg = false }) {
  const ref = useRef(null), previous = useRef(null);
  const [failed, setFailed] = useState(false);
  const id = useId().replaceAll(':','');
  useEffect(() => {
    if (svg || failed || !ref.current) return;
    const canvas=ref.current, ctx=canvas.getContext('2d',{alpha:false});
    if (!ctx) { setFailed(true); return; }
    let raf=0, frameTime=0, offscreen=false, began=performance.now();
    const cell=3, reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const next=range?.total ? { left:range.start/range.total, right:(range.end+1)/range.total } : { left:0,right:1 };
    const old=previous.current || next; previous.current=next;
    const styles=getComputedStyle(document.documentElement), bg=rgb(styles.getPropertyValue('--tomb')), fg=rgb(styles.getPropertyValue(`--${tone}`));
    const duration=range?.resolved ? 900 : 550;
    const paint = time => {
      if (!canvas.isConnected) return;
      const bounds=canvas.parentElement.getBoundingClientRect();
      const width=Math.max(1,Math.ceil(bounds.width/cell)), height=Math.max(1,Math.ceil(bounds.height/cell));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      canvas.style.width=`${width*cell}px`;canvas.style.height=`${height*cell}px`;
      const progress=!animate||reduced.matches||document.hidden||offscreen ? 1 : Math.min(1,(time-began)/duration);
      const eased=1-(1-progress)**3;
      const left=old.left+(next.left-old.left)*eased, right=old.right+(next.right-old.right)*eased;
      const data=ctx.createImageData(width,height);
      for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
        const position=(x+.5)/width, within=!range?.total || (position>=left&&position<=right);
        const edge=range?.total ? Math.min(1, Math.min(position-left,right-position)*range.total*2.5) : 1;
        const threshold=within ? density*(.6+.4*Math.max(0,edge)) : 0;
        const color=((BAYER_8[y%8][x%8]+.5)/64<threshold) ? fg : bg;
        const offset=(y*width+x)*4;data.data[offset]=color[0];data.data[offset+1]=color[1];data.data[offset+2]=color[2];data.data[offset+3]=255;
      }
      ctx.putImageData(data,0,0);
      if(progress<1&&!document.hidden&&!offscreen) raf=requestAnimationFrame(tick);
    };
    const tick=time=> { if(time-frameTime<45){raf=requestAnimationFrame(tick);return;} frameTime=time;paint(time); };
    const refresh=()=>{cancelAnimationFrame(raf);paint(performance.now());};
    const resize=new ResizeObserver(refresh);resize.observe(canvas.parentElement);
    const observer=new IntersectionObserver(entries=>{offscreen=!entries[0].isIntersecting;refresh();});observer.observe(canvas);
    document.addEventListener('visibilitychange',refresh);reduced.addEventListener('change',refresh);
    paint(performance.now());
    return ()=>{cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',refresh);reduced.removeEventListener('change',refresh);};
  },[range?.start,range?.end,range?.total,range?.resolved,tone,density,animate,failed,svg]);
  if (svg || failed) return <svg className={`dither ${className}`} aria-hidden="true" width="100%" height="100%"><defs><pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="var(--tomb)"/>{BAYER_8.flatMap((row,y)=>row.map((v,x)=>v/64<density?<rect key={`${x}-${y}`} x={x*3} y={y*3} width="3" height="3" fill={`var(--${tone})`}/>:null))}</pattern></defs><rect width="100%" height="100%" fill="var(--tomb)"/><rect x={`${(range?.start||0)/(range?.total||1)*100}%`} width={`${range?.total ? (range.end-range.start+1)/range.total*100 : 100}%`} height="100%" fill={`url(#${id})`}/></svg>;
  return <canvas ref={ref} className={`dither ${className}`} aria-hidden="true"/>;
}
