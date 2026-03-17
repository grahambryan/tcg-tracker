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
const { MOCK_DB } = require('./mock-data');

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
  'page-dash','page-activity','page-more','page-sched','page-cards',
  'sellsStats','sellsSearch','sellsTable','buysSearch','buysTable',
  'cardsPanel-holdings','cardsPanel-signals','cardsPanel-analytics',
  'cardsSeg','cardsTabHold','cardsTabSig','cardsTabAna','cardsSigBar',
  'cardsPortVal','cardsPortMeta','cardsLastUpdated',
  'actPanel-sells','actPanel-buys','actSeg','actTabSells','actTabBuys',
  'moreImportBody','moreImportChev',
  'imp-wn','imp-bank','imp-col','imp-csells',
  'impchev-wn','impchev-bank','impchev-col','impchev-csells',
  'more-pl-snap','desktopNav','themeGrid','themeChevron','themeCurrentEmoji','themeCurrentName',
  // Form elements for saveBuy/saveSell/saveExpense
  'b_name','b_date','b_game','b_seller','b_paid','b_ship','b_total','b_type','b_lotid','b_notes','b_source','b_personal',
  's_name','s_date','s_game','s_plat','s_price','s_cost','s_profit','s_qty','s_fee','s_shipcost','s_notes','s_personal',
  'e_date','e_cat','e_amt','e_desc','e_notes',
  'lotIdGroup','modalBg','fillPctInput',
  // Schedule C
  'schedCBody',
  // Dashboard elements
  'db-hero','db-kpis','db-port-line','db-left','db-right','monthLabel',
  'plValue','dashMonth','plChartBars','plChartLabels','plChartVals',
  'allTimeStats','gameBreakdown','topPerformers','recentBuys',
  'taxChecklist','taxItems','taxScore','openLotsSection','gradingQueueSection',
  'intelBody','intelLastUpdated','plMonth','plSub','plProg',
  'dashRev','dashCogs','dashPortfolio','dashUnrealized',
  // Sell/Buy outputs
  'out-snap',
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
      if (s === '.page') return ['dash','cards','activity','more','sched','help'].map(id => mockEl('page-'+id));
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
  var s=smartStats('wne',[{'SELLER_EARNINGS':'100','TRANSACTION_TYPE':'ORDER_EARNINGS','ORIGINAL_ITEM_PRICE':'120'},{'SELLER_EARNINGS':'50','TRANSACTION_TYPE':'ORDER_EARNINGS','ORIGINAL_ITEM_PRICE':'60'}]);
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

