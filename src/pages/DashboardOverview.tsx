import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKatzenverwaltung, enrichBuchungsverwaltung } from '@/lib/enrich';
import type { EnrichedBuchungsverwaltung } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconCat, IconUsers, IconCalendar, IconCurrencyEuro, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BuchungsverwaltungDialog } from '@/components/dialogs/BuchungsverwaltungDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { addDays, format, isWithinInterval, parseISO, startOfDay, differenceInDays, isBefore, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';

const APPGROUP_ID = '6a0c430f7007d9971f0b828e';
const REPAIR_ENDPOINT = '/claude/build/repair';
const DAYS_VISIBLE = 14;

function getStatusBadge(buchung: EnrichedBuchungsverwaltung, today: Date) {
  const anreise = buchung.fields.anreisedatum ? parseISO(buchung.fields.anreisedatum) : null;
  const abreise = buchung.fields.abreisedatum ? parseISO(buchung.fields.abreisedatum) : null;
  if (!anreise || !abreise) return { label: 'Unvollständig', variant: 'secondary' as const, color: 'bg-muted text-muted-foreground' };
  const todayStart = startOfDay(today);
  const anreiseStart = startOfDay(anreise);
  const abreiseStart = startOfDay(abreise);
  if (isBefore(abreiseStart, todayStart)) return { label: 'Abgereist', variant: 'secondary' as const, color: 'bg-muted text-muted-foreground' };
  if (isWithinInterval(todayStart, { start: anreiseStart, end: abreiseStart })) return { label: 'Aktuell', variant: 'default' as const, color: 'bg-primary text-primary-foreground' };
  if (isAfter(anreiseStart, todayStart)) return { label: 'Geplant', variant: 'outline' as const, color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Unbekannt', variant: 'secondary' as const, color: 'bg-muted text-muted-foreground' };
}

export default function DashboardOverview() {
  const {
    kundenverwaltung, katzenverwaltung, zusatzleistungen, buchungsverwaltung,
    kundenverwaltungMap, katzenverwaltungMap, zusatzleistungenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedKatzenverwaltung = enrichKatzenverwaltung(katzenverwaltung, { kundenverwaltungMap });
  const enrichedBuchungsverwaltung = enrichBuchungsverwaltung(buchungsverwaltung, { kundenverwaltungMap, katzenverwaltungMap, zusatzleistungenMap });

  const today = useMemo(() => startOfDay(new Date()), []);
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedBuchungsverwaltung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedBuchungsverwaltung | null>(null);
  const [selectedBuchung, setSelectedBuchung] = useState<EnrichedBuchungsverwaltung | null>(null);

  const timelineDays = useMemo(() => {
    return Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(today, timelineOffset + i));
  }, [today, timelineOffset]);

  const aktiveBuchungen = useMemo(() => {
    return enrichedBuchungsverwaltung.filter(b => {
      if (!b.fields.abreisedatum) return true;
      return !isBefore(startOfDay(parseISO(b.fields.abreisedatum)), today);
    });
  }, [enrichedBuchungsverwaltung, today]);

  const aktuelleBelegung = useMemo(() => {
    return enrichedBuchungsverwaltung.filter(b => {
      const anreise = b.fields.anreisedatum ? parseISO(b.fields.anreisedatum) : null;
      const abreise = b.fields.abreisedatum ? parseISO(b.fields.abreisedatum) : null;
      if (!anreise || !abreise) return false;
      return isWithinInterval(today, { start: startOfDay(anreise), end: startOfDay(abreise) });
    });
  }, [enrichedBuchungsverwaltung, today]);

  const heuteAnreisend = useMemo(() => {
    return enrichedBuchungsverwaltung.filter(b => {
      if (!b.fields.anreisedatum) return false;
      return format(parseISO(b.fields.anreisedatum), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    });
  }, [enrichedBuchungsverwaltung, today]);

  const heuteAbreisend = useMemo(() => {
    return enrichedBuchungsverwaltung.filter(b => {
      if (!b.fields.abreisedatum) return false;
      return format(parseISO(b.fields.abreisedatum), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    });
  }, [enrichedBuchungsverwaltung, today]);

  const gesamtumsatz = useMemo(() => {
    return buchungsverwaltung.reduce((sum, b) => sum + (b.fields.gesamtpreis ?? 0), 0);
  }, [buchungsverwaltung]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBuchungsverwaltungEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
    if (selectedBuchung?.record_id === deleteTarget.record_id) setSelectedBuchung(null);
  };

  const handleEdit = (b: EnrichedBuchungsverwaltung) => {
    setEditRecord(b);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditRecord(null);
    setDialogOpen(true);
  };

  // Build box/row list from all bookings — unique box numbers
  const allBoxen = useMemo(() => {
    const boxes = new Set<string>();
    buchungsverwaltung.forEach(b => {
      if (b.fields.box_nummer) boxes.add(b.fields.box_nummer);
    });
    const sorted = Array.from(boxes).sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    if (sorted.length === 0) return ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'];
    return sorted;
  }, [buchungsverwaltung]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktuell belegt"
          value={String(aktuelleBelegung.length)}
          description="Katzen heute"
          icon={<IconCat size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Anreise heute"
          value={String(heuteAnreisend.length)}
          description={heuteAnreisend.length === 1 ? 'Katze kommt heute' : 'Katzen kommen heute'}
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Abreise heute"
          value={String(heuteAbreisend.length)}
          description={heuteAbreisend.length === 1 ? 'Katze reist ab' : 'Katzen reisen ab'}
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kunden gesamt"
          value={String(kundenverwaltung.length)}
          description={`${katzenverwaltung.length} Katzen registriert`}
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Belegungskalender */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <IconCalendar size={18} className="text-primary shrink-0" />
            <h2 className="font-semibold text-sm">Belegungsplan</h2>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {format(timelineDays[0], 'dd.MM', { locale: de })} – {format(timelineDays[timelineDays.length - 1], 'dd.MM.yyyy', { locale: de })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setTimelineOffset(o => o - DAYS_VISIBLE)}>
              <IconChevronLeft size={14} />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setTimelineOffset(0)}>
              Heute
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setTimelineOffset(o => o + DAYS_VISIBLE)}>
              <IconChevronRight size={14} />
            </Button>
            <Button size="sm" className="h-7 px-3 text-xs gap-1" onClick={handleCreate}>
              <IconPlus size={13} />
              <span className="hidden sm:inline">Neue Buchung</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Kopfzeile mit Tagesspalten */}
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-28 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground">Box</div>
              {timelineDays.map((day, i) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                return (
                  <div
                    key={i}
                    className={`flex-1 min-w-[40px] px-1 py-2 text-center text-xs font-medium border-l border-border/50 ${isToday ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                  >
                    <div>{format(day, 'EEE', { locale: de })}</div>
                    <div className={isToday ? 'text-primary' : ''}>{format(day, 'd')}</div>
                  </div>
                );
              })}
            </div>

            {/* Box-Zeilen */}
            {allBoxen.map((box) => {
              const boxBuchungen = enrichedBuchungsverwaltung.filter(b => b.fields.box_nummer === box);
              return (
                <div key={box} className="flex border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors relative" style={{ minHeight: 44 }}>
                  <div className="w-28 shrink-0 px-3 py-2 text-xs font-medium text-foreground flex items-center">{box}</div>
                  <div className="flex-1 relative flex">
                    {timelineDays.map((day, i) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const isToday = dayStr === format(today, 'yyyy-MM-dd');
                      return (
                        <div
                          key={i}
                          className={`flex-1 min-w-[40px] border-l border-border/30 ${isToday ? 'bg-primary/5' : ''}`}
                        />
                      );
                    })}
                    {/* Buchungs-Balken */}
                    {boxBuchungen.map(buchung => {
                      const anreise = buchung.fields.anreisedatum ? parseISO(buchung.fields.anreisedatum) : null;
                      const abreise = buchung.fields.abreisedatum ? parseISO(buchung.fields.abreisedatum) : null;
                      if (!anreise || !abreise) return null;
                      const windowStart = timelineDays[0];
                      const windowEnd = timelineDays[timelineDays.length - 1];
                      const clampedStart = isBefore(anreise, windowStart) ? windowStart : anreise;
                      const clampedEnd = isAfter(abreise, windowEnd) ? windowEnd : abreise;
                      if (isAfter(clampedStart, windowEnd) || isBefore(clampedEnd, windowStart)) return null;
                      const startIdx = Math.max(0, differenceInDays(clampedStart, windowStart));
                      const endIdx = Math.min(DAYS_VISIBLE - 1, differenceInDays(clampedEnd, windowStart));
                      if (endIdx < startIdx) return null;
                      const colWidth = 100 / DAYS_VISIBLE;
                      const leftPct = startIdx * colWidth;
                      const widthPct = (endIdx - startIdx + 1) * colWidth;
                      const isSelected = selectedBuchung?.record_id === buchung.record_id;
                      const status = getStatusBadge(buchung, today);
                      const colorClass = status.label === 'Aktuell'
                        ? 'bg-primary text-primary-foreground'
                        : status.label === 'Geplant'
                        ? 'bg-amber-400 text-amber-950'
                        : 'bg-muted-foreground/40 text-foreground';
                      return (
                        <button
                          key={buchung.record_id}
                          onClick={() => setSelectedBuchung(isSelected ? null : buchung)}
                          className={`absolute top-1.5 bottom-1.5 rounded-md px-1.5 text-xs font-medium truncate cursor-pointer transition-all ${colorClass} ${isSelected ? 'ring-2 ring-offset-1 ring-primary shadow-md' : 'hover:opacity-90 hover:shadow'}`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${buchung.kundeName} — ${buchung.katzeName || buchung.kundeName}`}
                        >
                          <span className="truncate">{buchung.katzeName || buchung.kundeName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail-Panel für ausgewählte Buchung */}
      {selectedBuchung && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <IconCat size={16} className="text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">
                {selectedBuchung.katzeName || '—'} — {selectedBuchung.kundeName}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getStatusBadge(selectedBuchung, today).color}`}>
                {getStatusBadge(selectedBuchung, today).label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" className="h-7 px-2 gap-1" onClick={() => handleEdit(selectedBuchung)}>
                <IconPencil size={13} />
                <span className="hidden sm:inline text-xs">Bearbeiten</span>
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(selectedBuchung)}>
                <IconTrash size={13} />
                <span className="hidden sm:inline text-xs">Löschen</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Anreise</div>
              <div className="text-sm font-medium">{formatDate(selectedBuchung.fields.anreisedatum)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Abreise</div>
              <div className="text-sm font-medium">{formatDate(selectedBuchung.fields.abreisedatum)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Box</div>
              <div className="text-sm font-medium">{selectedBuchung.fields.box_nummer || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Gesamtpreis</div>
              <div className="text-sm font-medium">{formatCurrency(selectedBuchung.fields.gesamtpreis)}</div>
            </div>
            {selectedBuchung.fields.notizen_buchung && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-xs text-muted-foreground mb-1">Notizen</div>
                <div className="text-sm text-foreground">{selectedBuchung.fields.notizen_buchung}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aktuelle und kommende Buchungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aktuelle Buchungen */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <h3 className="font-semibold text-sm">Aktuell anwesend</h3>
              <Badge variant="secondary" className="text-xs">{aktuelleBelegung.length}</Badge>
            </div>
          </div>
          <div className="divide-y divide-border">
            {aktuelleBelegung.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <IconCat size={32} stroke={1.5} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Keine Katzen aktuell anwesend</p>
              </div>
            ) : (
              aktuelleBelegung.map(buchung => (
                <BuchungsZeile
                  key={buchung.record_id}
                  buchung={buchung}
                  today={today}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onSelect={setSelectedBuchung}
                  isSelected={selectedBuchung?.record_id === buchung.record_id}
                />
              ))
            )}
          </div>
        </div>

        {/* Kommende Buchungen */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <h3 className="font-semibold text-sm">Demnächst</h3>
              <Badge variant="secondary" className="text-xs">
                {aktiveBuchungen.filter(b => {
                  const anreise = b.fields.anreisedatum ? parseISO(b.fields.anreisedatum) : null;
                  return anreise && isAfter(startOfDay(anreise), today);
                }).length}
              </Badge>
            </div>
          </div>
          <div className="divide-y divide-border">
            {(() => {
              const kommend = aktiveBuchungen.filter(b => {
                const anreise = b.fields.anreisedatum ? parseISO(b.fields.anreisedatum) : null;
                return anreise && isAfter(startOfDay(anreise), today);
              }).sort((a, b) => {
                const da = a.fields.anreisedatum ?? '';
                const db = b.fields.anreisedatum ?? '';
                return da.localeCompare(db);
              }).slice(0, 8);
              if (kommend.length === 0) return (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <IconCalendar size={32} stroke={1.5} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Keine kommenden Buchungen</p>
                </div>
              );
              return kommend.map(buchung => (
                <BuchungsZeile
                  key={buchung.record_id}
                  buchung={buchung}
                  today={today}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onSelect={setSelectedBuchung}
                  isSelected={selectedBuchung?.record_id === buchung.record_id}
                />
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Umsatz-Übersicht */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <IconCurrencyEuro size={16} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Gesamtumsatz</span>
          </div>
          <div className="text-2xl font-bold text-foreground truncate">{formatCurrency(gesamtumsatz)}</div>
          <div className="text-xs text-muted-foreground mt-1">aus {buchungsverwaltung.length} Buchungen</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <IconCat size={16} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Registrierte Katzen</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{katzenverwaltung.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {enrichedKatzenverwaltung.filter(k => k.fields.impfstatus?.key === 'vollstaendig').length} vollständig geimpft
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <IconUsers size={16} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Stammkunden</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{kundenverwaltung.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Ø {kundenverwaltung.length > 0 ? (buchungsverwaltung.length / kundenverwaltung.length).toFixed(1) : '0'} Buchungen/Kunde
          </div>
        </div>
      </div>

      {/* Dialoge */}
      <BuchungsverwaltungDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateBuchungsverwaltungEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createBuchungsverwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord ? {
          ...editRecord.fields,
          kunde: editRecord.fields.kunde
            ? createRecordUrl(APP_IDS.KUNDENVERWALTUNG, editRecord.fields.kunde.match(/([a-f0-9]{24})$/i)?.[1] ?? '')
            : undefined,
          katze: editRecord.fields.katze
            ? createRecordUrl(APP_IDS.KATZENVERWALTUNG, editRecord.fields.katze.match(/([a-f0-9]{24})$/i)?.[1] ?? '')
            : undefined,
        } : undefined}
        kundenverwaltungList={kundenverwaltung}
        katzenverwaltungList={katzenverwaltung}
        zusatzleistungenList={zusatzleistungen}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungsverwaltung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Buchung löschen"
        description={`Buchung von ${deleteTarget?.kundeName} wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function BuchungsZeile({
  buchung, today, onEdit, onDelete, onSelect, isSelected,
}: {
  buchung: EnrichedBuchungsverwaltung;
  today: Date;
  onEdit: (b: EnrichedBuchungsverwaltung) => void;
  onDelete: (b: EnrichedBuchungsverwaltung) => void;
  onSelect: (b: EnrichedBuchungsverwaltung) => void;
  isSelected: boolean;
}) {
  const status = getStatusBadge(buchung, today);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
      onClick={() => onSelect(buchung)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{buchung.katzeName || '—'}</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {buchung.kundeName}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatDate(buchung.fields.anreisedatum)} – {formatDate(buchung.fields.abreisedatum)}
          </span>
          {buchung.fields.box_nummer && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{buchung.fields.box_nummer}</span>
          )}
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.color}`}>{status.label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={e => { e.stopPropagation(); onEdit(buchung); }}
          title="Bearbeiten"
        >
          <IconPencil size={14} />
        </button>
        <button
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          onClick={e => { e.stopPropagation(); onDelete(buchung); }}
          title="Löschen"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
