
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import type { AccountModel } from '../models/AccountModel';

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (account: Omit<AccountModel, 'id' | 'userId' | 'createdAt'>, id?: string) => Promise<void>;
  accountToEdit?: AccountModel | null;
}

const AccountForm: React.FC<AccountFormProps> = ({ open, onClose, onSave, accountToEdit }) => {
  const [client, setClient] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (accountToEdit) {
      setClient(accountToEdit.client);
      setValue(accountToEdit.value);
      // A data precisa ser convertida de Timestamp para Dayjs
      setDueDate(accountToEdit.dueDate ? dayjs(accountToEdit.dueDate) : null);
    } else {
      // Resetar o formulário quando não estiver em modo de edição
      setClient('');
      setValue('');
      setDueDate(null);
    }
  }, [accountToEdit, open]);

  const handleSave = async () => {
    if (!client || value === '' || !dueDate) {
      alert('Por favor, preencha todos os campos.'); // Simples validação
      return;
    }
    await onSave({ client, value: Number(value), dueDate: dueDate.toDate() }, accountToEdit?.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{accountToEdit ? 'Editar Conta' : 'Adicionar Nova Conta'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField
              label="Cliente"
              fullWidth
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Valor (R$)"
              type="number"
              fullWidth
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || '')}
            />
          </Grid>
          <Grid size={12}>
            <DatePicker
              label="Data de Vencimento"
              value={dueDate}
              onChange={(newValue) => setDueDate(newValue)}
              sx={{ width: '100%' }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// É necessário importar dayjs para a conversão no useEffect
import dayjs from 'dayjs';

export default AccountForm;
