// Things several pages need to know about PPCs and post offices.

export const REGIONS = ['North', 'Central', 'West', 'South', 'East', 'North-East', 'Islands'];

export const REGION_OF = {
  Delhi: 'North',
  Haryana: 'North',
  Punjab: 'North',
  Chandigarh: 'North',
  'Himachal Pradesh': 'North',
  'Jammu and Kashmir': 'North',
  Ladakh: 'North',
  Uttarakhand: 'North',
  'Uttar Pradesh': 'North',
  Rajasthan: 'North',
  'Madhya Pradesh': 'Central',
  Chhattisgarh: 'Central',
  Gujarat: 'West',
  Maharashtra: 'West',
  Goa: 'West',
  'Dadra and Nagar Haveli and Daman and Diu': 'West',
  'Andhra Pradesh': 'South',
  Telangana: 'South',
  Karnataka: 'South',
  Kerala: 'South',
  'Tamil Nadu': 'South',
  Puducherry: 'South',
  Bihar: 'East',
  Jharkhand: 'East',
  Odisha: 'East',
  'West Bengal': 'East',
  'Arunachal Pradesh': 'North-East',
  Assam: 'North-East',
  Manipur: 'North-East',
  Meghalaya: 'North-East',
  Mizoram: 'North-East',
  Nagaland: 'North-East',
  Sikkim: 'North-East',
  Tripura: 'North-East',
  'Andaman and Nicobar Islands': 'Islands',
};

// Post-office type -> colour group (the same four groups on the PO Map and on Know About PPCs)
export const CATS = {
  1: { label: 'GPO / HO / PB', note: 'General and head post offices, philatelic bureaus' },
  2: { label: 'Sub post office', note: 'SO' },
  3: { label: 'Branch post office', note: 'BO' },
  4: { label: 'MDG / other', note: 'Mukhya Dak Ghar, or type not known' },
};

const CAT1 = { 'GPO-PB': 1, GPO: 1, PB: 1, 'HO-PB': 1, HO: 1 };

export function catOf(rank) {
  if (CAT1[rank]) return 1;
  if (rank === 'SO' || rank === 'MDG-SO') return 2;
  if (rank === 'BO') return 3;
  return 4; // MDG, NA, or anything unrecognised
}

const RANKS = ['gpo-pb', 'ho-pb', 'mdg-so', 'gpo', 'ho', 'pb', 'so', 'bo', 'mdg'];
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/** "560001-bengaluru-gpo-pb-2" -> { pin, rank, po } (the post office and its type are part of the file name). */
export function fromFile(slug) {
  const m = /^(\d{6})-(.*)$/.exec(slug);
  const pin = m ? m[1] : '';
  let rest = (m ? m[2] : slug).replace(/-\d+$/, '');
  let rank = '';
  RANKS.some((r) => {
    if (rest === r || rest.slice(-(r.length + 1)) === '-' + r) {
      rank = r.toUpperCase();
      rest = rest.slice(0, rest.length - r.length - 1);
      return true;
    }
    return false;
  });
  const place = rest.split('-').filter(Boolean).map(cap).join(' ');
  return { pin, rank, po: (place + ' ' + rank).trim() };
}

export const picture = (file) => `/pictures/ppcs/${file}`;
