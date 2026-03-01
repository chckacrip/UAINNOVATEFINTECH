/**
 * Generates 2000 realistic transactions over the past year.
 * Output: CSV with date, description, amount (negative = expense, positive = income).
 * Run: node scripts/generate-seed-transactions.js
 * Then upload the generated CSV via the app (Upload → CSV).
 */

const fs = require("fs");
const path = require("path");

const CATEGORIES = [
  "Housing", "Utilities", "Groceries", "Dining", "Transport", "Shopping",
  "Subscriptions", "Health", "Entertainment", "Travel", "Debt", "Income", "Other",
];

// Realistic merchants/descriptions per category (used for description; category assigned by app)
const MERCHANTS = {
  Income: ["PAYROLL DIRECT DEP", "DIRECT DEPOSIT PAYROLL", "EMPLOYER PAYROLL", "SALARY DEPOSIT", "ACME CORP PAYROLL"],
  Housing: ["RENT PAYMENT", "APARTMENT RENT", "LANDLORD RENT", "MORTGAGE PAYMENT", "HOA FEE"],
  Utilities: ["ELECTRIC CO", "GAS COMPANY", "WATER UTILITY", "INTERNET BILL", "PHONE BILL", "COMCAST", "AT&T"],
  Groceries: ["WHOLE FOODS", "TRADER JOE'S", "SAFEWAY", "KROGER", "COSTCO", "WALMART", "TARGET", "ALDI", "SPROUTS"],
  Dining: ["STARBUCKS", "CHIPOTLE", "MCDONALDS", "PANERA", "DOMINO'S", "UBER EATS", "DOORDASH", "LOCAL BISTRO", "COFFEE SHOP"],
  Transport: ["SHELL GAS", "CHEVRON", "EXXON", "UBER", "LYFT", "PARKING", "TOLL", "METRO CARD", "BUS PASS"],
  Shopping: ["AMAZON", "AMAZON.COM", "EBAY", "HOME DEPOT", "IKEA", "BEST BUY", "APPLE.COM", "NORDSTROM"],
  Subscriptions: ["NETFLIX", "SPOTIFY", "APPLE MUSIC", "HULU", "DISNEY+", "HBO MAX", "DROPBOX", "ICLOUD", "GITHUB", "ADOBE"],
  Health: ["CVS PHARMACY", "WALGREENS", "DOCTOR COPAY", "GYM MEMBERSHIP", "DENTAL", "VISION"],
  Entertainment: ["MOVIE TICKET", "CONCERT", "STEAM", "PLAYSTATION", "XBOX", "GOLF COURSE"],
  Travel: ["AIRLINE", "HOTEL", "AIRBNB", "EXPEDIA", "RENTAL CAR"],
  Other: ["BANK FEE", "ATM WITHDRAWAL", "VENMO", "ZELLE", "CASH APP", "PERSONAL TRANSFER"],
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

// Amount ranges (negative for expenses) - approximate monthly frequency
const EXPENSE_TEMPLATES = [
  { category: "Housing", descs: MERCHANTS.Housing, amountMin: -1800, amountMax: -1200, perMonth: 1 },
  { category: "Utilities", descs: MERCHANTS.Utilities, amountMin: -180, amountMax: -60, perMonth: 3 },
  { category: "Groceries", descs: MERCHANTS.Groceries, amountMin: -120, amountMax: -35, perMonth: 12 },
  { category: "Dining", descs: MERCHANTS.Dining, amountMin: -45, amountMax: -8, perMonth: 25 },
  { category: "Transport", descs: MERCHANTS.Transport, amountMin: -80, amountMax: -25, perMonth: 8 },
  { category: "Shopping", descs: MERCHANTS.Shopping, amountMin: -200, amountMax: -15, perMonth: 10 },
  { category: "Subscriptions", descs: MERCHANTS.Subscriptions, amountMin: -25, amountMax: -5, perMonth: 12 },
  { category: "Health", descs: MERCHANTS.Health, amountMin: -80, amountMax: -10, perMonth: 4 },
  { category: "Entertainment", descs: MERCHANTS.Entertainment, amountMin: -60, amountMax: -12, perMonth: 6 },
  { category: "Other", descs: MERCHANTS.Other, amountMin: -50, amountMax: -5, perMonth: 8 },
];

const INCOME_AMOUNTS = [3200, 3400, 3100, 3300, 3500, 3200]; // biweekly-ish variance

function generate() {
  const rows = [];
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);

  // 1) Income: ~2 per month × 12 = 24 (then we'll add more to reach 2000)
  const paydays = [];
  let d = new Date(start);
  while (d <= new Date()) {
    // Biweekly: 1st and 15th approx, with small random offset
    const day = d.getDate();
    if (day <= 5 || (day >= 12 && day <= 18)) {
      paydays.push(new Date(d));
    }
    d = addDays(d, 1);
  }
  // Trim to ~24 and spread over the year
  const step = Math.max(1, Math.floor(paydays.length / 24));
  for (let i = 0; i < paydays.length && rows.length < 24; i += step) {
    const date = paydays[i];
    rows.push({
      date: formatDate(date),
      description: randomChoice(MERCHANTS.Income),
      amount: randomChoice(INCOME_AMOUNTS) + randomInt(-100, 100),
    });
  }

  // 2) Expenses: fill up to 2000 total
  const end = new Date();
  const daysRange = 365;
  const targetExpenses = 2000 - rows.length;

  const expensePool = [];
  for (const t of EXPENSE_TEMPLATES) {
    const count = Math.max(1, Math.round((t.perMonth / 30) * 365 * (targetExpenses / 2000)));
    for (let i = 0; i < count; i++) expensePool.push(t);
  }

  for (let i = expensePool.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [expensePool[i], expensePool[j]] = [expensePool[j], expensePool[i]];
  }

  const maxDayOffset = Math.min(daysRange - 1, Math.floor((end - start) / (24 * 60 * 60 * 1000)));

  for (let i = 0; i < targetExpenses; i++) {
    const t = expensePool[i % expensePool.length];
    const date = addDays(start, randomInt(0, maxDayOffset));
    const amount = randomInt(Math.round(t.amountMin), Math.round(t.amountMax));
    rows.push({
      date: formatDate(date),
      description: randomChoice(t.descs),
      amount: -Math.abs(amount),
    });
  }

  while (rows.length < 2000) {
    const t = randomChoice(EXPENSE_TEMPLATES);
    const date = addDays(start, randomInt(0, maxDayOffset));
    const amount = randomInt(Math.round(t.amountMin), Math.round(t.amountMax));
    rows.push({
      date: formatDate(date),
      description: randomChoice(t.descs),
      amount: -Math.abs(amount),
    });
  }

  // Sort by date
  rows.sort((a, b) => a.date.localeCompare(b.date));

  return rows;
}

function toCSV(rows) {
  const header = "date,description,amount";
  const lines = [header, ...rows.map((r) => `${r.date},"${String(r.description).replace(/"/g, '""')}",${r.amount}`)];
  return lines.join("\n");
}

const rows = generate();
const csv = toCSV(rows);
const outPath = path.join(__dirname, "..", "seed-transactions-2000.csv");
fs.writeFileSync(outPath, csv, "utf8");
console.log(`Wrote ${rows.length} transactions to ${outPath}`);
console.log("Upload this file via the app: Upload → CSV → choose seed-transactions-2000.csv");