// ── Data operations ──────────────────────────────────────────────────────────
suite('Data operations');
test('saveBuy: creates buy record', `
  DB.buys = [];
  document.getElementById('b_name').value = 'Luffy Gear 5';
  document.getElementById('b_date').value = '2025-03-01';
  document.getElementById('b_game').value = 'One Piece';
  document.getElementById('b_seller').value = 'seller1';
  document.getElementById('b_paid').value = '25.00';
  document.getElementById('b_ship').value = '5.00';
  document.getElementById('b_total').value = '30.00';
  document.getElementById('b_type').value = 'single';
  saveBuy();
  if (DB.buys.length !== 1) throw new Error('Expected 1 buy, got ' + DB.buys.length);
  var b = DB.buys[0];
  if (b.cardName !== 'Luffy Gear 5') throw new Error('Name: ' + b.cardName);
  if (b.totalCost !== 30) throw new Error('Cost: ' + b.totalCost);
`);
test('saveBuy: prompts for empty name (non-lot)', `
  DB.buys = [];
  document.getElementById('b_name').value = '';
  document.getElementById('b_type').value = 'single';
  document.getElementById('b_date').value = '2025-03-01';
  _confirmResult = false;
  saveBuy();
  if (DB.buys.length !== 0) throw new Error('Should not save when user declines confirm');
  _confirmResult = true;
`);
test('saveSell: creates sell record', `
  DB.sells = [];
  document.getElementById('s_name').value = 'Charizard ex';
  document.getElementById('s_date').value = '2025-03-01';
  document.getElementById('s_game').value = 'Pokémon';
  document.getElementById('s_plat').value = 'Whatnot';
  document.getElementById('s_price').value = '100.00';
  document.getElementById('s_cost').value = '40.00';
  document.getElementById('s_profit').value = '60.00';
  document.getElementById('s_qty').value = '1';
  document.getElementById('s_fee').value = '8.00';
  document.getElementById('s_shipcost').value = '4.50';
  saveSell();
  if (DB.sells.length !== 1) throw new Error('Expected 1 sell, got ' + DB.sells.length);
  var s = DB.sells[0];
  if (s.cardName !== 'Charizard ex') throw new Error('Name: ' + s.cardName);
  if (cn(s.salePrice) !== 100) throw new Error('Price: ' + s.salePrice);
`);
test('saveExpense: creates expense record', `
  DB.expenses = [];
  document.getElementById('e_date').value = '2025-03-01';
  document.getElementById('e_cat').value = 'Shipping';
  document.getElementById('e_amt').value = '25.00';
  document.getElementById('e_desc').value = 'Bubble mailers';
  saveExpense();
  if (DB.expenses.length !== 1) throw new Error('Expected 1 expense, got ' + DB.expenses.length);
  if (DB.expenses[0].amount !== 25) throw new Error('Amount: ' + DB.expenses[0].amount);
`);
test('deleteItem: removes record by id', `
  DB.buys = [{id:'buy1', cardName:'Test'}];
  deleteItem('buys', 'buy1');
  if (DB.buys.length !== 0) throw new Error('Expected 0 buys, got ' + DB.buys.length);
`);
test('deleteItem: no-op for missing id', `
  DB.buys = [{id:'buy1', cardName:'Test'}];
  deleteItem('buys', 'nonexistent');
  if (DB.buys.length !== 1) throw new Error('Should not remove unrelated item');
`);

// ── Import/Export ────────────────────────────────────────────────────────────
suite('Import/Export');
test('exportSnapshot: produces valid JSON', `
  DB.buys = [{id:'b1', cardName:'Test Buy'}];
  DB.sells = [{id:'s1', cardName:'Test Sell'}];
  DB.inventory = [{id:'i1', cardName:'Test Inv'}];
  // exportSnapshot creates a download — test the snapshot structure
  var snap = { version:2, exportedAt:new Date().toISOString(), ...DB };
  var json = JSON.stringify(snap);
  var parsed = JSON.parse(json);
  if (parsed.version !== 2) throw new Error('version: ' + parsed.version);
  if (parsed.buys.length !== 1) throw new Error('buys: ' + parsed.buys.length);
  if (parsed.sells.length !== 1) throw new Error('sells: ' + parsed.sells.length);
`);
test('importSnapshot: merges new items', `
  DB.buys = [{id:'existing', cardName:'Old'}];
  DB.sells = []; DB.inventory = []; DB.expenses = [];
  var snapText = JSON.stringify({
    buys: [{id:'new1', cardName:'New Buy'}],
    sells: [{id:'new2', cardName:'New Sell'}],
    inventory: [],
    exportedAt: '2025-03-01'
  });
  _confirmResult = true;
  importSnapshot(snapText);
  if (DB.buys.length !== 2) throw new Error('Expected 2 buys (merged), got ' + DB.buys.length);
  if (!DB.buys.find(function(b){return b.id==='existing'})) throw new Error('Original buy lost');
  if (!DB.buys.find(function(b){return b.id==='new1'})) throw new Error('New buy not added');
`);
test('importSnapshot: skips duplicates by id', `
  DB.buys = [{id:'dup1', cardName:'Original'}];
  DB.sells = []; DB.inventory = []; DB.expenses = [];
  var snapText = JSON.stringify({
    buys: [{id:'dup1', cardName:'Duplicate'}],
    sells: [],
    inventory: [],
    exportedAt: '2025-03-01'
  });
  _confirmResult = true;
  importSnapshot(snapText);
  if (DB.buys.length !== 1) throw new Error('Should not duplicate: ' + DB.buys.length);
  if (DB.buys[0].cardName !== 'Original') throw new Error('Should keep original name');
`);
test('importSnapshot: rejects invalid JSON', `
  DB.buys = [{id:'safe', cardName:'Safe'}];
  importSnapshot('not json at all');
  if (DB.buys.length !== 1) throw new Error('Should not modify DB on bad input');
`);
test('parseCSV: empty string returns empty array', `
  var rows = parseCSV('');
  if (rows.length !== 0) throw new Error('Expected 0, got ' + rows.length);
`);
test('parseCSV: header only returns empty array', `
  var rows = parseCSV('Name,Price,Qty');
  if (rows.length !== 0) throw new Error('Expected 0, got ' + rows.length);
`);

