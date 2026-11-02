window.FEReview=(()=>{
 const DAY=86400000;
 function due(entry,now=Date.now()){return !!entry&&(!entry.nextReviewAt||new Date(entry.nextReviewAt).getTime()<=now)}
 function schedule(previous,status,now=Date.now()){
  if(!['known','shaky','weak'].includes(status))throw new RangeError('Unknown review status');
  const old=previous||{},count=Number(old.reviewCount)||0;
  // Only advance a successful interval when the preceding review is due.
  const streak=status==='known'?(old.status==='known'&&!due(old,now)?Math.max(1,Number(old.successStreak)||1):(Number(old.successStreak)||0)+1):0;
  const days=[1,3,7,14,30][Math.min(Math.max(streak-1,0),4)];
  const delay=status==='known'?days*DAY:status==='shaky'?DAY:10*60000;
  return{status,updatedAt:new Date(now).toISOString(),nextReviewAt:new Date(now+delay).toISOString(),successStreak:streak,reviewCount:count+1};
 }
 function dateLabel(iso){return iso?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)):'未設定'}
 return{due,schedule,dateLabel};
})();

window.FEStudy=(()=>{
 const KEY='fe-completion-20260125-v1-depth-study';
 let state=readJSON(KEY,{recall:{},labs:{}});
 state.recall ||= {}; state.labs ||= {};
 const save=()=>storage.setItem(KEY,JSON.stringify(state));
 const fmt=x=>Number(x).toLocaleString('ja-JP',{maximumFractionDigits:5});
 const CONFIG={
 4:{title:'規模と処理速度を変えて計算時間を求める',fields:[['base','元の規模',100,1,10000],['target','新しい規模',1000,1,10000],['time','元の秒数',2,0.1,10000],['speed','速度の倍率',4,0.1,100]],calc:p=>`${p.time} × (${p.target} ÷ ${p.base})³ ÷ ${p.speed} ＝ ${fmt(p.time*(p.target/p.base)**3/p.speed)} 秒`},
 6:{title:'データ数の倍率と2分探索',fields:[['factor','データ数の倍率（2の累乗で比較）',4,1,1024]],calc:p=>`log₂(${p.factor}) ＝ ${fmt(Math.log2(p.factor))}。2の累乗倍なら、この値だけ最大探索回数が増えます。それ以外は元のデータ数によって整数への丸めが変わります。`},
 8:{title:'MIPS・利用率・命令数を変える',fields:[['mips','性能（MIPS）',200,1,100000],['use','利用率（％）',80,1,100],['instructions','1件の命令数',800000,1,1000000000]],calc:p=>`${p.mips} × 10⁶ × ${p.use/100} ÷ ${p.instructions} ＝ ${fmt(p.mips*1e6*p.use/100/p.instructions)} 件／秒`},
 12:{title:'故障間隔と修理時間から稼働率を計算',fields:[['mtbf','改善前MTBF（時間）',3000,1,100000],['mttr','改善前MTTR（時間）',1000,1,100000],['up','MTBFの改善（増加％）',20,0,1000],['down','MTTRの改善（短縮％）',10,0,100]],calc:p=>{const b=p.mtbf*(1+p.up/100),r=p.mttr*(1-p.down/100);return `改善後MTBF ${fmt(b)}時間、MTTR ${fmt(r)}時間。稼働率＝${fmt(b)} ÷ (${fmt(b)}＋${fmt(r)}) ＝ ${fmt(b/(b+r)*100)}％`}},
 24:{title:'ビット誤り率と単位の換算',fields:[['speed','伝送速度（Mビット／秒）',30,0.1,100000],['seconds','送信時間（秒）',100,1,100000],['errors','誤りビット数',1,0,100000]],calc:p=>`総送信量＝${fmt(p.speed*1e6*p.seconds)}ビット。誤り率＝${p.errors} ÷ (${p.speed} × 10⁶ × ${p.seconds}) ＝ ${(p.errors/(p.speed*1e6*p.seconds)).toExponential(4)}`},
 27:{title:'文字の種類と長さから総数を計算',fields:[['m','文字の種類数M',10,1,100],['n','文字数n',4,1,12]],calc:p=>`${p.m}種類から重複を許して${p.n}文字を選ぶ：${p.m}^${p.n} ＝ ${fmt(p.m**p.n)} 通り（文字順を区別）。`},
 28:{title:'人数を変えて必要な共通鍵数を比較',fields:[['people','利用者数',100,2,10000]],calc:p=>`${p.people} × (${p.people}−1) ÷ 2 ＝ ${fmt(p.people*(p.people-1)/2)} 個。相手との組を重複せず数えます。`},
 54:{title:'工場の利用時間を変えて最適な生産量を比較',fields:[['hours','月間利用時間（時間）',200,1,500]],calc:p=>{const minutes=Math.round(p.hours*60);let best={profit:-1,x:0,y:0,z:0};for(let x=0;x<=Math.min(1000,Math.floor(minutes/6));x++){const rest=minutes-x*6;for(let z=0;z<=Math.min(500,Math.floor(rest/15));z++){const y=Math.min(900,Math.floor((rest-z*15)/10));const profit=x*1800+y*2500+z*3000;if(profit>best.profit)best={profit,x,y,z}}}return `X ${best.x}個、Y ${best.y}個、Z ${best.z}個。利益 ${fmt(best.profit)} 円。時間制約内で整数個数を比較。需要上限X1,000・Y900・Z500個。`}}
 };
 function mountLab(q){
  const c=CONFIG[q.n];if(!c)return null;
  const section=document.createElement('details');section.className='practice-lab';section.id=`lab-${q.n}`;
  section.innerHTML=`<summary>任意の参考演習：${esc(c.title)}</summary><p class="lab-note">まず結果を予想し、条件を変えて比較してください。</p><form class="lab-inputs">${c.fields.map(([key,label,value,min,max])=>`<label>${esc(label)}<input type="number" data-param="${key}" min="${min}" max="${max}" step="${['time','speed'].includes(key)?'0.1':'1'}" value="${esc(state.labs[q.n]?.[key]??value)}"></label>`).join('')}</form><p class="lab-result" aria-live="polite"></p>`;
  const show=()=>{const params={};let valid=true;section.querySelectorAll('[data-param]').forEach(input=>{params[input.dataset.param]=Number(input.value);if(input.value===''||!input.checkValidity())valid=false});section.querySelector('.lab-result').textContent=valid?c.calc(params):'各入力欄の範囲内で値を入力してください。';if(valid){state.labs[q.n]=params;save()}};
  section.querySelector('form').onsubmit=e=>e.preventDefault();section.oninput=show;show();return section;
 }
 function enhanceQuestion(node,q){
  const root=node.querySelector('.review-content');
  const fast=document.createElement('section');fast.className='fast-route';fast.innerHTML=`<p class="study-step">まずは要点</p><h3>この問題を解くための要点</h3><p>${esc(q.keyPoint)}</p><p class="reference-hint">下の図と対応表で確認できます。詳しい説明や選択肢比較は、必要な部分だけ開いてください。</p>`;root.prepend(fast);
  const lab=mountLab(q);if(lab)root.append(lab);
  const recall=document.createElement('details');recall.className='recall-check reference-details';const record=state.recall[q.n]||{};
  recall.innerHTML=`<summary>任意のメモ・説明練習（課題の提出欄ではありません）</summary><div class="reference-body"><h3>説明を整理したいときに</h3><p class="reference-hint">別途Google Formsで行う用語説明課題とは別の、個人用メモです。入力・自己評価は問題課題の達成条件に含みません。</p><p>${esc(q.deep.check)}</p><label for="recall-${q.n}">あなたの説明（自動保存）</label><textarea id="recall-${q.n}" maxlength="1000" rows="3" placeholder="正答の根拠を自分の言葉で書きましょう。">${esc(record.draft||'')}</textarea><details class="recall-example"><summary>解答例と比べる</summary><p>${esc(q.deep.answer)}</p><p>説明の理解度は自己評価です。</p><button type="button" data-recall="known">自力で説明できた</button><button type="button" data-recall="again">もう一度確認する</button></details><p class="recall-state" aria-live="polite"></p></div>`;
  const show=()=>{const s=state.recall[q.n]?.status;recall.querySelector('.recall-state').textContent=s==='known'?'自己評価：自力で説明できた':s==='again'?'自己評価：もう一度確認する':'説明を書いてから解答例を確認しましょう。'};
  recall.querySelector('textarea').oninput=e=>{state.recall[q.n]={...(state.recall[q.n]||{}),draft:e.target.value.slice(0,1000)};save()};
  recall.onclick=e=>{const status=e.target.closest('[data-recall]')?.dataset.recall;if(status){state.recall[q.n]={...(state.recall[q.n]||{}),status};save();show()}};show();root.append(recall);
 }
 function openPractice(n){const q=QUESTIONS.find(q=>q.n===Number(n));if(!q||!CONFIG[q.n])return;learningState.revealed.add(q.n);learningState.filter='すべて';learningState.query='';learningState.onlyUnlearned=false;learningState.focus='all';document.querySelector('#searchInput').value='';document.querySelector('#onlyUnlearned').checked=false;document.querySelector('#questionFocus').value='all';saveLearning();renderLearning();const lab=document.getElementById(`lab-${q.n}`);if(lab){lab.open=true;lab.scrollIntoView({behavior:'smooth',block:'start'})}}
 document.querySelector('#openPractice').onclick=()=>openPractice(document.querySelector('#practiceSelect').value);
 return {KEY,enhanceQuestion,openPractice,practiceNumbers:Object.keys(CONFIG).map(Number),recallStatus:n=>state.recall[n]?.status,calculate:(n,p)=>CONFIG[n].calc(p)};
})();
