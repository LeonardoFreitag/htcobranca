import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import { BillingType, Cycle } from '../models/SignatureModel';
import type { SignatureModel } from '../models/SignatureModel';

interface SignatureFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (signature: Partial<SignatureModel>) => void;
  customerId: string;
  signatureToEdit?: SignatureModel | null;
}

const SignatureForm: React.FC<SignatureFormProps> = ({
  open,
  onClose,
  onSave,
  customerId,
  signatureToEdit,
}) => {
  const getInitialFormData = (): Partial<SignatureModel> => {
    if (signatureToEdit) {
      return signatureToEdit;
    }
    return {
      customer: customerId,
      billingType: BillingType.BOLETO,
      cycle: Cycle.MONTHLY,
      value: 0,
      nextDueDate: new Date(),
      interest: { value: 0 },
      fine: { value: 0, type: 'PERCENTAGE' },
      description: '',
    };
  };

  const [formData, setFormData] = useState<Partial<SignatureModel>>(getInitialFormData);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: 'interest' | 'fine', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent] as any), [field]: value },
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  // const formatDateForInput = (date: Date | undefined) => {
  //   if (!date) return '';
  //   const d = new Date(date);
  //   const year = d.getFullYear();
  //   const month = String(d.getMonth() + 1).padStart(2, '0');
  //   const day = String(d.getDate()).padStart(2, '0');
  //   return `${year}-${month}-${day}`;
  // };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      TransitionProps={{
        onEnter: () => setFormData(getInitialFormData())
      }}
    >
      <DialogTitle>
        {signatureToEdit ? 'Editar Assinatura' : 'Nova Assinatura'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            select
            label="Tipo de Cobrança"
            value={formData.billingType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('billingType', e.target.value)}
            fullWidth
          >
            <MenuItem value={BillingType.BOLETO}>Boleto</MenuItem>
            <MenuItem value={BillingType.CREDIT_CARD}>Cartão de Crédito</MenuItem>
            <MenuItem value={BillingType.PIX}>PIX</MenuItem>
          </TextField>

          <TextField
            select
            label="Ciclo de Cobrança"
            value={formData.cycle}
            onChange={(e) => handleChange('cycle', e.target.value)}
            fullWidth
          >
            <MenuItem value={Cycle.WEEKLY}>Semanal</MenuItem>
            <MenuItem value={Cycle.BIWEEKLY}>Quinzenal</MenuItem>
            <MenuItem value={Cycle.MONTHLY}>Mensal</MenuItem>
            <MenuItem value={Cycle.BIMONTHLY}>Bimestral</MenuItem>
            <MenuItem value={Cycle.QUARTERLY}>Trimestral</MenuItem>
            <MenuItem value={Cycle.SEMIANNUALLY}>Semestral</MenuItem>
            <MenuItem value={Cycle.YEARLY}>Anual</MenuItem>
          </TextField>

          <TextField
            label="Valor (R$)"
            type="number"
            value={formData.value}
            onChange={(e) => handleChange('value', parseFloat(e.target.value))}
            fullWidth
            inputProps={{ step: '0.01', min: '0' }}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <DatePicker
              label="Próximo Vencimento"
              value={formData.nextDueDate 
                ? dayjs(formData.nextDueDate instanceof Date 
                    ? formData.nextDueDate 
                    : (formData.nextDueDate as any)?.toDate?.() || formData.nextDueDate)
                : null}
              onChange={(newValue: Dayjs | null) => handleChange('nextDueDate', newValue ? newValue.toDate() : new Date())}
              slotProps={{ textField: { fullWidth: true } }}
              format="DD/MM/YYYY"
            />
          </LocalizationProvider>

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Juros
          </Typography>
          <TextField
            label="Valor dos Juros (%)"
            type="number"
            value={formData.interest?.value}
            onChange={(e) => handleNestedChange('interest', 'value', parseFloat(e.target.value))}
            fullWidth
            // inputProps={{ step: '0.01', min: '0' }}
          />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Multa
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Valor da Multa"
              type="number"
              value={formData.fine?.value}
              onChange={(e) => handleNestedChange('fine', 'value', parseFloat(e.target.value))}
              fullWidth
            //   inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              select
              label="Tipo"
              value={formData.fine?.type || 'PERCENTAGE'}
              onChange={(e) => handleNestedChange('fine', 'type', e.target.value)}
              fullWidth
            >
              <MenuItem value="PERCENTAGE">Percentual</MenuItem>
              <MenuItem value="FIXED">Fixo</MenuItem>
            </TextField>
          </Box>

          <TextField
            label="Descrição"
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignatureForm;
