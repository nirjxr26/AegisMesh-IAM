const now = new Date();

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/125.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0',
];

const COUNTRY_CITY = [
    { country: 'United States', city: 'Austin' }, { country: 'United Kingdom', city: 'London' },
    { country: 'India', city: 'Bengaluru' }, { country: 'Germany', city: 'Berlin' },
    { country: 'France', city: 'Paris' }, { country: 'Japan', city: 'Tokyo' },
    { country: 'Nigeria', city: 'Lagos' }, { country: 'Brazil', city: 'Sao Paulo' },
];

const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const hoursFrom = (iso, h) => new Date(new Date(iso).getTime() + h * 60 * 60 * 1000);
const toIso = (d) => d.toISOString();

module.exports = { USER_AGENTS, COUNTRY_CITY, now, hoursAgo, daysAgo, hoursFrom, toIso };
