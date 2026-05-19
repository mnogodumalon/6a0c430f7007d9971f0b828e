import type { Buchungsverwaltung, Katzenverwaltung } from './app';

export type EnrichedKatzenverwaltung = Katzenverwaltung & {
  besitzerName: string;
};

export type EnrichedBuchungsverwaltung = Buchungsverwaltung & {
  kundeName: string;
  katzeName: string;
  zusatzleistungen_buchungName: string;
};