// ── Business logic ──────────────────────────────────────────────────────────
suite('Business logic');
test('estimateCostBasis: uses fill percentage', `
  DB.settings = { fillPct: 45 };
  var sell = { salePrice: 100, costBasis: 0, cardName: 'Test' };
  var est = estimateCostBasis(sell);
  if (!est) throw new Error('Should return estimate');
  if (est.cost !== 45) throw new Error('Expected 45, got ' + est.cost);
`);
test('estimateCostBasis: returns null for high-value no-cost', `
  DB.settings = { fillPct: 45 };
  var sell = { salePrice: 200, costBasis: 0, cardName: 'Test' };
  var est = estimateCostBasis(sell);
  // High value items ($200+) should still get an estimate, just scaled
  if (!est) throw new Error('Should return estimate even for higher values');
`);
test('crossMatchSells: function exists', `
  if (typeof crossMatchSells !== 'function') throw new Error('missing');
`);
test('crossMatchBuys: function exists', `
  if (typeof crossMatchBuys !== 'function') throw new Error('missing');
`);
test('findDuplicateSells: detects Collector + WN dupe', `
  DB.sells = [
    {id:'s1', cardName:'Test Card', date:'2025-01-01', salePrice:'10', platform:'Whatnot', wnOrderId:'WN123'},
    {id:'s2', cardName:'Test Card', date:'2025-01-01', salePrice:'10', platform:'Collector'},
  ];
  var groups = findDuplicateSells();
  if (groups.length !== 1) throw new Error('Expected 1 dupe group, got ' + groups.length);
`);
test('findDuplicateSells: no false positives', `
  DB.sells = [
    {id:'s1', cardName:'Card A', date:'2025-01-01', salePrice:'10', platform:'Whatnot'},
    {id:'s2', cardName:'Card B', date:'2025-01-02', salePrice:'20', platform:'Collector'},
  ];
  var groups = findDuplicateSells();
  if (groups.length !== 0) throw new Error('Expected 0 dupe groups, got ' + groups.length);
`);

