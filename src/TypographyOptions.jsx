import React from 'react';

export const FONT_OPTIONS=[
  {id:'cormorant',name:'Cormorant Garamond',family:'Cormorant Garamond',description:'The chosen face. Elegant, literary and a little funereal; a good fit for a forensic ledger.'},
  {id:'newsreader',name:'Newsreader',family:'Newsreader',description:'Calm and editorial. A softer, quieter look for long sessions.'},
  {id:'fell',name:'IM Fell English',family:'IM Fell English',description:'The original ledger face. Rougher ink and an older, more haunted character.'}
];

export default function TypographyOptions({value,onChange}){
  return <div className="font-options"><p>Choose the character of the console. Controls stay clear and compact; execution evidence keeps IBM Plex Mono.</p>{FONT_OPTIONS.map(font=><button key={font.id} className={`font-option${value===font.id?' is-selected':''}`} aria-pressed={value===font.id} onClick={()=>onChange(font.id)}><span className="font-option-name">{font.name}<span>{value===font.id?'Selected':'Preview this font'}</span></span><span className="font-specimen" style={{fontFamily:`'${font.family}',serif`}}>Every regression leaves a trace.</span><span className="font-description">{font.description}</span></button>)}<p className="small">All three fonts are bundled locally. Your choice is remembered in this browser when storage is available.</p></div>;
}
