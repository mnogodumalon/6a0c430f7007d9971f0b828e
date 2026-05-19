// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Kundenverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    email?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    notizen_kunde?: string;
  };
}

export interface Katzenverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    rasse?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geschlecht?: LookupValue;
    farbe?: string;
    impfstatus?: LookupValue;
    besonderheiten?: string;
    besitzer?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    name?: string;
  };
}

export interface Zusatzleistungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    leistung_name?: string;
    leistung_beschreibung?: string;
    preis?: number;
  };
}

export interface Buchungsverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kunde?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    katze?: string; // applookup -> URL zu 'Katzenverwaltung' Record
    anreisedatum?: string; // Format: YYYY-MM-DD oder ISO String
    abreisedatum?: string; // Format: YYYY-MM-DD oder ISO String
    box_nummer?: string;
    zusatzleistungen_buchung?: string;
    gesamtpreis?: number;
    notizen_buchung?: string;
  };
}

export const APP_IDS = {
  KUNDENVERWALTUNG: '6a0c42e7de07a0de23255896',
  KATZENVERWALTUNG: '6a0c42effc83aceb7db3c82e',
  ZUSATZLEISTUNGEN: '6a0c42f058a2e85a9b23e897',
  BUCHUNGSVERWALTUNG: '6a0c42f0eede19ff84c9b740',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'katzenverwaltung': {
    geschlecht: [{ key: "maennlich", label: "Männlich" }, { key: "weiblich", label: "Weiblich" }, { key: "unbekannt", label: "Unbekannt" }],
    impfstatus: [{ key: "vollstaendig", label: "Vollständig geimpft" }, { key: "teilweise", label: "Teilweise geimpft" }, { key: "nicht_geimpft", label: "Nicht geimpft" }, { key: "unbekannt_impf", label: "Unbekannt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kundenverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'notizen_kunde': 'string/textarea',
  },
  'katzenverwaltung': {
    'rasse': 'string/text',
    'geburtsdatum': 'date/date',
    'geschlecht': 'lookup/radio',
    'farbe': 'string/text',
    'impfstatus': 'lookup/select',
    'besonderheiten': 'string/textarea',
    'besitzer': 'applookup/select',
    'name': 'string/text',
  },
  'zusatzleistungen': {
    'leistung_name': 'string/text',
    'leistung_beschreibung': 'string/textarea',
    'preis': 'number',
  },
  'buchungsverwaltung': {
    'kunde': 'applookup/select',
    'katze': 'applookup/select',
    'anreisedatum': 'date/date',
    'abreisedatum': 'date/date',
    'box_nummer': 'string/text',
    'zusatzleistungen_buchung': 'multipleapplookup/select',
    'gesamtpreis': 'number',
    'notizen_buchung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKundenverwaltung = StripLookup<Kundenverwaltung['fields']>;
export type CreateKatzenverwaltung = StripLookup<Katzenverwaltung['fields']>;
export type CreateZusatzleistungen = StripLookup<Zusatzleistungen['fields']>;
export type CreateBuchungsverwaltung = StripLookup<Buchungsverwaltung['fields']>;