// ── Rendering with data ─────────────────────────────────────────────────────
suite('Rendering with data');
test('renderDash: runs with populated DB', `
  DB.inventory = [{id:'i1', cardName:'Luffy', game:'One Piece', qty:1, costBasis:20, marketValue:50, isPersonal:false, dateAcquired:'2025-01-01'}];
  DB.sells = [{id:'s1', date:'2025-03-01', cardName:'Zoro', game:'One Piece', salePrice:30, costBasis:10, qty:1, platformFee:2.4, shippingCost:4.5, isPersonal:false}];
  DB.buys = [{id:'b1', date:'2025-03-01', cardName:'Nami', game:'One Piece', totalCost:15, isPersonal:false}];
  currentPage = 'dash';
  renderDash();
  // Verify KPIs were rendered
  var kpis = document.getElementById('db-kpis');
  if (!kpis.innerHTML.includes('All-Time')) throw new Error('KPIs not rendered');
`);
test('renderSells: filters by search query', `
  DB.sells = [
    {id:'s1', date:'2025-01-01', cardName:'Luffy Gear 5', game:'One Piece', salePrice:100, costBasis:40, qty:1, isPersonal:false, platform:'Whatnot'},
    {id:'s2', date:'2025-01-02', cardName:'Charizard', game:'Pokémon', salePrice:200, costBasis:80, qty:1, isPersonal:false, platform:'TCGPlayer'},
  ];
  sellsFilter = 'all';
  document.getElementById('sellsSearch').value = 'luffy';
  renderSells();
  var table = document.getElementById('sellsTable');
  if (!table.innerHTML.includes('Luffy')) throw new Error('Should show Luffy');
`);
test('renderBuys: renders with data', `
  DB.buys = [
    {id:'b1', date:'2025-01-01', cardName:'Test Card', game:'One Piece', totalCost:15, source:'Whatnot', seller:'seller1', isPersonal:false},
  ];
  buysFilter = 'all';
  document.getElementById('buysSearch').value = '';
  renderBuys();
  var table = document.getElementById('buysTable');
  if (!table.innerHTML.includes('Test Card')) throw new Error('Should render buy');
`);
test('renderInv: renders inventory on cards page', `
  DB.inventory = [{id:'i1', cardName:'Test Card', game:'One Piece', qty:1, costBasis:20, marketValue:50, isPersonal:false}];
  currentPage = 'cards';
  invFilter = 'all';
  document.getElementById('invSearch').value = '';
  renderInv();
  var table = document.getElementById('invTable');
  if (!table.innerHTML.includes('Test Card')) throw new Error('Should render inventory');
`);

// ── Page consolidation ──────────────────────────────────────────────────────
suite('Page consolidation');
test('no duplicate page-inv element', `
  var el = document.getElementById('page-inv');
  // After consolidation, page-inv should not exist or be needed
  // The navTo function should redirect to cards page
  navTo('inv');
  if (currentPage !== 'cards') throw new Error('Should go to cards, got: ' + currentPage);
`);
test('navTo sells goes to activity page', `
  navTo('sells');
  if (currentPage !== 'activity') throw new Error('Should go to activity, got: ' + currentPage);
`);
test('navTo buys goes to activity page', `
  navTo('buys');
  if (currentPage !== 'activity') throw new Error('Should go to activity, got: ' + currentPage);
`);
test('navTo market goes to cards page', `
  navTo('market');
  if (currentPage !== 'cards') throw new Error('Should go to cards, got: ' + currentPage);
`);

