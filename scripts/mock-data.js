#!/usr/bin/env node
/**
 * TCG Tracker — Shared Mock Data
 * Realistic demo data for tests and the demo site.
 * Used by: scripts/test.js, scripts/build.js (demo build)
 */

const MOCK_DB = {
  buys: [
    { id:'b001', date:'2025-01-05', source:'Whatnot', seller:'cardking99', cardName:'Luffy Gear 5 (Alt Art)', game:'One Piece', type:'single', amountPaid:85, shipping:5, totalCost:90, lotId:'', notes:'', isPersonal:false, hash:'b001h' },
    { id:'b002', date:'2025-01-12', source:'Whatnot', seller:'pokecollector', cardName:'Charizard ex SAR', game:'Pokémon', type:'single', amountPaid:120, shipping:0, totalCost:120, lotId:'', notes:'151 set', isPersonal:false, hash:'b002h' },
    { id:'b003', date:'2025-01-18', source:'Local shop', seller:'Card Kingdom', cardName:'Sheoldred, the Apocalypse', game:'Magic: The Gathering', type:'single', amountPaid:62, shipping:0, totalCost:62, lotId:'', notes:'', isPersonal:false, hash:'b003h' },
    { id:'b004', date:'2025-01-25', source:'Whatnot', seller:'tcgdeals', cardName:'Lot - OP06 Singles', game:'One Piece', type:'lot', amountPaid:45, shipping:4.50, totalCost:49.50, lotId:'LOT-JAN25-A', notes:'5 cards', isPersonal:false, hash:'b004h' },
    { id:'b005', date:'2025-02-02', source:'Whatnot', seller:'barkybark7', cardName:'Charlotte Pudding SP (OP07)', game:'One Piece', type:'single', amountPaid:35, shipping:4, totalCost:39, lotId:'', notes:'', isPersonal:false, hash:'b005h' },
    { id:'b006', date:'2025-02-08', source:'TCGPlayer', seller:'SuperGames', cardName:'Pikachu VMAX (Rainbow)', game:'Pokémon', type:'single', amountPaid:48, shipping:3.50, totalCost:51.50, lotId:'', notes:'Alt art', isPersonal:false, hash:'b006h' },
    { id:'b007', date:'2025-02-14', source:'Whatnot', seller:'mtgfinds', cardName:'The One Ring (Foil)', game:'Magic: The Gathering', type:'single', amountPaid:195, shipping:0, totalCost:195, lotId:'', notes:'LTR set', isPersonal:false, hash:'b007h' },
    { id:'b008', date:'2025-02-20', source:'Whatnot', seller:'animecards', cardName:'Yamato (Alt Art)', game:'One Piece', type:'single', amountPaid:28, shipping:4, totalCost:32, lotId:'', notes:'OP06', isPersonal:false, hash:'b008h' },
    { id:'b009', date:'2025-03-01', source:'Whatnot', seller:'pokecollector', cardName:'Umbreon VMAX (Alt Art)', game:'Pokémon', type:'single', amountPaid:210, shipping:0, totalCost:210, lotId:'', notes:'Evolving Skies', isPersonal:false, hash:'b009h' },
    { id:'b010', date:'2025-03-05', source:'Local shop', seller:'Face to Face', cardName:'Roronoa Zoro (Manga Art)', game:'One Piece', type:'single', amountPaid:55, shipping:0, totalCost:55, lotId:'', notes:'OP01', isPersonal:false, hash:'b010h' },
    { id:'b011', date:'2025-03-10', source:'Whatnot', seller:'tcgdeals', cardName:'Lot - Pokémon Ex Bundle', game:'Pokémon', type:'lot', amountPaid:75, shipping:5, totalCost:80, lotId:'LOT-MAR10-B', notes:'8 cards', isPersonal:false, hash:'b011h' },
    { id:'b012', date:'2025-03-12', source:'eBay', seller:'card_emporium', cardName:'Bowser - Super Star (Foil)', game:'Lorcana', type:'single', amountPaid:18, shipping:3, totalCost:21, lotId:'', notes:'', isPersonal:false, hash:'b012h' },
  ],
  sells: [
    { id:'s001', date:'2025-01-20', platform:'Whatnot', cardName:'Luffy Gear 5 (Alt Art)', game:'One Piece', qty:1, salePrice:145, costBasis:90, platformFee:11.60, shippingCost:4.50, netProfit:38.90, notes:'', isPersonal:false, hash:'s001h', wnOrderId:'WN-10001' },
    { id:'s002', date:'2025-01-28', platform:'TCGPlayer', cardName:'Sheoldred, the Apocalypse', game:'Magic: The Gathering', qty:1, salePrice:78, costBasis:62, platformFee:8.58, shippingCost:3.50, netProfit:3.92, notes:'', isPersonal:false, hash:'s002h' },
    { id:'s003', date:'2025-02-05', platform:'Whatnot', cardName:'Charlotte Pudding SP (OP07)', game:'One Piece', qty:1, salePrice:65, costBasis:39, platformFee:5.20, shippingCost:4.50, netProfit:16.30, notes:'', isPersonal:false, hash:'s003h', wnOrderId:'WN-10045' },
    { id:'s004', date:'2025-02-10', platform:'Whatnot', cardName:'Yamato (Alt Art)', game:'One Piece', qty:1, salePrice:52, costBasis:32, platformFee:4.16, shippingCost:4.50, netProfit:11.34, notes:'', isPersonal:false, hash:'s004h', wnOrderId:'WN-10078' },
    { id:'s005', date:'2025-02-18', platform:'eBay', cardName:'Pikachu VMAX (Rainbow)', game:'Pokémon', qty:1, salePrice:72, costBasis:51.50, platformFee:9.36, shippingCost:4, netProfit:7.14, notes:'', isPersonal:false, hash:'s005h' },
    { id:'s006', date:'2025-02-25', platform:'Whatnot', cardName:'OP06 Singles (lot split)', game:'One Piece', qty:3, salePrice:38, costBasis:29.70, platformFee:3.04, shippingCost:4.50, netProfit:0.76, notes:'From LOT-JAN25-A', isPersonal:false, hash:'s006h', wnOrderId:'WN-10112' },
    { id:'s007', date:'2025-03-02', platform:'Whatnot', cardName:'Charizard ex SAR', game:'Pokémon', qty:1, salePrice:185, costBasis:120, platformFee:14.80, shippingCost:5, netProfit:45.20, notes:'', isPersonal:false, hash:'s007h', wnOrderId:'WN-10201' },
    { id:'s008', date:'2025-03-08', platform:'Whatnot', cardName:'Enel (Alt Art)', game:'One Piece', qty:1, salePrice:42, costBasis:18, platformFee:3.36, shippingCost:4.50, netProfit:16.14, notes:'From lot', isPersonal:false, hash:'s008h', wnOrderId:'WN-10250' },
    { id:'s009', date:'2025-03-11', platform:'Collector', cardName:'Bowser - Super Star (Foil)', game:'Lorcana', qty:1, salePrice:28, costBasis:21, platformFee:0, shippingCost:3, netProfit:4, notes:'local sale', isPersonal:false, hash:'s009h' },
  ],
  inventory: [
    { id:'i001', cardName:'Umbreon VMAX (Alt Art)', game:'Pokémon', condition:'NM', qty:1, costBasis:210, marketValue:320, dateAcquired:'2025-03-01', setName:'Evolving Skies', cardNumber:'215/203', notes:'PSA candidate', isPersonal:false },
    { id:'i002', cardName:'The One Ring (Foil)', game:'Magic: The Gathering', condition:'NM', qty:1, costBasis:195, marketValue:240, dateAcquired:'2025-02-14', setName:'Lord of the Rings', cardNumber:'', notes:'LTR mythic', isPersonal:false },
    { id:'i003', cardName:'Roronoa Zoro (Manga Art)', game:'One Piece', condition:'NM', qty:1, costBasis:55, marketValue:88, dateAcquired:'2025-03-05', setName:'OP01', cardNumber:'OP01-025', notes:'', isPersonal:false },
    { id:'i004', cardName:'Monkey D. Luffy (Leader)', game:'One Piece', condition:'NM', qty:2, costBasis:12, marketValue:22, dateAcquired:'2025-01-10', setName:'OP01', cardNumber:'OP01-003', notes:'', isPersonal:false },
    { id:'i005', cardName:'Charizard ex', game:'Pokémon', condition:'LP', qty:1, costBasis:35, marketValue:42, dateAcquired:'2025-02-20', setName:'Paldea Evolved', cardNumber:'199/193', notes:'', isPersonal:false },
    { id:'i006', cardName:'Nami (Alt Art)', game:'One Piece', condition:'NM', qty:1, costBasis:40, marketValue:65, dateAcquired:'2025-01-15', setName:'OP01', cardNumber:'OP01-016', notes:'', isPersonal:false },
    { id:'i007', cardName:'Liliana of the Veil', game:'Magic: The Gathering', condition:'NM', qty:1, costBasis:28, marketValue:32, dateAcquired:'2025-02-01', setName:'Dominaria United', cardNumber:'', notes:'', isPersonal:false },
    { id:'i008', cardName:'Portgas D. Ace (Alt Art)', game:'One Piece', condition:'NM', qty:1, costBasis:30, marketValue:48, dateAcquired:'2025-02-10', setName:'OP02', cardNumber:'OP02-013', notes:'', isPersonal:false },
    { id:'i009', cardName:'Mewtwo VSTAR', game:'Pokémon', condition:'NM', qty:1, costBasis:15, marketValue:18, dateAcquired:'2025-01-22', setName:'Pokémon GO', cardNumber:'', notes:'', isPersonal:false },
    { id:'i010', cardName:'Shanks (Manga Art)', game:'One Piece', condition:'NM', qty:1, costBasis:70, marketValue:110, dateAcquired:'2025-03-08', setName:'OP01', cardNumber:'OP01-120', notes:'', isPersonal:false },
    { id:'i011', cardName:'Ragnarok the Terrible', game:'Magic: The Gathering', condition:'MP', qty:1, costBasis:8, marketValue:6, dateAcquired:'2024-11-15', setName:'', cardNumber:'', notes:'Held too long', isPersonal:false },
    { id:'i012', cardName:'Boa Hancock (SP)', game:'One Piece', condition:'NM', qty:1, costBasis:25, marketValue:38, dateAcquired:'2025-02-28', setName:'OP06', cardNumber:'OP06-069', notes:'', isPersonal:false },
    { id:'i013', cardName:'Mew ex', game:'Pokémon', condition:'NM', qty:2, costBasis:18, marketValue:24, dateAcquired:'2025-03-06', setName:'151', cardNumber:'151/165', notes:'', isPersonal:false },
    { id:'i014', cardName:'Trafalgar Law (Alt Art)', game:'One Piece', condition:'NM', qty:1, costBasis:45, marketValue:72, dateAcquired:'2025-01-30', setName:'OP02', cardNumber:'OP02-118', notes:'', isPersonal:false },
    { id:'i015', cardName:'Elsa - Snow Queen', game:'Lorcana', condition:'NM', qty:1, costBasis:22, marketValue:19, dateAcquired:'2025-02-05', setName:'Into the Inklands', cardNumber:'', notes:'', isPersonal:false },
    // Personal collection (excluded from business calcs)
    { id:'i016', cardName:'Base Set Charizard (PSA 7)', game:'Pokémon', condition:'NM', qty:1, costBasis:350, marketValue:450, dateAcquired:'2024-06-15', setName:'Base Set', cardNumber:'4/102', notes:'Personal collection — not for sale', isPersonal:true },
  ],
  expenses: [
    { id:'x001', date:'2025-01-10', category:'Shipping', amount:45, description:'Bubble mailers (50 pack)', notes:'' },
    { id:'x002', date:'2025-01-15', category:'Supplies', amount:25, description:'Card sleeves & toploaders', notes:'' },
    { id:'x003', date:'2025-02-01', category:'Subscription', amount:12, description:'Collector app premium', notes:'Monthly' },
    { id:'x004', date:'2025-02-15', category:'Shipping', amount:38, description:'USPS shipping labels', notes:'' },
    { id:'x005', date:'2025-03-01', category:'Subscription', amount:12, description:'Collector app premium', notes:'Monthly' },
    { id:'x006', date:'2025-03-05', category:'Grading', amount:30, description:'PSA submission (1 card)', notes:'Umbreon VMAX' },
  ],
  seenHashes: ['b001h','b002h','b003h','b004h','b005h','b006h','b007h','b008h','b009h','b010h','b011h','b012h'],
  exportHistory: [],
  settings: { fillPct: 45 }
};

// Summary stats for reference:
// Buys: 12 records, ~$1,010 total spend
// Sells: 9 records, ~$705 revenue, ~$143.70 net profit
// Inventory: 16 cards (15 business + 1 personal), ~$1,144 market value
// Expenses: 6 records, $162 total
// Games represented: One Piece, Pokémon, MTG, Lorcana
// Platforms: Whatnot, TCGPlayer, eBay, Collector, local shop

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MOCK_DB };
}
