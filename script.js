// ============================================================================
// PREISDATENBANK
// ============================================================================

const TICKET_PREISE = {
    "Einzelfahrschein_AB": 4.00,
    "Einzelfahrschein_AB_ermassigt": 2.50,
    "Einzelfahrschein_ABC": 5.00,
    "Einzelfahrschein_ABC_ermassigt": 3.50,
    
    "Kurzstrecke_AB": 2.80,
    "Kurzstrecke_AB_ermassigt": 1.90,
    "Kurzstrecke_ABC": 2.80,
    "Kurzstrecke_ABC_ermassigt": 1.90,
    
    "Tageskarte_AB": 11.20,
    "Tageskarte_AB_ermassigt": 7.40,
    "Tageskarte_ABC": 12.90,
    "Tageskarte_ABC_ermassigt": 8.00,
    
    "4-Fahrten-Karte_AB": 12.40,
    "4-Fahrten-Karte_AB_ermassigt": 7.40,
    "4-Fahrten-Karte_ABC": 16.80,
    "4-Fahrten-Karte_ABC_ermassigt": 11.60,
};

// ============================================================================
// KLASSEN
// ============================================================================

class Ticket {
    constructor(ticketType, zone, ermassigt = false) {
        this.ticketType = ticketType;
        this.zone = zone;
        this.ermassigt = ermassigt;
        this.preis = this.berechnePreis();
    }

    berechnePreis() {
        let key = `${this.ticketType}_${this.zone}`;
        if (this.ermassigt) {
            key += "_ermassigt";
        }
        return TICKET_PREISE[key] || 0;
    }

    getInfo() {
        let text = `${this.ticketType} (${this.zone})`;
        if (this.ermassigt) {
            text += " - ERMÄSSIGT";
        }
        return text;
    }

    getKey() {
        return `${this.ticketType}_${this.zone}_${this.ermassigt}`;
    }
}

class Warenkorb {
    constructor() {
        this.tickets = [];
    }

    ticketHinzufuegen(ticket) {
        this.tickets.push(ticket);
    }

    getGesamtpreis() {
        return this.tickets.reduce((sum, t) => sum + t.preis, 0);
    }

    getAnzahlTickets() {
        return this.tickets.length;
    }

    leeren() {
        this.tickets = [];
    }

    getGruppiert() {
        const gruppen = {};
        for (const t of this.tickets) {
            const key = t.getKey();
            if (!gruppen[key]) {
                gruppen[key] = { ticket: t, anzahl: 0 };
            }
            gruppen[key].anzahl++;
        }
        return gruppen;
    }
}

class Bezahlung {
    constructor(gesamtbetrag) {
        this.gesamtbetrag = gesamtbetrag;
        this.bezahlterBetrag = 0;
        this.zahlungsart = null;
    }

    muenzeEinwerfen(betrag) {
        this.bezahlterBetrag += betrag;
    }

    karteZahlen() {
        this.zahlungsart = "Karte";
        this.bezahlterBetrag = this.gesamtbetrag;
    }

    istBezahlt() {
        return this.bezahlterBetrag >= this.gesamtbetrag;
    }

    getRueckgeld() {
        return Math.max(0, this.bezahlterBetrag - this.gesamtbetrag);
    }

    getNochZuZahlen() {
        return Math.max(0, this.gesamtbetrag - this.bezahlterBetrag);
    }
}

// ============================================================================
// APP-STATE
// ============================================================================

let warenkorb = new Warenkorb();
let bezahlung = null;
let resetTimer = null;

// ============================================================================
// DOM-ELEMENTE
// ============================================================================

const zoneRadios = document.querySelectorAll('input[name="zone"]');
const ticketRadios = document.querySelectorAll('input[name="ticket"]');
const ermaessigCheckbox = document.getElementById('ermassigt');
const currentPriceEl = document.getElementById('current-price');
const addToCartBtn = document.getElementById('add-to-cart');
const cartContainer = document.getElementById('cart-container');
const totalPriceEl = document.getElementById('total-price');
const coinButtons = document.querySelectorAll('.btn.coin');
const payCardBtn = document.getElementById('pay-card');
const receiptContainer = document.getElementById('receipt-container');
const newPurchaseBtn = document.getElementById('new-purchase');

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getSelectedZone() {
    return document.querySelector('input[name="zone"]:checked').value;
}

function getSelectedTicketType() {
    return document.querySelector('input[name="ticket"]:checked').value;
}

function isErmassigt() {
    return ermaessigCheckbox.checked;
}

function updatePrice() {
    const ticket = new Ticket(getSelectedTicketType(), getSelectedZone(), isErmassigt());
    currentPriceEl.textContent = `Preis: ${ticket.preis.toFixed(2)} €`;
}

