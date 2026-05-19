import type { EnrichedBuchungsverwaltung, EnrichedKatzenverwaltung } from '@/types/enriched';
import type { Buchungsverwaltung, Katzenverwaltung, Kundenverwaltung, Zusatzleistungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface KatzenverwaltungMaps {
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
}

export function enrichKatzenverwaltung(
  katzenverwaltung: Katzenverwaltung[],
  maps: KatzenverwaltungMaps
): EnrichedKatzenverwaltung[] {
  return katzenverwaltung.map(r => ({
    ...r,
    besitzerName: resolveDisplay(r.fields.besitzer, maps.kundenverwaltungMap, 'vorname', 'nachname'),
  }));
}

interface BuchungsverwaltungMaps {
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
  katzenverwaltungMap: Map<string, Katzenverwaltung>;
  zusatzleistungenMap: Map<string, Zusatzleistungen>;
}

export function enrichBuchungsverwaltung(
  buchungsverwaltung: Buchungsverwaltung[],
  maps: BuchungsverwaltungMaps
): EnrichedBuchungsverwaltung[] {
  return buchungsverwaltung.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenverwaltungMap, 'vorname', 'nachname'),
    katzeName: resolveDisplay(r.fields.katze, maps.katzenverwaltungMap, 'rasse'),
    zusatzleistungen_buchungName: resolveDisplay(r.fields.zusatzleistungen_buchung, maps.zusatzleistungenMap, 'leistung_name'),
  }));
}
