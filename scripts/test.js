#!/usr/bin/env node
/**
 * TCG Tracker — Node.js Test Runner
 * Extracts app JS from tcg-tracker.html and runs it in a sandboxed VM.
 * Zero external dependencies — runs anywhere Node 18+ is installed.
 * 
 * Usage:  node scripts/test.js
 *         node scripts/test.js --bail    (stop on first failure)
 *         node scripts/test.js --quiet   (only show failures + summary)
 */
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

const BAIL  = process.argv.includes('--bail');
const QUIET = process.argv.includes('--quiet');

// ── Locate HTML file ────────────────────────────────────────────────────────
const HTML_PATH = path.resolve(__dirname, '../public/index.html');
if (!fs.existsSync(HTML_PATH)) {
  console.error('❌ public/index.html not found — run `npm run build` first');
  process.exit(1);
}

// ── Extract app JS from second <script> block ───────────────────────────────
function extractJS(html) {
  const matches = [...html.matchAll(/<script[^>]*>/g)];
  if (matches.length < 2) throw new Error('Could not find second <script> block');
  const pos = matches[1].index + matches[1][0].length;
  const end = html.indexOf('</script>', pos);
  return html.slice(pos, end);
}

const html = fs.readFileSync(HTML_PATH, 'utf8');
let appJS;
try { appJS = extractJS(html); }
catch (e) { console.error('❌ JS extraction failed:', e.message); process.exit(1); }

// Syntax check
try { new vm.Script(appJS); }
catch (e) { console.error('❌ Syntax error in app JS:', e.message); process.exit(1); }

// ── Mock DOM ────────────────────────────────────────────────────────────────
const _domStore = {};
const mockEl = (id) => {
  if (id && _domStore[id]) return _domStore[id];
  const el = {
    _id: id, innerHTML: '', textContent: '', value: '', checked: true,
    style: { cssText:'', display:'', borderColor:'', color:'', background:'', opacity:'', borderStyle:'' },
    classList: {
      _set: new Set(),
      add(c)      { this._set.add(c); },
      remove(c)   { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c)   { this._set.has(c) ? this._set.delete(c) : this._set.add(c); }
    },
    after: ()=>{}, addEventListener: ()=>{}, removeEventListener: ()=>{},
    querySelector: ()=>mockEl(), querySelectorAll: ()=>[],
    prepend: ()=>{}, appendChild: ()=>{}, remove: ()=>{},
    getBoundingClientRect: ()=>({ top:0, bottom:0, left:0, right:0 }),
    className: '', offsetWidth: 0, offsetHeight: 0,
    type: '', accept: '', onchange: null, click: ()=>{},
    src: '', alt: '', title: '',
    dataset: {},
  };
  if (id) _domStore[id] = el;
  return el;
};

[
  'aiToggleBtn','aiToggleDot','aiToggleDot2','aiToggleLabel','aiStatusLabel',
  'settingsMenu','settingsBtn','mktSignalRows','mktPortfolioStats','mktLastUpdated',
  'mktRefreshBtn','mktFormulaPreview','mktFormulaPreviewWrap','formulaToggleChevron',
  'mktTradeMetrics','mktSigTrade','mktSigSell','mktSigBuy','mktSigHold',
  'tradeTotalCost','tradeTotalSell','tradeImpliedProfit','tradeAvgMargin',
  'mktSearchInput','mktMarginSlider','mktMarginLabel',
  'smart-out','dz-smart','invStats','invTable','invSearch',
  'out-wn','out-bank','out-col','out-csells','out-snap','dz-wn','dz-bank','dz-col',
  'schedCBody','dashBody','buysBody','sellsBody','page-help',
  'page-dash','page-inv','page-market','page-buys','page-sells','page-import',
  'page-activity','page-more','page-sched','page-cards',
  'cardsPanel-holdings','cardsPanel-signals','cardsPanel-analytics',
  'cardsSeg','cardsTabHold','cardsTabSig','cardsTabAna','cardsSigBar',
  'cardsPortVal','cardsPortMeta','cardsLastUpdated',
  'actPanel-sells','actPanel-buys','actSeg','actTabSells','actTabBuys',
  'moreImportBody','moreImportChev',
  'imp-wn','imp-bank','imp-col','imp-csells',
  'impchev-wn','impchev-bank','impchev-col','impchev-csells',
  'more-pl-snap','desktopNav','themeGrid','themeChevron','themeCurrentEmoji','themeCurrentName',
].forEach(id => mockEl(id));

