import type { Buchungsverwaltung, Kundenverwaltung, Katzenverwaltung, Zusatzleistungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BuchungsverwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Buchungsverwaltung | null;
  onEdit: (record: Buchungsverwaltung) => void;
  kundenverwaltungList: Kundenverwaltung[];
  katzenverwaltungList: Katzenverwaltung[];
  zusatzleistungenList: Zusatzleistungen[];
}

export function BuchungsverwaltungViewDialog({ open, onClose, record, onEdit, kundenverwaltungList, katzenverwaltungList, zusatzleistungenList }: BuchungsverwaltungViewDialogProps) {
  function getKundenverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenverwaltungList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getKatzenverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return katzenverwaltungList.find(r => r.record_id === id)?.fields.rasse ?? '—';
  }

  function getZusatzleistungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return zusatzleistungenList.find(r => r.record_id === id)?.fields.leistung_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buchungsverwaltung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenverwaltungDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Katze</Label>
            <p className="text-sm">{getKatzenverwaltungDisplayName(record.fields.katze)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anreisedatum</Label>
            <p className="text-sm">{formatDate(record.fields.anreisedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abreisedatum</Label>
            <p className="text-sm">{formatDate(record.fields.abreisedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Box-/Zimmernummer</Label>
            <p className="text-sm">{record.fields.box_nummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zusatzleistungen</Label>
            <p className="text-sm">{getZusatzleistungenDisplayName(record.fields.zusatzleistungen_buchung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtpreis (€)</Label>
            <p className="text-sm">{record.fields.gesamtpreis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zur Buchung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_buchung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}