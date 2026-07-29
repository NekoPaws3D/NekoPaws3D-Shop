(function(){
  'use strict';
  if(window.__nekoBuddyLoaded) return;
  window.__nekoBuddyLoaded=true;

  const KEY='nekopaws3d_neko_buddy_v1';
  const defaults={visible:true,animations:true,sound:false,size:'medium',position:'right',seenWelcome:false};
  let settings={...defaults};
  try{settings={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){settings={...defaults}}
  if(!settings.visible) return;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const messages={
    'index.html':{text:'Miau! Willkommen bei <strong>NekoPaws3D</strong>. Soll ich dir beim Entdecken helfen? 🖤',actions:[['Zum Shop','#shop']]},
    'product.html':{text:'Oh, das sieht spannend aus! Schau dir in Ruhe alle Bilder und Details an. 🐾'},
    'zeichenauftrag.html':{text:'Deine Idee darf ruhig wild sein – beschreibe sie so genau wie möglich. 🎨'},
    'creator-studio.html':{text:'Willkommen im Creator Studio! Ich begleite dich Pfote für Pfote. ✨'},
    'konto.html':{text:'Hier wohnen deine Bestellungen und Projekte. Alles an einem sicheren Plätzchen. 📦'},
    'galerie.html':{text:'So viele schöne Unikate! Vielleicht inspiriert dich eines davon. ✨'},
    'gaestebuch.html':{text:'Eine liebe Nachricht macht meinen Tag besonders flauschig. 🖤'},
    'kontakt.html':{text:'Du hast eine Frage? Schreib uns – wir antworten so schnell wie möglich. 🐾'},
    'versand.html':{text:'Hier findest du alles zu Versand und Lieferzeiten. 📦'},
    'agb.html':{text:'Nicht besonders kuschelig, aber wichtig: unsere Bedingungen. 🐈'},
    'datenschutz.html':{text:'Deine Daten verdienen Schutz – genau wie ein Lieblingsspielzeug. 🔒'},
    'widerruf.html':{text:'Hier findest du alle Informationen zum Widerruf. 🐾'},
    'impressum.html':{text:'Hier stehen die offiziellen Angaben zu NekoPaws3D. 🖤'}
  };

  const root=document.createElement('aside');
  root.className='neko-buddy';
  root.dataset.size=settings.size;
  root.dataset.position=settings.position;
  root.setAttribute('aria-label','NekoBuddy Shop-Begleiter');
  if(!settings.animations) root.classList.add('no-animation');
  root.innerHTML=`
    <div class="neko-buddy__bubble" role="status" aria-live="polite">
      <button class="neko-buddy__bubble-close" type="button" aria-label="Nachricht schließen">×</button>
      <div class="neko-buddy__message"></div><div class="neko-buddy__actions"></div>
    </div>
    <div class="neko-buddy__stage">
      <button class="neko-buddy__button" type="button" aria-label="NekoBuddy öffnen">
        <svg class="neko-buddy__svg" viewBox="0 0 120 120" role="img" aria-label="Niedliche schwarze Anime-Katze">
          <defs>
            <radialGradient id="nb-fur" cx="42%" cy="35%"><stop offset="0" stop-color="#343038"/><stop offset=".7" stop-color="#111015"/><stop offset="1" stop-color="#050507"/></radialGradient>
            <linearGradient id="nb-eye" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b8ff6a"/><stop offset=".55" stop-color="#58e66b"/><stop offset="1" stop-color="#15994a"/></linearGradient>
          </defs>
          <g class="neko-buddy__tail"><path d="M87 95c20 4 26-12 17-20-6-5-13-1-11 5 1 4 7 3 8 0" fill="none" stroke="#0b0a0d" stroke-width="11" stroke-linecap="round"/><path d="M89 94c16 3 21-9 15-15" fill="none" stroke="#29242e" stroke-width="3" stroke-linecap="round" opacity=".55"/></g>
          <g class="neko-buddy__body"><ellipse cx="61" cy="91" rx="34" ry="27" fill="url(#nb-fur)" stroke="#ff2f85" stroke-opacity=".28"/><ellipse cx="49" cy="98" rx="13" ry="8" fill="#0c0b0f"/><ellipse cx="76" cy="98" rx="13" ry="8" fill="#0c0b0f"/></g>
          <g class="neko-buddy__ear-left"><path d="M31 45 28 13 50 34Z" fill="#0b0a0d" stroke="#ff2f85" stroke-opacity=".4"/><path d="M34 35 32 21 43 33Z" fill="#7e2349"/></g>
          <g class="neko-buddy__ear-right"><path d="M72 34 96 14 91 47Z" fill="#0b0a0d" stroke="#ff2f85" stroke-opacity=".4"/><path d="M80 34 92 22 89 38Z" fill="#7e2349"/></g>
          <ellipse cx="61" cy="55" rx="36" ry="31" fill="url(#nb-fur)" stroke="#ff2f85" stroke-opacity=".32"/>
          <path class="neko-buddy__shine" d="M38 34c7-8 21-11 33-7" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>
          <g class="neko-buddy__eyes"><ellipse cx="47" cy="54" rx="9" ry="11" fill="url(#nb-eye)"/><ellipse cx="76" cy="54" rx="9" ry="11" fill="url(#nb-eye)"/><ellipse cx="48" cy="55" rx="2.3" ry="7" fill="#061b0c"/><ellipse cx="75" cy="55" rx="2.3" ry="7" fill="#061b0c"/><circle cx="44" cy="49" r="2.2" fill="#fff"/><circle cx="72" cy="49" r="2.2" fill="#fff"/></g>
          <path d="M58 66c2-2 5-2 7 0-1 4-6 4-7 0Z" fill="#ff8fba"/>
          <path d="M61 70c-4 5-9 3-10 1m10-1c4 5 9 3 10 1" fill="none" stroke="#e8dbe4" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M39 66 21 63m18 7-18 4m62-8 18-3m-18 7 18 5" stroke="#d7cad3" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
          <path d="M46 82c8 5 22 5 30 0" fill="none" stroke="#ff2f85" stroke-width="4" stroke-linecap="round" opacity=".75"/><circle cx="61" cy="86" r="4" fill="#ffcf55" stroke="#8d5b00"/>
        </svg>
        <span class="neko-buddy__zzz">Zzz</span><span class="neko-buddy__hearts"></span>
      </button>
      <button class="neko-buddy__gear" type="button" aria-label="NekoBuddy Einstellungen">⚙</button>
    </div>
    <div class="neko-buddy__panel" role="dialog" aria-label="NekoBuddy Einstellungen">
      <h3>🐾 NekoBuddy</h3>
      <label class="neko-buddy__setting"><span>Animationen</span><input data-setting="animations" type="checkbox"></label>
      <label class="neko-buddy__setting"><span>Sounds</span><input data-setting="sound" type="checkbox"></label>
      <label class="neko-buddy__setting"><span>Größe</span><select data-setting="size"><option value="small">Klein</option><option value="medium">Mittel</option><option value="large">Groß</option></select></label>
      <label class="neko-buddy__setting"><span>Position</span><select data-setting="position"><option value="right">Rechts</option><option value="left">Links</option></select></label>
      <div class="neko-buddy__panel-buttons"><button data-action="test" type="button">Miau testen</button><button data-action="hide" type="button">Ausblenden</button></div>
    </div>`;
  document.body.appendChild(root);

  const toast=document.createElement('div');toast.className='neko-buddy-toast';document.body.appendChild(toast);
  const msg=root.querySelector('.neko-buddy__message');
  const actions=root.querySelector('.neko-buddy__actions');
  const stageButton=root.querySelector('.neko-buddy__button');
  let speakTimer=0,idleTimer=0;

  function save(){try{localStorage.setItem(KEY,JSON.stringify(settings))}catch(_){}}
  function setMessage(html,opts={}){
    clearTimeout(speakTimer);msg.innerHTML=html;actions.innerHTML='';
    (opts.actions||[]).forEach(([label,target])=>{const b=document.createElement('button');b.className='neko-buddy__action';b.type='button';b.textContent=label;b.addEventListener('click',()=>{if(target.startsWith('#')) document.querySelector(target)?.scrollIntoView({behavior:'smooth'});else location.href=target;root.classList.remove('is-speaking')});actions.appendChild(b)});
    root.classList.add('is-speaking');root.classList.remove('is-sleeping');
    if(opts.autoClose!==false) speakTimer=setTimeout(()=>root.classList.remove('is-speaking'),8500);
  }
  function hearts(){const c=root.querySelector('.neko-buddy__hearts');for(let i=0;i<5;i++){const h=document.createElement('span');h.className='neko-buddy__heart';h.textContent=i%2?'🖤':'💗';h.style.setProperty('--drift',`${(i-2)*16}px`);h.style.animationDelay=`${i*.08}s`;c.appendChild(h);setTimeout(()=>h.remove(),1500)}}
  function chirp(){if(!settings.sound) return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(520,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(760,ctx.currentTime+.12);g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.19);setTimeout(()=>ctx.close(),300)}catch(_){}}
  function react(){root.classList.remove('is-sleeping');root.classList.remove('is-happy');void root.offsetWidth;root.classList.add('is-happy');hearts();chirp();const variants=['Miau! Schön, dass du mich angeklickt hast. 🖤','Pfote drauf: Du hast einen tollen Geschmack! 🐾','Ich passe auf deinen Warenkorb auf. 😺','Heute ist ein guter Tag für etwas Einzigartiges. ✨'];setMessage(variants[Math.floor(Math.random()*variants.length)])}
  function resetIdle(){clearTimeout(idleTimer);root.classList.remove('is-sleeping');idleTimer=setTimeout(()=>{root.classList.remove('is-speaking');root.classList.add('is-sleeping')},45000)}
  ['mousemove','keydown','touchstart','scroll'].forEach(e=>document.addEventListener(e,resetIdle,{passive:true}));resetIdle();

  stageButton.addEventListener('click',react);
  root.querySelector('.neko-buddy__bubble-close').addEventListener('click',()=>root.classList.remove('is-speaking'));
  root.querySelector('.neko-buddy__gear').addEventListener('click',e=>{e.stopPropagation();root.classList.toggle('is-settings');root.classList.remove('is-speaking')});
  root.querySelector('[data-setting="animations"]').checked=settings.animations;
  root.querySelector('[data-setting="sound"]').checked=settings.sound;
  root.querySelector('[data-setting="size"]').value=settings.size;
  root.querySelector('[data-setting="position"]').value=settings.position;
  root.querySelectorAll('[data-setting]').forEach(el=>el.addEventListener('change',()=>{const k=el.dataset.setting;settings[k]=el.type==='checkbox'?el.checked:el.value;root.dataset.size=settings.size;root.dataset.position=settings.position;root.classList.toggle('no-animation',!settings.animations);save()}));
  root.querySelector('[data-action="test"]').addEventListener('click',()=>{chirp();setMessage('Miau! Der Ton ist '+(settings.sound?'aktiviert. 🔊':'noch ausgeschaltet. 🔇'))});
  root.querySelector('[data-action="hide"]').addEventListener('click',()=>{settings.visible=false;save();root.remove();toast.textContent='NekoBuddy wurde ausgeblendet. Zum Zurückholen Browserdaten für diese Seite löschen.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),6000)});

  window.NekoBuddy={
    say:(text,opts)=>setMessage(text,opts||{}),
    celebrate:(text='Juhu! Das ist pfantastisch! 🎉')=>{react();setMessage(text)},
    show:()=>{settings.visible=true;save()},
    reset:()=>{localStorage.removeItem(KEY);location.reload()}
  };

  const pageMessage=messages[page]||{text:'Miau! Ich bin NekoBuddy und begleite dich durch den Shop. 🖤'};
  const delay=settings.seenWelcome?1600:700;
  setTimeout(()=>{setMessage(pageMessage.text,{actions:pageMessage.actions});settings.seenWelcome=true;save()},delay);

  document.addEventListener('click',e=>{
    const t=e.target.closest('button,a');if(!t)return;
    const text=(t.textContent||'').toLowerCase();
    if(text.includes('warenkorb')||text.includes('kasse')) setTimeout(()=>setMessage('Fast geschafft! Ich halte schon mal die Pfoten gedrückt. 🐾'),450);
    if(text.includes('bestellen')||text.includes('absenden')) setTimeout(()=>hearts(),300);
  });
})();
