import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {TOUR_STEPS,tourPlacement} from './tour-layout.mjs';

const preference='time-of-death:tour:v1';
const remember=()=>{try{localStorage.setItem(preference,'dismissed');}catch{/* Private browsing still permits a session tour. */}};

export function TourCard({welcome,step=0,onStart,onClose,onNever,onBack,onNext,cardRef,style,side='center'}){
  const current=TOUR_STEPS[step];
  return <section ref={cardRef} className={`tour-card${welcome?' tour-welcome':''}`} style={style} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description" tabIndex={-1} data-side={side}>
    <div className="tour-card-top"><span className="tour-signature">Time of Death</span><button className="tour-close" onClick={onClose} aria-label="Close tour">×</button></div>
    {welcome?<><p className="tour-intro">A field guide to your first case</p><h2 id="tour-title">Every regression<br/>leaves a trace.</h2><p id="tour-description">Find the commit where a check starts failing. Follow the evidence, inspect the change, and ask a local model for a second opinion.</p><div className="tour-welcome-note"><span className="tour-crosshair" aria-hidden="true"/><span>A short tour of the console.<br/>No commands run during the tour.</span></div><div className="tour-actions"><button className="tour-primary" onClick={onStart}>Take tour</button><button className="tour-secondary" onClick={onNever}>Do not show again</button></div></>:<><div className="tour-progress" aria-label={`Step ${step+1} of ${TOUR_STEPS.length}`}>{TOUR_STEPS.map((_,index)=><span key={index} className={index<=step?'is-reached':''}/>)}</div><p className="tour-step-count">Field guide <span>{step+1} / {TOUR_STEPS.length}</span></p><h2 id="tour-title">{current.title}</h2><p id="tour-description" aria-live="polite">{current.body}</p><div className="tour-actions"><button className="tour-secondary" onClick={onBack} disabled={step===0}>Back</button><button className="tour-skip" onClick={onClose}>Skip tour</button><button className="tour-primary" onClick={onNext}>{step===TOUR_STEPS.length-1?'Finish tour':'Next section'}</button></div><p className="tour-key-hint">Use ← and → to move. Esc closes the tour.</p></>}
  </section>;
}

export default function GuidedTour({replay=0,suspended=false}){
  const [mode,setMode]=useState('closed'),[step,setStep]=useState(0),[placement,setPlacement]=useState(null);
  const card=useRef(null),prompted=useRef(false),restoreFocus=useRef(null),mask=`tour-mask-${useId().replaceAll(':','')}`;
  const open=mode!=='closed',welcome=mode==='welcome';
  const close=()=>setMode('closed');
  const next=()=>{if(step===TOUR_STEPS.length-1){remember();close();}else setStep(value=>value+1);};
  useEffect(()=>{
    if(suspended||prompted.current)return;
    try{if(localStorage.getItem(preference)==='dismissed'){prompted.current=true;return;}}catch{}
    const timer=setTimeout(()=>{if(prompted.current)return;prompted.current=true;setMode('welcome');},450);
    return()=>clearTimeout(timer);
  },[suspended]);
  useEffect(()=>{if(replay){prompted.current=true;setStep(0);setMode('welcome');}},[replay]);
  useLayoutEffect(()=>{
    if(!open)return;
    restoreFocus.current=document.activeElement;
    card.current?.focus({preventScroll:true});
    const root=document.getElementById('root'),previousInert=root?.inert;
    if(root)root.inert=true;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previousOverflow;if(root)root.inert=previousInert;if(restoreFocus.current?.isConnected)restoreFocus.current.focus({preventScroll:true});};
  },[open]);
  useEffect(()=>{
    if(!open)return;
    const key=event=>{
      event.stopPropagation();
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(!welcome&&event.key==='ArrowRight'){event.preventDefault();next();return;}
      if(!welcome&&event.key==='ArrowLeft'){event.preventDefault();setStep(value=>Math.max(0,value-1));return;}
      if(event.key==='Tab'){
        const elements=[...card.current.querySelectorAll('button:not(:disabled),[href],input,[tabindex="0"]')];
        const first=elements[0],last=elements.at(-1),active=document.activeElement;
        if(event.shiftKey&&(active===first||active===card.current||!card.current.contains(active))){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(active===last||active===card.current||!card.current.contains(active))){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown',key,true);
    return()=>window.removeEventListener('keydown',key,true);
  },[open,welcome,step]);
  useLayoutEffect(()=>{
    if(!open)return;
    let frame=0,alive=true;
    const target=welcome?null:document.querySelector(TOUR_STEPS[step].target);
    // Instant scrolling keeps the spotlight and text synchronized, including on mobile.
    target?.classList.add('tour-active-target');
    target?.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
    const measure=()=>{
      if(!alive)return;
      const viewport={width:window.innerWidth,height:window.innerHeight};
      const rect=target?.getBoundingClientRect();
      setPlacement(tourPlacement(rect,viewport,{height:card.current?.getBoundingClientRect().height||300}));
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);
    if(target)observer.observe(target);if(card.current)observer.observe(card.current);
    window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);
    document.fonts?.ready.then(()=>{if(alive)schedule();});
    measure();card.current?.focus({preventScroll:true});
    return()=>{alive=false;target?.classList.remove('tour-active-target');cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);};
  },[open,welcome,step]);
  if(!open)return null;
  const hole=welcome?null:placement?.hole;
  const style=placement?{left:placement.left,top:placement.top,width:placement.width}:{left:'50%',top:'50%',width:'min(380px,calc(100vw - 28px))',transform:'translate(-50%,-50%)'};
  if(hole&&placement){style['--tour-pointer-x']=`${Math.max(22,Math.min(placement.width-22,hole.left+hole.width/2-placement.left))}px`;style['--tour-pointer-y']=`${Math.max(24,Math.min((card.current?.offsetHeight||280)-24,hole.top+hole.height/2-placement.top))}px`;}
  const pointer=hole&&placement&&placement.side!=='center'?{left:placement.side==='right'?placement.left-6:placement.side==='left'?placement.left+placement.width-6:placement.left+parseFloat(style['--tour-pointer-x'])-6,top:placement.side==='bottom'?placement.top-6:placement.side==='top'?placement.top+(card.current?.offsetHeight||280)-6:placement.top+parseFloat(style['--tour-pointer-y'])-6}:null;
  return createPortal(<div className="tour-layer">
    <svg className="tour-shade" width="100%" height="100%" aria-hidden="true"><defs><mask id={mask}><rect width="100%" height="100%" fill="white"/>{hole&&<rect x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx="8" fill="black"/>}</mask></defs><rect width="100%" height="100%" mask={`url(#${mask})`}/></svg>
    {hole&&<div className="tour-spotlight" style={{left:hole.left,top:hole.top,width:hole.width,height:hole.height}}/>}
    {pointer&&<div className="tour-pointer" data-side={placement.side} style={pointer} aria-hidden="true"/>}
    <TourCard welcome={welcome} step={step} onStart={()=>{setStep(0);setMode('tour');}} onClose={close} onNever={()=>{remember();close();}} onBack={()=>setStep(value=>Math.max(0,value-1))} onNext={next} cardRef={card} style={style} side={placement?.side}/>
  </div>,document.body);
}