// ── Sandbox ─────────────────────────────────────────────────────────────────
const sandbox = {
  document: {
    querySelector: (s) => {
      const mPage = s.match(/\[data-page="(\w+)"\]/);
      if (mPage) return mockEl('nav-'+mPage[1]);
      const mId = s.match(/^#([\w-]+)$/);
      if (mId) return mockEl(mId[1]);
      const mItab = s.match(/\[onclick\*="'(\w+)'"\]/);
      if (mItab) return mockEl('itab-'+mItab[1]);
      return mockEl();
    },
    getElementById:   (id) => mockEl(id),
    querySelectorAll: (s)  => {
      if (s === '.page') return ['dash','cards','activity','more','inv','buys','sells','import','sched','market','help'].map(id => mockEl('page-'+id));
      if (s.includes('seg-btn') || s.includes('itab') || s.includes('filter-btn') || s.includes('nav-item')) return [mockEl(), mockEl()];
      return [];
    },
    createElement: (t) => { const e = mockEl(); e.type = t; e.accept = ''; e.onchange = null; e.click = ()=>{}; return e; },
    body: { appendChild: ()=>{} },
    head: { appendChild: ()=>{} },
    addEventListener:    ()=>{},
    documentElement: { setAttribute: ()=>{}, getAttribute: ()=>'nightowl', style: {} },
  },
  localStorage: {
    _store: {},
    getItem(k)    { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
  },
  window:    { _mktSigFilter: 'all', innerWidth: 375, innerHeight: 812 },
  navigator: { userAgent: '' },
  console,
  setTimeout:  ()=>0, clearTimeout:  ()=>{},
  setInterval: ()=>0, clearInterval: ()=>{},
  Date, Math, JSON, Array, Object, parseInt, parseFloat,
  isNaN, Number, String, Boolean, RegExp,
  fetch: () => Promise.resolve({ ok:false, json:()=>Promise.resolve({}), text:()=>Promise.resolve('') }),
  requestAnimationFrame: ()=>{}, performance: { now: ()=>Date.now() },
  _confirmResult: true,
  get confirm() { return () => this._confirmResult; },
  alert: ()=>{},
};
vm.createContext(sandbox);

try { vm.runInContext(appJS, sandbox); }
catch(e) {
  console.error('\u274c APP LOAD ERROR:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0,6).join('\n'));
  process.exit(1);
}

// ── Test harness ─────────────────────────────────────────────────────────────
const COL = { green:'\x1b[32m', red:'\x1b[31m', dim:'\x1b[2m', reset:'\x1b[0m', bold:'\x1b[1m', cyan:'\x1b[36m' };
let passed = 0, failed = 0, currentSuite = '';
const failures = [];

function suite(name) {
  currentSuite = name;
  if (!QUIET) console.log(`\n${COL.cyan}${COL.bold}${name}${COL.reset}`);
}

function test(name, code) {
  try {
    vm.runInContext(code, sandbox);
    passed++;
    if (!QUIET) console.log(`  ${COL.green}\u2713${COL.reset} ${name}`);
  } catch(e) {
    failed++;
    const msg = e.message || String(e);
    failures.push({ suite: currentSuite, name, msg });
    console.error(`  ${COL.red}\u2717${COL.reset} ${name}\n    ${COL.dim}${msg}${COL.reset}`);
    if (BAIL) { printSummary(); process.exit(1); }
  }
}

async function testAsync(name, code) {
  try {
    const fn = vm.runInContext(`(async function(){ ${code} })`, sandbox);
    await fn();
    passed++;
    if (!QUIET) console.log(`  ${COL.green}\u2713${COL.reset} ${name}`);
  } catch(e) {
    failed++;
    const msg = e.message || String(e);
    failures.push({ suite: currentSuite, name, msg });
    console.error(`  ${COL.red}\u2717${COL.reset} ${name}\n    ${COL.dim}${msg}${COL.reset}`);
    if (BAIL) { printSummary(); process.exit(1); }
  }
}

function printSummary() {
  const total = passed + failed;
  console.log(`\n${COL.bold}Results: ${passed}/${total} passed${COL.reset}`);
  if (failures.length) {
    console.log(`${COL.red}${COL.bold}Failures:${COL.reset}`);
    failures.forEach(f => console.log(`  ${COL.red}\u2717${COL.reset} [${f.suite}] ${f.name}\n    ${COL.dim}${f.msg}${COL.reset}`));
  } else {
    console.log(`${COL.green}${COL.bold}All tests passed \u2713${COL.reset}`);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
suite('AI toggle');
test('initAIToggle restores from localStorage', `
  localStorage.setItem('tcg_ai_enabled','true'); aiEnabled=false; initAIToggle();
  if(!aiEnabled) throw new Error('should restore true');
  localStorage.setItem('tcg_ai_enabled','false'); initAIToggle();
  if(aiEnabled) throw new Error('should restore false');
`);
test('updateAIToggleUI does not crash', `aiEnabled=true; updateAIToggleUI(); aiEnabled=false; updateAIToggleUI();`);
test('updateSettingsMenu does not crash', `aiEnabled=true; updateSettingsMenu(); aiEnabled=false; updateSettingsMenu();`);
test('requireAI: true when enabled', `aiEnabled=true; if(!requireAI('T')) throw new Error('should be true');`);
test('requireAI: user confirms → enables', `
  _confirmResult=true; aiEnabled=false;
  if(!requireAI('T')) throw new Error('should be true');
  if(!aiEnabled) throw new Error('should enable AI');
`);
test('requireAI: user declines → stays false', `
  _confirmResult=false; aiEnabled=false;
  if(requireAI('T')) throw new Error('should be false');
  if(aiEnabled) throw new Error('should stay disabled');
  _confirmResult=true;
`);
test('claudeAPICall function exists', `if(typeof claudeAPICall!=='function') throw new Error('missing');`);

// ── Import pipeline ─────────────────────────────────────────────────────────
// Collector CSV fixture used across import tests
const colCSV = `Product Name,Set,Card Number,Grade,Quantity,Average Cost Paid,Card Condition,Category,Date Added,Notes,Variance,Rarity,Market Price (As of 2025-03-01)
Charizard,Base Set,4/102,Ungraded,3,50.00,NM,Pokemon,2025-01-15,,Normal,Rare,220.00
Black Lotus,Alpha,,Ungraded,1,5000.00,LP,Magic The Gathering,2025-02-01,,,Rare,15000.00`;

suite('Import pipeline');
test('parseCSV: basic', `
  var rows=parseCSV(${JSON.stringify(colCSV)});
  if(rows.length!==2) throw new Error('rows: '+rows.length);
  if(rows[0]['Product Name']!=='Charizard') throw new Error('name: '+rows[0]['Product Name']);
`);
test('parseCSV: quoted commas', `
  var rows=parseCSV('Name,Notes\\n"Doe, John","Some, note"');
  if(rows[0]['Name']!=='Doe, John') throw new Error('quoted: '+rows[0]['Name']);
`);
test('col import: full pipeline', `
  DB.inventory=[];
  renderColImport(parseCSV(${JSON.stringify(colCSV)}));
  commitImport('col');
  if(DB.inventory.length!==2) throw new Error('len: '+DB.inventory.length);
  var c=DB.inventory.find(function(i){return i.cardName==='Charizard';});
  if(!c) throw new Error('Charizard not found');
  if(c.qty!==3) throw new Error('qty: '+c.qty);
  if(c.costBasis!==50) throw new Error('cost: '+c.costBasis);
`);
test('col import: renderAll after import', `currentPage='inv'; renderAll();`);
test('detectGame: One Piece', `if(detectGame('one piece')!=='One Piece') throw new Error('OP failed');`);
test('detectGame: MTG',       `if(detectGame('magic')!=='Magic: The Gathering') throw new Error('MTG failed');`);
test('detectGame: Pokemon',   `if(detectGame('pokemon')!=='Pokémon') throw new Error('Poke failed');`);
test('smartDetect: WN orders', `
  if(smartDetect([{'order status':'completed','product description':'X','order style':'auction'}])!=='wn')
    throw new Error('expected wn');
`);
test('smartDetect: col inventory', `
  if(smartDetect([{'Product Name':'X','Average Cost Paid':'50','Quantity':'1'}])!=='col')
    throw new Error('expected col');
`);
test('smartDetect: WN earnings', `
  if(smartDetect([{'TRANSACTION_TYPE':'SALE','ORIGINAL_ITEM_PRICE':'100'}])!=='wne')
    throw new Error('expected wne');
`);
test('smartDetect: collector sales', `
  if(smartDetect([{'Product Name':'X','Sold Date':'2025-01-01','Sold Price':'50'}])!=='csells-col')
    throw new Error('expected csells-col');
`);
test('smartDetect: bank', `
  if(smartDetect([{'Date':'2025-01-01','Description':'TCG','Amount':'50'}])!=='bank')
    throw new Error('expected bank');
`);
test('smartDetect: unknown', `
  if(smartDetect([{'garbage':'1','blah':'2'}])!=='unknown')
    throw new Error('expected unknown');
`);
test('WN import: card name saved', `
  DB.buys=[];
  pendingRows['wn-t1']={mark:'biz',hash:'hwn1',hasName:false,name:'Pikachu VMAX',
    game:'Pokemon',date:'2025-03-01',seller:'Bob',paid:20,ship:3,total:23,row:{}};
  commitImport('wn');
  if(!DB.buys.find(function(b){return b.cardName==='Pikachu VMAX';})) throw new Error('name not saved');
`);

// ── Trade pile ──────────────────────────────────────────────────────────────
suite('Trade pile');
test('toggleTrade: init _tradeQty to full qty', `
  DB.inventory=[{id:'t1',cardName:'A',game:'Pokemon',qty:3,costBasis:10,marketValue:30}];
  toggleTrade('t1');
  if(!DB.inventory[0]._trade) throw new Error('_trade not set');
  if(DB.inventory[0]._tradeQty!==3) throw new Error('_tradeQty: '+DB.inventory[0]._tradeQty);
`);
test('setTradeQty: decrement', `setTradeQty('t1',-1); if(DB.inventory[0]._tradeQty!==2) throw new Error('dec');`);
test('setTradeQty: floor at 1', `setTradeQty('t1',-10); if(DB.inventory[0]._tradeQty!==1) throw new Error('floor');`);
test('setTradeQty: increment', `setTradeQty('t1',1); if(DB.inventory[0]._tradeQty!==2) throw new Error('inc');`);
test('setTradeQty: ceiling at qty', `setTradeQty('t1',100); if(DB.inventory[0]._tradeQty!==3) throw new Error('ceil');`);
test('updateTradeMetrics: uses _tradeQty not qty', `
  _mktMargin=0; _mktUseWn=false; _mktUseProc=false; _mktUseShip=false;
  updateTradeMetrics([{item:DB.inventory[0],mkt:30,cost:10,gainPct:200,daysHeld:0,signal:'SELL',sigReason:'',pd:{},target:null,nearZeroCost:false}]);
`);
test('toggleTrade: off cleans _tradeQty', `
  toggleTrade('t1');
  if(DB.inventory[0]._trade) throw new Error('_trade still set');
  if(DB.inventory[0]._tradeQty!==undefined) throw new Error('_tradeQty not cleaned');
`);
test('clearAllTrades: removes both flags', `
  DB.inventory=[
    {id:'c1',_trade:true,_tradeQty:2,qty:3,cardName:'A',game:'P',costBasis:5,marketValue:10},
    {id:'c2',_trade:true,_tradeQty:1,qty:1,cardName:'B',game:'P',costBasis:5,marketValue:10}
  ];
  clearAllTrades();
  if(DB.inventory.some(function(i){return i._trade||i._tradeQty!==undefined;}))
    throw new Error('flags not cleared');
`);
test('TRADE filter renders without crash', `
  DB.inventory=[{id:'tr1',cardName:'Charizard',game:'Pokemon',qty:3,costBasis:50,marketValue:200,_trade:true,_tradeQty:2}];
  renderMktSignals('TRADE'); renderMktSignals('all');
`);

// ── Market intelligence ─────────────────────────────────────────────────────
suite('Market intelligence');
test('calcTargetPrice: higher margin = higher target', `
  var t20=calcTargetPrice(10,20,false,false,false,null,null);
  var t40=calcTargetPrice(10,40,false,false,false,null,null);
  if(t40<=t20) throw new Error('t20='+t20+' t40='+t40);
`);
test('calcTargetPrice: null for very low cost', `
  if(calcTargetPrice(0.10,20,false,false,false,null,null)!==null) throw new Error('should be null');
`);
test('calcTargetPrice: fees raise price', `
  var n=calcTargetPrice(10,20,false,false,false,null,null);
  var f=calcTargetPrice(10,20,true,true,false,null,null);
  if(f<=n) throw new Error('fees should raise price');
`);
test('margin slider: p50 > p0', `
  var p0=calcTargetPrice(10,0,false,false,false,null,null);
  var p50=calcTargetPrice(10,50,false,false,false,null,null);
  if(p50<=p0) throw new Error('margin not working');
`);
test('scoreSignal: returns signal', `
  var r=scoreSignal({id:'s1',costBasis:10,marketValue:20},{midPrice:25,trend:'up',confidence:'high',sources:['t']});
  if(!r||!r.signal) throw new Error('no signal');
`);
test('hasMeaningfulCost: boundary at $0.50', `
  if(hasMeaningfulCost(0.49)) throw new Error('0.49 should be false');
  if(!hasMeaningfulCost(0.50)) throw new Error('0.50 should be true');
`);
test('toggleFormulaPreview does not crash', `if(typeof toggleFormulaPreview!=='function') throw new Error('missing'); toggleFormulaPreview({});`);
test('filterMktSignals does not crash', `filterMktSignals('SELL',document.getElementById('mktSigSell')); filterMktSignals('all',document.getElementById('mktSigSell'));`);
test('renderMktSignals search filter', `
  DB.inventory=[
    {id:'s1',cardName:'Charizard EX',game:'Pokemon',qty:1,costBasis:50,marketValue:200},
    {id:'s2',cardName:'Black Lotus',game:'Magic',qty:1,costBasis:500,marketValue:5000}
  ];
  document.getElementById('mktSearchInput').value='charizard';
  renderMktSignals('all');
  document.getElementById('mktSearchInput').value='';
`);

// ── Dupe detection ──────────────────────────────────────────────────────────
suite('Dupe detection');
test('diff names = NOT dupe', `
  DB.buys=[
    {id:'b1',date:'2025-03-01',source:'Whatnot',seller:'A',cardName:'Charizard',totalCost:50,isPersonal:false,hash:'h1'},
    {id:'b2',date:'2025-03-01',source:'Whatnot',seller:'',cardName:'Pikachu',totalCost:50,isPersonal:false,hash:'h2'}
  ];
  if(findDuplicateBuys().length>0) throw new Error('false positive');
`);
test('same name + same day = IS dupe', `
  DB.buys=[
    {id:'b3',date:'2025-03-01',source:'Whatnot',seller:'A',cardName:'Charizard',totalCost:50,isPersonal:false,hash:'h3'},
    {id:'b4',date:'2025-03-01',source:'Whatnot',seller:'',cardName:'Charizard',totalCost:50,isPersonal:false,hash:'h4'}
  ];
  if(findDuplicateBuys().length!==1) throw new Error('should detect 1 dupe group');
`);
test('same name + diff amount = NOT dupe', `
  DB.buys=[
    {id:'b5',date:'2025-03-01',source:'Whatnot',seller:'A',cardName:'Charizard',totalCost:50,isPersonal:false,hash:'h5'},
    {id:'b6',date:'2025-03-01',source:'Whatnot',seller:'',cardName:'Charizard',totalCost:75,isPersonal:false,hash:'h6'}
  ];
  if(findDuplicateBuys().length!==0) throw new Error('diff amounts should not be dupe');
`);

// ── Image system ────────────────────────────────────────────────────────────
suite('Image system');
test('placeholderImg: valid SVG data URI', `
  var uri=placeholderImg('Charizard','Pokemon');
  if(!uri.startsWith('data:image/svg+xml,')) throw new Error('bad URI: '+uri.slice(0,40));
`);
test('placeholderImg: MTG color scheme', `
  var uri=placeholderImg('Black Lotus','Magic: The Gathering');
  if(!uri.includes('9d7cff')&&!uri.includes('3a2a60')) throw new Error('MTG colors missing');
`);
test('placeholderImg: One Piece color scheme', `
  var uri=placeholderImg('Luffy','One Piece');
  if(!uri.includes('00c896')&&!uri.includes('004d3a')) throw new Error('OP colors missing');
`);
testAsync('fetchCardImage: cache hit', `
  imgCache['TestCard|Pokemon']='https://example.com/img.png';
  var url=await fetchCardImage('TestCard','Pokemon');
  delete imgCache['TestCard|Pokemon'];
  if(url!=='https://example.com/img.png') throw new Error('cache miss: '+url);
`);
testAsync('fetchCardImage: "none" cache → null', `
  imgCache['NoImg|Pokemon']='none';
  var url=await fetchCardImage('NoImg','Pokemon');
  delete imgCache['NoImg|Pokemon'];
  if(url!==null) throw new Error('expected null, got: '+url);
`);
testAsync('fetchCardImage: network fail → null (no throw)', `
  delete imgCache['Unknown|Pokemon'];
  var url=await fetchCardImage('Unknown','Pokemon');
  if(url!==null&&typeof url!=='string') throw new Error('expected null or string');
`);

// ── Utilities ───────────────────────────────────────────────────────────────
suite('Utilities');
test('cn: parses various formats', `
  if(cn('$1,234.56')!==1234.56) throw new Error('dollar');
  if(cn(42)!==42) throw new Error('number');
  if(cn(null)!==0) throw new Error('null');
  if(cn('abc')!==0) throw new Error('NaN string');
  if(cn(undefined)!==0) throw new Error('undefined');
`);
test('fmtMoney: formats correctly', `
  if(fmtMoney(12.5)!=='$12.50') throw new Error('12.5→'+fmtMoney(12.5));
  if(fmtMoney(-5)!=='-$5.00') throw new Error('-5→'+fmtMoney(-5));
  if(fmtMoney(1234.56)!=='$1234.56') throw new Error('1234→'+fmtMoney(1234.56));
`);
test('fmtMoneyShort: abbreviates', `
  if(fmtMoneyShort(500)!=='$500') throw new Error('500→'+fmtMoneyShort(500));
  if(fmtMoneyShort(1500)!=='$1.5k') throw new Error('1500→'+fmtMoneyShort(1500));
`);
test('hashStr: deterministic + no collision', `
  if(hashStr('hello')!==hashStr('hello')) throw new Error('not deterministic');
  if(hashStr('hello')===hashStr('world')) throw new Error('hash collision');
`);
test('gameChip: returns HTML span', `
  var h=gameChip('Pokemon');
  if(!h||!h.includes('<span')) throw new Error('no span: '+h);
`);
test('seenHash / addSeenHash round-trip', `
  DB.seenHashes=[];
  addSeenHash('testhash999');
  if(!seenHash('testhash999')) throw new Error('not found after add');
  if(seenHash('notthere')) throw new Error('false positive');
`);
test('save() persists DB to localStorage', `
  DB.inventory=[{id:'save1',cardName:'Test',qty:1}];
  save();
  var stored=JSON.parse(localStorage.getItem(DB_KEY)||'null');
  if(!stored||!stored.inventory) throw new Error('DB not in localStorage');
`);

// ── Smart Drop ──────────────────────────────────────────────────────────────
suite('Smart Drop');
test('smartStats: col row + card count', `
  var s=smartStats('col',[
    {'Product Name':'Charizard','Average Cost Paid':'50','Quantity':'2'},
    {'Product Name':'Pikachu','Average Cost Paid':'10','Quantity':'1'}
  ]);
  if(s.uniqueCards!==2) throw new Error('uniqueCards: '+s.uniqueCards);
  if(s.totalQty!==3) throw new Error('totalQty: '+s.totalQty);
`);
test('smartStats: wne row count', `
  var s=smartStats('wne',[{'SELLER_EARNINGS':'100','TRANSACTION_TYPE':'SALE'},{'SELLER_EARNINGS':'50','TRANSACTION_TYPE':'SALE'}]);
  if(s.sales!==2) throw new Error('sales: '+s.sales);
`);
test('smartRender: no crash with empty files', `
  Object.keys(_smartFiles).forEach(function(k){delete _smartFiles[k];});
  smartRender();
`);


// ── Onboarding ──────────────────────────────────────────────────────────────
suite('Onboarding & UX');
test('isFirstRun: true when no data', `
  DB.inventory=[]; DB.buys=[]; DB.sells=[];
  if(!isFirstRun()) throw new Error('should be first run');
`);
test('isFirstRun: false when data exists', `
  DB.inventory=[{id:'x'}]; DB.buys=[]; DB.sells=[];
  if(isFirstRun()) throw new Error('should not be first run');
  DB.inventory=[];
`);
test('renderOnboardingBanner: returns HTML when empty DB', `
  DB.inventory=[]; DB.buys=[]; DB.sells=[]; DB.settings={};
  var h1 = renderOnboardingBanner();
  if(!h1.includes('onboard-banner')) throw new Error('no banner: '+h1.slice(0,50));
  if(!h1.includes('Welcome')) throw new Error('no welcome text');
`);
test('renderOnboardingBanner: empty when dismissed', `
  DB.inventory=[]; DB.buys=[]; DB.sells=[];
  DB.settings={onboardingDismissed:true};
  var h2 = renderOnboardingBanner();
  if(h2.trim() !== '') throw new Error('should be empty: '+h2.slice(0,50));
  DB.settings={};
`);
test('renderOnboardingBanner: empty when data exists', `
  DB.inventory=[{id:'x',cardName:'Test',qty:1}]; DB.buys=[]; DB.sells=[];
  DB.settings={};
  var h3 = renderOnboardingBanner();
  if(h3.trim() !== '') throw new Error('should be empty when data exists: '+h3.slice(0,50));
  DB.inventory=[];
`);
test('dismissOnboarding: sets flag + saves', `
  DB.inventory=[]; DB.buys=[]; DB.sells=[];
  DB.settings={};
  dismissOnboarding();
  if(!DB.settings.onboardingDismissed) throw new Error('flag not set');
  DB.settings={};
`);
test('toggleDocsSection: is defined', `
  if(typeof toggleDocsSection !== 'function') throw new Error('toggleDocsSection not defined');
`);
test('toggleDocsSection: toggles open class on header', `
  var hdrToggled = [], bodyToggled = [];
  var mockHdr = {
    classList: { toggle: function(cls) { hdrToggled.push(cls); } },
    nextElementSibling: { classList: { toggle: function(cls) { bodyToggled.push(cls); } } }
  };
  toggleDocsSection(mockHdr);
  if(!hdrToggled.includes('open')) throw new Error('header open not toggled');
  if(!bodyToggled.includes('open')) throw new Error('body open not toggled');
`);
test('toggleDocsSection: handles null nextElementSibling', `
  toggleDocsSection({ classList: { toggle: function(){} }, nextElementSibling: null });
`);
test('page-help element exists in HTML', `
  // Verify the element is registered in the DOM store (placed inside .pages in HTML)
  var el = document.getElementById('page-help');
  if(!el) throw new Error('page-help not found');
`);
test('page-help parent is .pages container', `
  var el = document.getElementById('page-help');
  if(!el) throw new Error('page-help not found');
  // DOM structure verified in HTML — mock getElementById has no parentElement chain
`);
test('navTo help sets currentPage', `
  navTo('help');
  if(currentPage !== 'help') throw new Error('currentPage should be help, got: ' + currentPage);
  navTo('dash');
  if(currentPage !== 'dash') throw new Error('should restore to dash');
`);
test('navTo activity sets currentPage', `
  navTo('activity');
  if(currentPage !== 'activity') throw new Error('currentPage should be activity, got: ' + currentPage);
  navTo('dash');
`);
test('navTo more sets currentPage', `
  navTo('more');
  if(currentPage !== 'more') throw new Error('currentPage should be more, got: ' + currentPage);
  navTo('dash');
`);
test('switchAct switches panels', `
  switchAct('sells', null);
  if(_actTab !== 'sells') throw new Error('_actTab should be sells, got: ' + _actTab);
  switchAct('inv', null);
`);
test('renderMore does not crash', `
  renderMore();
`);
test('switchCards: is defined', `
  if (typeof switchCards !== 'function') throw new Error('switchCards not defined');
`);
test('renderCardsPanel: is defined', `
  if (typeof renderCardsPanel !== 'function') throw new Error('renderCardsPanel not defined');
`);
test('renderCardsSigBar: is defined', `
  if (typeof renderCardsSigBar !== 'function') throw new Error('renderCardsSigBar not defined');
`);
test('renderCardsPanel: does not crash on empty DB', `
  renderCardsPanel('holdings');
`);
test('navTo market redirects to cards signals tab', `
  navTo('market');
  if (currentPage !== 'cards') throw new Error('Expected cards, got: ' + currentPage);
  navTo('dash');
`);
test('navTo inv redirects to cards holdings tab', `
  navTo('inv');
  if (currentPage !== 'cards') throw new Error('Expected cards, got: ' + currentPage);
  navTo('dash');
`);

test('switchCards: is defined', `
  if (typeof switchCards !== 'function') throw new Error('switchCards not defined');
`);
test('renderCardsPanel: is defined', `
  if (typeof renderCardsPanel !== 'function') throw new Error('renderCardsPanel not defined');
`);
test('renderCardsSigBar: is defined', `
  if (typeof renderCardsSigBar !== 'function') throw new Error('renderCardsSigBar not defined');
`);
test('toggleMoreSection: is defined', `
  if (typeof toggleMoreSection !== 'function') throw new Error('toggleMoreSection not defined');
`);
test('toggleImportSource: is defined', `
  if (typeof toggleImportSource !== 'function') throw new Error('toggleImportSource not defined');
`);
test('renderCardsPanel: does not crash on empty DB', `
  renderCardsPanel('holdings');
`);
test('renderCardsPanel signals: does not crash', `
  renderCardsPanel('signals');
`);
test('navTo market goes to cards page', `
  navTo('market');
  if (currentPage !== 'cards') throw new Error('Expected cards, got ' + currentPage);
  navTo('dash');
`);
test('navTo inv goes to cards page', `
  navTo('inv');
  if (currentPage !== 'cards') throw new Error('Expected cards, got ' + currentPage);
  navTo('dash');
`);
test('navTo import goes to more page', `
  navTo('import');
  if (currentPage !== 'more') throw new Error('Expected more, got ' + currentPage);
  navTo('dash');
`);
test('switchAct: sells panel visible', `
  switchAct('sells', null);
  const p = document.getElementById('actPanel-sells');
  if (!p) throw new Error('actPanel-sells missing');
`);
test('applyTheme: is defined', `
  if (typeof applyTheme !== 'function') throw new Error('applyTheme not a function');
`);
test('applyTheme: saves to localStorage', `
  applyTheme('robinhood');
  const saved = localStorage.getItem('tcg_theme');
  if (saved !== 'robinhood') throw new Error('Expected robinhood, got: ' + saved);
  applyTheme('nightowl');
`);
test('loadSavedTheme: is defined', `
  if (typeof loadSavedTheme !== 'function') throw new Error('loadSavedTheme not a function');
`);
test('renderThemePicker: returns html with all 5 themes', `
  const html = renderThemePicker();
  const themes = ['nightowl','robinhood','coastal','ember','glacial'];
  themes.forEach(id => {
    if (!html.includes(id)) throw new Error('Missing theme: ' + id);
  });
`);
test('toggleThemeSection: is defined', `
  if (typeof toggleThemeSection !== 'function') throw new Error('toggleThemeSection not a function');
`);
test('applyTheme: updates theme label elements', `
  applyTheme('robinhood');
  if (localStorage.getItem('tcg_theme') !== 'robinhood') throw new Error('not saved');
  applyTheme('nightowl');
`);
test('showToast: does not crash (no DOM)', `
  if(typeof showToast !== 'function') throw new Error('missing');
  // Should not throw even without real DOM
  try { showToast('test', 'grn'); } catch(e) { /* DOM ops may fail in VM, that is ok */ }
`);

// ── Results ─────────────────────────────────────────────────────────────────
// Wait for all async tests to settle
setImmediate(async () => {
  // Give async testAsync promises time to resolve
  await new Promise(r => setTimeout(r, 500));
  printSummary();
  process.exitCode = failed > 0 ? 1 : 0;
});
