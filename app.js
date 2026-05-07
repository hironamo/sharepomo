import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, increment, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = { apiKey:'AIzaSyCZh4ME9QimEx62f7SLc4F3lyorTzml_hY',authDomain:'sharetimer-fd215.firebaseapp.com',projectId:'sharetimer-fd215',storageBucket:'sharetimer-fd215.firebasestorage.app',messagingSenderId:'862201995112',appId:'1:862201995112:web:2b1b8d6a5cb74eb5d440dd',measurementId:'G-2DKH6Y8R4C' };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app); const storage = getStorage(app);

const WORK=1500, SHORT=300; let LONG=900, setIdx=0, isWork=true, running=false, startTs=0, remain=WORK, timerInt; let currentUser;
const $=s=>document.querySelector(s);
function fmt(s){const m=Math.floor(s/60), ss=s%60; return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}
function render(){ $('#clock').textContent=fmt(remain); $('#seek').max=(isWork?WORK:(setIdx===3?LONG:SHORT)); $('#seek').value=$('#seek').max-remain; document.body.className=`${isWork?'':'break'} ${!isWork&&setIdx===3?'long-break':''} theme-${localStorage.theme||'default'}`; $('#modeBadge').className=`badge ${isWork?'work':'break'}`; $('#modeBadge').textContent=isWork?'作業中':'休憩中'; $('#setText').textContent=`セット ${setIdx+1} / 4`; document.title=`${fmt(remain)} - ${isWork?'作業':'休憩'} | SharePomo`; }
function ticks(){ if(!running) return; const elapsed=Math.floor((Date.now()-startTs)/1000); remain=Math.max(0, (isWork?WORK:(setIdx===3?LONG:SHORT))-elapsed); render(); if(remain===0) phaseDone(); }
function start(){ running=true; startTs=Date.now()-((isWork?WORK:(setIdx===3?LONG:SHORT))-remain)*1000; $('#startPause').textContent='PAUSE'; clearInterval(timerInt); timerInt=setInterval(ticks,250); }
function pause(){ running=false; $('#startPause').textContent='START'; clearInterval(timerInt); }
function phaseDone(){ playAlarm(); pause(); if(isWork){ if(currentUser) completePomo(); isWork=false; remain=(setIdx===3?LONG:SHORT);} else { if(setIdx===3) setIdx=0; else setIdx++; isWork=true; remain=WORK; } render(); drawDots(); start(); }
function playAlarm(){ if(window.customAlarm){ window.customAlarm.currentTime=0; window.customAlarm.play(); return;} const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type='sine'; o.frequency.value=880; o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.8); o.stop(ctx.currentTime+0.8); }
function drawDots(){ $('#dots').innerHTML=''; for(let i=0;i<4;i++){ const b=document.createElement('button'); b.className='dot'+(i===setIdx?' active':''); b.onclick=()=>{setIdx=i; remain=isWork?WORK:SHORT; render(); drawDots();}; $('#dots').appendChild(b);} }
async function completePomo(){ const day=new Date().toISOString().slice(0,10); await setDoc(doc(db,'users',currentUser.uid,'stats',day),{count:increment(1),updatedAt:serverTimestamp()},{merge:true}); await setDoc(doc(db,'users',currentUser.uid),{updatedAt:serverTimestamp()},{merge:true}); $('#pomoCount').textContent=Number($('#pomoCount').textContent)+1; }
async function signup(){ const email=$('#email').value, password=$('#password').value; const cred=await createUserWithEmailAndPassword(auth,email,password); let iconURL=''; if($('#iconUpload').files[0]){ const r=ref(storage,`icons/${cred.user.uid}`); await uploadBytes(r,$('#iconUpload').files[0]); iconURL=await getDownloadURL(r);} await setDoc(doc(db,'users',cred.user.uid),{displayName:$('#displayName').value||'NoName',iconURL,createdAt:serverTimestamp()}); alert('登録完了'); }
async function loadHistory(){ if(!currentUser) return; const d=$('#historyDate').value||new Date().toISOString().slice(0,10); const snap=await getDoc(doc(db,'users',currentUser.uid,'stats',d)); $('#historyCount').textContent=snap.exists()?snap.data().count:0; }
async function loadRanking(type='today'){ const now=new Date(); const yyyyMmDd=x=>x.toISOString().slice(0,10); const day= type==='today'?yyyyMmDd(now):type==='yesterday'?yyyyMmDd(new Date(now-86400000)):null; const users=await getDocs(collection(db,'users')); const rows=[]; for(const u of users.docs){ let c=0; if(day){ const s=await getDoc(doc(db,'users',u.id,'stats',day)); c=s.exists()?s.data().count:0; } else { for(let i=0;i<7;i++){ const d=yyyyMmDd(new Date(now-i*86400000)); const s=await getDoc(doc(db,'users',u.id,'stats',d)); c+=s.exists()?s.data().count:0; } } rows.push({name:u.data().displayName||'NoName',count:c}); } rows.sort((a,b)=>b.count-a.count); $('#rankingList').innerHTML=rows.slice(0,20).map(r=>`<li>${r.name} - ${r.count} ポモ</li>`).join(''); }

$$('[data-route]');
function $$(s){return document.querySelectorAll(s)}
$$('[data-route]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden')); $('#'+b.dataset.route).classList.remove('hidden')});
$('#startPause').onclick=()=>running?pause():start(); $('#resetBtn').onclick=()=>{pause(); remain=isWork?WORK:SHORT; render();}; $('#seek').oninput=e=>{remain=$('#seek').max-e.target.value; if(running)start(); render();};
$('#longBreakSelect').onchange=e=>{LONG=Number(e.target.value)}; $('#themeSelect').onchange=e=>{localStorage.theme=e.target.value; render();};
$('#alarmUpload').onchange=e=>{const f=e.target.files[0]; if(!f)return; window.customAlarm=new Audio(URL.createObjectURL(f));};
$('#signupBtn').onclick=signup; $('#loginBtn').onclick=()=>signInWithEmailAndPassword(auth,$('#email').value,$('#password').value); $('#googleBtn').onclick=()=>signInWithPopup(auth,new GoogleAuthProvider());
$('#historyDate').onchange=loadHistory; document.querySelectorAll('.rankTab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.rankTab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); loadRanking(t.dataset.rank)});
onAuthStateChanged(auth, async user=>{ currentUser=user; $('#authNav').textContent=user?'ログアウト':'ログイン'; if(user){ const u=await getDoc(doc(db,'users',user.uid)); if(u.exists()) $('#pomoCount').textContent='0'; loadHistory(); loadRanking(); } });

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }
render(); drawDots();