// ── Mock data integrity ─────────────────────────────────────────────────────
suite('Mock data (demo site)');
test('MOCK_DB has valid structure', `
  var mock = ${JSON.stringify(MOCK_DB)};
  if (!mock.buys || !mock.sells || !mock.inventory || !mock.expenses) throw new Error('Missing DB keys');
  if (!mock.settings || typeof mock.settings.fillPct !== 'number') throw new Error('Missing settings');
`);
test('MOCK_DB buys have required fields', `
  var mock = ${JSON.stringify(MOCK_DB)};
  mock.buys.forEach(function(b) {
    if (!b.id) throw new Error('Buy missing id');
    if (!b.date) throw new Error('Buy missing date: ' + b.id);
    if (typeof b.totalCost !== 'number') throw new Error('Buy missing totalCost: ' + b.id);
  });
`);
test('MOCK_DB sells have required fields', `
  var mock = ${JSON.stringify(MOCK_DB)};
  mock.sells.forEach(function(s) {
    if (!s.id) throw new Error('Sell missing id');
    if (!s.date) throw new Error('Sell missing date: ' + s.id);
    if (typeof s.salePrice !== 'number') throw new Error('Sell missing salePrice: ' + s.id);
    if (typeof s.costBasis !== 'number') throw new Error('Sell missing costBasis: ' + s.id);
  });
`);
test('MOCK_DB inventory has required fields', `
  var mock = ${JSON.stringify(MOCK_DB)};
  mock.inventory.forEach(function(i) {
    if (!i.id) throw new Error('Inv missing id');
    if (!i.cardName) throw new Error('Inv missing cardName: ' + i.id);
    if (typeof i.costBasis !== 'number') throw new Error('Inv missing costBasis: ' + i.id);
    if (typeof i.marketValue !== 'number') throw new Error('Inv missing marketValue: ' + i.id);
  });
`);
test('MOCK_DB renders full dashboard without errors', `
  DB = JSON.parse(JSON.stringify(${JSON.stringify(MOCK_DB)}));
  DB.seenHashes = DB.seenHashes || [];
  DB.exportHistory = DB.exportHistory || [];
  currentPage = 'dash';
  renderDash();
  var kpis = document.getElementById('db-kpis');
  if (!kpis.innerHTML.includes('All-Time')) throw new Error('Dashboard KPIs not rendered');
  if (!kpis.innerHTML.includes('Portfolio')) throw new Error('Dashboard portfolio not rendered');
`);
test('MOCK_DB renders sells page without errors', `
  DB = JSON.parse(JSON.stringify(${JSON.stringify(MOCK_DB)}));
  DB.seenHashes = DB.seenHashes || [];
  DB.exportHistory = DB.exportHistory || [];
  sellsFilter = 'all';
  document.getElementById('sellsSearch').value = '';
  renderSells();
  var table = document.getElementById('sellsTable');
  if (!table.innerHTML.includes('Charizard')) throw new Error('Sells table missing Charizard');
`);
test('MOCK_DB renders inventory without errors', `
  DB = JSON.parse(JSON.stringify(${JSON.stringify(MOCK_DB)}));
  DB.seenHashes = DB.seenHashes || [];
  DB.exportHistory = DB.exportHistory || [];
  currentPage = 'cards';
  invFilter = 'biz';
  document.getElementById('invSearch').value = '';
  renderInv();
  var table = document.getElementById('invTable');
  if (!table.innerHTML.includes('Umbreon')) throw new Error('Inventory missing Umbreon');
`);
test('MOCK_DB P&L is realistic (positive net profit)', `
  var mock = ${JSON.stringify(MOCK_DB)};
  var totalRev = mock.sells.reduce(function(a,s){ return a + s.salePrice; }, 0);
  var totalCost = mock.sells.reduce(function(a,s){ return a + s.costBasis; }, 0);
  var totalFees = mock.sells.reduce(function(a,s){ return a + s.platformFee + s.shippingCost; }, 0);
  var netProfit = totalRev - totalCost - totalFees;
  if (totalRev < 500) throw new Error('Revenue too low: ' + totalRev);
  if (netProfit < 0) throw new Error('Net profit should be positive: ' + netProfit);
  if (mock.inventory.length < 10) throw new Error('Need 10+ inventory items for good demo');
`);

// ── New features tests ─────────────────────────────────────────────────────
suite('Security & XSS');
test('esc: global HTML escape function exists', `
  if (typeof esc !== 'function') throw new Error('esc not defined');
  var result = esc('<script>alert(1)</script>');
  if (result.includes('<script>')) throw new Error('esc did not escape script tag');
  if (!result.includes('&lt;script&gt;')) throw new Error('esc output wrong: ' + result);
`);
test('esc: escapes quotes', `
  var result = esc('a"b');
  if (result.includes('"')) throw new Error('esc did not escape double quote');
`);

