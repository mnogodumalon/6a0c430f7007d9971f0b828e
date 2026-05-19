import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kundenverwaltung, Katzenverwaltung, Zusatzleistungen, Buchungsverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [katzenverwaltung, setKatzenverwaltung] = useState<Katzenverwaltung[]>([]);
  const [zusatzleistungen, setZusatzleistungen] = useState<Zusatzleistungen[]>([]);
  const [buchungsverwaltung, setBuchungsverwaltung] = useState<Buchungsverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kundenverwaltungData, katzenverwaltungData, zusatzleistungenData, buchungsverwaltungData] = await Promise.all([
        LivingAppsService.getKundenverwaltung(),
        LivingAppsService.getKatzenverwaltung(),
        LivingAppsService.getZusatzleistungen(),
        LivingAppsService.getBuchungsverwaltung(),
      ]);
      setKundenverwaltung(kundenverwaltungData);
      setKatzenverwaltung(katzenverwaltungData);
      setZusatzleistungen(zusatzleistungenData);
      setBuchungsverwaltung(buchungsverwaltungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kundenverwaltungData, katzenverwaltungData, zusatzleistungenData, buchungsverwaltungData] = await Promise.all([
          LivingAppsService.getKundenverwaltung(),
          LivingAppsService.getKatzenverwaltung(),
          LivingAppsService.getZusatzleistungen(),
          LivingAppsService.getBuchungsverwaltung(),
        ]);
        setKundenverwaltung(kundenverwaltungData);
        setKatzenverwaltung(katzenverwaltungData);
        setZusatzleistungen(zusatzleistungenData);
        setBuchungsverwaltung(buchungsverwaltungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kundenverwaltung]);

  const katzenverwaltungMap = useMemo(() => {
    const m = new Map<string, Katzenverwaltung>();
    katzenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [katzenverwaltung]);

  const zusatzleistungenMap = useMemo(() => {
    const m = new Map<string, Zusatzleistungen>();
    zusatzleistungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [zusatzleistungen]);

  return { kundenverwaltung, setKundenverwaltung, katzenverwaltung, setKatzenverwaltung, zusatzleistungen, setZusatzleistungen, buchungsverwaltung, setBuchungsverwaltung, loading, error, fetchAll, kundenverwaltungMap, katzenverwaltungMap, zusatzleistungenMap };
}