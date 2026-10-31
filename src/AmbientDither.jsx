import React, {useEffect,useId,useState} from 'react';
import {BAYER_8} from './dither.mjs';

export default function AmbientDither(){
  const pattern=`ambient-${useId().replaceAll(':','')}`;
  const [hidden,setHidden]=useState(()=>document.hidden);
  useEffect(()=>{
    const update=()=>setHidden(document.hidden);
    document.addEventListener('visibilitychange',update);
    return()=>document.removeEventListener('visibilitychange',update);
  },[]);
  return <div className={`ambient-dither${hidden?' is-paused':''}`} aria-hidden="true">
    <svg width="100%" height="100%" focusable="false">
      <defs><pattern id={pattern} width="24" height="24" patternUnits="userSpaceOnUse">
        {BAYER_8.flatMap((row,y)=>row.map((rank,x)=>rank<19?<rect key={`${x}-${y}`} x={x*3} y={y*3} width="3" height="3"/>:null))}
      </pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${pattern})`}/>
    </svg>
  </div>;
}