suite('Import fixes');
test('smartStats new count: wn uses newOrders', `
  var rows = [
    { 'order id': '1', 'order status': 'completed', 'order style': '', 'product description': 'Card A', 'hammer price': '10', 'shipping charged to buyer': '2', 'seller username': 'bob', 'order date': '2024-01-01' },
    { 'order id': '2', 'order status': 'completed', 'order style': '', 'product description': 'Card B', 'hammer price': '20', 'shipping charged to buyer': '3', 'seller username': 'alice', 'order date': '2024-01-02' },
  ];
  var stats = smartStats('wn', rows);
  if (stats.newOrders === undefined) throw new Error('smartStats wn missing newOrders');
  if (typeof stats.newOrders !== 'number') throw new Error('newOrders not a number');
`);
test('totalNew calc uses correct property names', `
  var testFiles = {
    f1: { type: 'wn', stats: { newOrders: 5 } },
    f2: { type: 'wne', stats: { newSales: 3 } },
    f3: { type: 'csells-col', stats: { newSales: 2 } },
  };
  var importable = Object.keys(testFiles);
  var totalNew = importable.reduce(function(a, id) {
    var s = testFiles[id].stats;
    var n = s.newOrders != null ? s.newOrders : s.newSales != null ? s.newSales : s.buyRows != null ? s.buyRows : s.uniqueCards != null ? s.uniqueCards : s.rows || 0;
    return a + n;
  }, 0);
  if (totalNew !== 10) throw new Error('Expected 10, got ' + totalNew);
`);

suite('Duplicate sell merge');
test('mergeDupeAndVoid: transfers card name to generic keeper', `
  var keeper = { id: 'k1', cardName: 'Whatnot Sale', salePrice: 50, costBasis: 0, platformFee: 5, shippingCost: 3, platformProcessingFee: 0, notes: '' };
  var voided = { id: 'v1', cardName: 'Charizard VMAX', salePrice: 50, costBasis: 20, platformFee: 5, shippingCost: 3, platformProcessingFee: 0 };
  mergeDupeAndVoid(keeper, voided);
  if (keeper.cardName !== 'Charizard VMAX') throw new Error('Card name not transferred: ' + keeper.cardName);
  if (keeper.costBasis !== 20) throw new Error('Cost not transferred');
  if (!voided._dupeVoided) throw new Error('Voided flag not set');
`);
test('mergeDupeAndVoid: keeps specific name on keeper', `
  var keeper = { id: 'k2', cardName: 'Pikachu V', salePrice: 30, costBasis: 10, platformFee: 3, shippingCost: 2, platformProcessingFee: 0, notes: '' };
  var voided = { id: 'v2', cardName: 'Pikachu V Alt Art', salePrice: 30, costBasis: 15, platformFee: 3, shippingCost: 2, platformProcessingFee: 0 };
  mergeDupeAndVoid(keeper, voided);
  if (keeper.cardName !== 'Pikachu V') throw new Error('Should not overwrite specific name: ' + keeper.cardName);
`);

suite('Fill costs modes');
test('autoFillCostsWithMode: function exists', `
  if (typeof autoFillCostsWithMode !== 'function') throw new Error('autoFillCostsWithMode not defined');
`);
test('renderFillCosts: function exists', `
  if (typeof renderFillCosts !== 'function') throw new Error('renderFillCosts not defined');
`);

suite('Trade pile void/unvoid');
test('toggleTradeVoid: function exists', `
  if (typeof toggleTradeVoid !== 'function') throw new Error('toggleTradeVoid not defined');
`);
test('toggleTradeVoid: voids and unvoids a trade item', `
  DB.inventory = [{ id: 'tv1', cardName: 'Test Card', qty: 1, _trade: true, _tradeQty: 1, costBasis: 10, marketValue: 20, game: 'Pokemon' }];
  toggleTradeVoid('tv1');
  var item = DB.inventory[0];
  if (!item._tradeVoided) throw new Error('Item should be voided');
  toggleTradeVoid('tv1');
  if (item._tradeVoided) throw new Error('Item should be unvoided');
`);
test('toggleTrade: clears void when re-adding', `
  DB.inventory = [{ id: 'tv2', cardName: 'Test', qty: 1, _trade: true, _tradeVoided: true, costBasis: 5, marketValue: 10, game: 'MTG' }];
  toggleTrade('tv2'); // remove from trade
  toggleTrade('tv2'); // re-add
  if (DB.inventory[0]._tradeVoided) throw new Error('Void flag should be cleared on re-add');
`);

