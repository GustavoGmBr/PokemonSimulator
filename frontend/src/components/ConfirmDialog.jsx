import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './ui/button';

export function ConfirmDialog({ open, onOpenChange, onConfirm, pending, error, title, description, confirmLabel = 'Confirmar', destructive = false }) {
  return <AlertDialog.Root open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="dialog-overlay" />
      <AlertDialog.Content className="dialog-content">
        <span className="eyebrow">ANTES DE CONTINUAR</span>
        <AlertDialog.Title className="text-2xl font-bold mt-3">{title}</AlertDialog.Title>
        <AlertDialog.Description className="muted mt-3 leading-relaxed">{description}</AlertDialog.Description>
        {error && <p role="alert" className="error-box mt-4">{error.message}</p>}
        <div className="flex justify-end gap-3 mt-7">
          <AlertDialog.Cancel asChild><Button variant="outline" disabled={pending}>Cancelar</Button></AlertDialog.Cancel>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={pending} onClick={onConfirm}>{pending ? 'Salvando…' : confirmLabel}</Button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