function updateCartDisplay() {
    cartContainer.innerHTML = '';
    
    if (warenkorb.getAnzahlTickets() === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">Warenkorb ist leer</p>';
        totalPriceEl.textContent = '💰 Gesamtbetrag: 0.00 €';
        return;
    }
    
    const gruppen = warenkorb.getGruppiert();
    
    for (const key in gruppen) {
        const { ticket, anzahl } = gruppen[key];
        const prefix = anzahl > 1 ? `(${anzahl}x) ` : '';
        let displayName = `${prefix}${ticket.ticketType}`;
        if (ticket.ermassigt) {
            displayName += ' (Ermäßigt)';
        }
        
        const item = document.createElement('div');
        item.className = 'cart-item';
        item.innerHTML = `
            <div class="cart-icon">🎫</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${displayName}</div>
                <div class="cart-item-zone">Tarifbereich ${ticket.zone}</div>
            </div>
            <div class="cart-item-price">${(ticket.preis * anzahl).toFixed(2)} €</div>
        `;
        cartContainer.appendChild(item);
    }
    
    totalPriceEl.textContent = `💰 Gesamtbetrag: ${warenkorb.getGesamtpreis().toFixed(2)} €`;
}

function addToCart() {
    const ticket = new Ticket(getSelectedTicketType(), getSelectedZone(), isErmassigt());
    warenkorb.ticketHinzufuegen(ticket);
    updateCartDisplay();
}

function showPaymentStatus(message) {
    receiptContainer.innerHTML = `<div class="payment-status">${message}</div>`;
    receiptContainer.classList.remove('paid');
}

function showFinalReceipt() {
    receiptContainer.innerHTML = '';
    receiptContainer.classList.add('paid');
    
    const gruppen = warenkorb.getGruppiert();
    
    for (const key in gruppen) {
        const { ticket, anzahl } = gruppen[key];
        let name = anzahl > 1 ? `(${anzahl}x) ${ticket.ticketType}` : ticket.ticketType;
        if (ticket.ermassigt) name += ' (Erm)';
        
        const item = document.createElement('div');
        item.className = 'receipt-item';
        item.innerHTML = `
            <span class="receipt-icon">✅</span>
            <div class="receipt-item-info">
                <div class="receipt-item-name">${name}</div>
                <div class="receipt-item-zone">Zone ${ticket.zone}</div>
            </div>
            <div class="receipt-item-price">${(ticket.preis * anzahl).toFixed(2)} €</div>
        `;
        receiptContainer.appendChild(item);
    }
    
    const rueckgeld = bezahlung.getRueckgeld();
    if (rueckgeld > 0) {
        const changeMsg = document.createElement('div');
        changeMsg.className = 'change-message';
        changeMsg.textContent = `💸 Wechselgeld: ${rueckgeld.toFixed(2)} €`;
        receiptContainer.appendChild(changeMsg);
    }
    
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = '🎉 ZAHLUNG ERFOLGREICH! Ihre Tickets wurden gedruckt.';
    receiptContainer.appendChild(successMsg);
    
    clearTimeout(resetTimer);
    resetTimer = setTimeout(newPurchase, 5000);
}

function addCoin(amount) {
    if (warenkorb.getAnzahlTickets() === 0) return;
    
    if (!bezahlung) {
        bezahlung = new Bezahlung(warenkorb.getGesamtpreis());
    }
    
    bezahlung.muenzeEinwerfen(amount);
    
    if (bezahlung.istBezahlt()) {
        showFinalReceipt();
    } else {
        const nochZuZahlen = bezahlung.getNochZuZahlen();
        showPaymentStatus(`📥 Eingeworfen: ${amount.toFixed(2)} €<br>⏳ Noch zu zahlen: ${nochZuZahlen.toFixed(2)} €`);
    }
}

function payWithCard() {
    if (warenkorb.getAnzahlTickets() === 0) return;
    
    if (!bezahlung) {
        bezahlung = new Bezahlung(warenkorb.getGesamtpreis());
    }
    
    bezahlung.karteZahlen();
    
    // Animation starten
    receiptContainer.innerHTML = `
        <div class="print-progress">
            <div class="print-progress-bar" id="print-bar"></div>
        </div>
        <div class="payment-status">🖨️ Tickets werden gedruckt...</div>
    `;
    receiptContainer.classList.remove('paid');
    
    let progress = 0;
    const printBar = document.getElementById('print-bar');
    
    const interval = setInterval(() => {
        progress += 2;
        printBar.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            showFinalReceipt();
        }
    }, 50);
}

function newPurchase() {
    warenkorb = new Warenkorb();
    bezahlung = null;
    clearTimeout(resetTimer);
    
    updateCartDisplay();
    receiptContainer.innerHTML = '';
    receiptContainer.classList.remove('paid');
    updatePrice();
}

// ============================================================================
// EVENT-LISTENER
// ============================================================================

zoneRadios.forEach(radio => radio.addEventListener('change', updatePrice));
ticketRadios.forEach(radio => radio.addEventListener('change', updatePrice));
ermaessigCheckbox.addEventListener('change', updatePrice);

addToCartBtn.addEventListener('click', addToCart);

coinButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const amount = parseFloat(btn.dataset.amount);
        addCoin(amount);
    });
});

payCardBtn.addEventListener('click', payWithCard);
newPurchaseBtn.addEventListener('click', newPurchase);

// Initial
updatePrice();