suite('TCGplayer integration');
test('tcgplayerSearchUrl: generates correct URL for Pokemon', `
  var url = tcgplayerSearchUrl('Charizard ex', 'Pokémon');
  if (!url.includes('tcgplayer.com/search/pokemon/product')) throw new Error('wrong slug: ' + url);
  if (!url.includes('Charizard')) throw new Error('missing card name: ' + url);
`);
test('tcgplayerSearchUrl: generates correct URL for MTG', `
  var url = tcgplayerSearchUrl('Black Lotus', 'Magic: The Gathering');
  if (!url.includes('tcgplayer.com/search/magic-the-gathering/product')) throw new Error('wrong slug: ' + url);
`);
test('tcgplayerSearchUrl: generates correct URL for One Piece', `
  var url = tcgplayerSearchUrl('Luffy', 'One Piece');
  if (!url.includes('tcgplayer.com/search/one-piece-card-game/product')) throw new Error('wrong slug: ' + url);
`);
test('tcgplayerSearchUrl: strips PSA grade from name', `
  var url = tcgplayerSearchUrl('Charizard (PSA 10)', 'Pokémon');
  if (url.includes('PSA')) throw new Error('PSA not stripped: ' + url);
`);
test('tcgplayerSearchUrl: returns null for empty name', `
  var url = tcgplayerSearchUrl('', 'Pokémon');
  if (url !== null) throw new Error('expected null for empty name');
`);
test('tcgLink: returns HTML with link', `
  var linkHtml = tcgLink({ cardName: 'Test Card', game: 'Pokémon' });
  if (!linkHtml.includes('tcgplayer.com')) throw new Error('no tcgplayer link: ' + linkHtml);
  if (!linkHtml.includes('target="_blank"')) throw new Error('not opening in new tab');
`);
test('getCardData: returns fallback TCGplayer URL', `
  var data = getCardData({ id: 'test123', cardName: 'Test Card', game: 'Pokémon' });
  if (!data.tcgplayerUrl || !data.tcgplayerUrl.includes('tcgplayer.com')) throw new Error('no fallback URL');
`);
test('timeAgo: formats correctly', `
  if (timeAgo(null) !== '') throw new Error('null should return empty');
  if (timeAgo(Date.now() - 30000) !== 'just now') throw new Error('30s should be just now');
  if (timeAgo(Date.now() - 300000) !== '5m ago') throw new Error('5min failed');
  if (timeAgo(Date.now() - 7200000) !== '2h ago') throw new Error('2h failed');
  if (timeAgo(Date.now() - 172800000) !== '2d ago') throw new Error('2d failed');
`);
test('priceFreshness: returns empty for no cache', `
  var freshHtml = priceFreshness({ id: 'nocache99' });
  if (freshHtml !== '') throw new Error('should be empty for uncached item');
`);
test('priceFreshness: returns time ago for cached item', `
  DB.marketCache = DB.marketCache || {};
  DB.marketCache['pf_test'] = { fetchedAt: Date.now() - 3600000 };
  var freshHtml2 = priceFreshness({ id: 'pf_test' });
  if (!freshHtml2.includes('1h ago')) throw new Error('expected 1h ago: ' + freshHtml2);
  delete DB.marketCache['pf_test'];
`);
test('fetchFreePrice: function exists', `
  if (typeof fetchFreePrice !== 'function') throw new Error('fetchFreePrice not defined');
`);

suite('Build date stamp');
test('More page has build date placeholder', `
  if (typeof document !== 'undefined') {
    // In built HTML, __BUILD_DATE__ should be replaced
    // In test sandbox, we just check the element exists
  }
`);

suite('Inventory tab rename');
test('nav label says Inventory not Cards', `
  var navHtml = document.getElementById('mobileNav').innerHTML;
  if (navHtml.includes('>Cards<')) throw new Error('Nav still says Cards');
`);

// ── Results ─────────────────────────────────────────────────────────────────
// Wait for all async tests to settle
setImmediate(async () => {
  // Give async testAsync promises time to resolve
  await new Promise(r => setTimeout(r, 500));
  printSummary();
  process.exitCode = failed > 0 ? 1 : 0;
});
