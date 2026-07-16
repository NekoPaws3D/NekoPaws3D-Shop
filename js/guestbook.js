"use strict";
const GUESTBOOK_KEY="nekopaws_guestbook";
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
function getEntries(){try{return JSON.parse(localStorage.getItem(GUESTBOOK_KEY))||[];}catch{return[];}}
function addGuestEntry(){const name=document.getElementById("guest-name")?.value.trim();const message=document.getElementById("guest-message")?.value.trim();if(!name||!message){alert("Bitte Name und Nachricht eintragen.");return;}const entries=getEntries();entries.unshift({name,message,date:new Date().toLocaleString("de-DE")});localStorage.setItem(GUESTBOOK_KEY,JSON.stringify(entries.slice(0,100)));document.getElementById("guest-name").value="";document.getElementById("guest-message").value="";renderGuestbook();}
function renderGuestbook(){const box=document.getElementById("guestbook-list");if(!box)return;const entries=getEntries();box.innerHTML=entries.length?entries.map(entry=>`<article class="guest-entry"><b>${escapeHtml(entry.name)}</b><small>${escapeHtml(entry.date)}</small><p>${escapeHtml(entry.message)}</p></article>`).join(""):'<p class="muted">Noch keine lokalen Einträge vorhanden.</p>';}
document.addEventListener("DOMContentLoaded",renderGuestbook);
