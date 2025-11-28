
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
import type { ClientModel } from '../models/ClientModel';


interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (client: ClientModel, id?: string) => Promise<void>;
  clientToEdit?: ClientModel | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ open, onClose, onSave, clientToEdit }) => {
  const [formState, setFormState] = useState<Partial<ClientModel>>({
    name: '',
    cpfCnpj: '',
    email: '',
    phone: '',
    mobilePhone: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '',
    postalCode: '',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    foreignCustomer: false,
    asaasIsRegistered: false,
    asaasId: '',
  });

  useEffect(() => {
    if (clientToEdit && open) {
      setFormState(clientToEdit);
    } else {
      // Reset para o estado inicial quando for um novo cliente
      setFormState({
        name: '',
        cpfCnpj: '',
        email: '',
        phone: '',
        mobilePhone: '',
        address: '',
        addressNumber: '',
        complement: '',
        province: '',
        postalCode: '',
        externalReference: '',
        notificationDisabled: false,
        additionalEmails: '',
        municipalInscription: '',
        stateInscription: '',
        observations: '',
        groupName: '',
        company: '',
        foreignCustomer: false,
        signatureValue: 0,
        asaasIsRegistered: false,
        asaasId: '',    
      });
    }
  }, [clientToEdit, open]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    // Validação simples para os campos mais importantes
    if (!formState.name || !formState.cpfCnpj) {
      alert('Nome/Razão Social e CPF/CNPJ são obrigatórios.');
      return;
    }

    console.log('Formulário enviado:', formState)

    await onSave(formState as ClientModel, clientToEdit?.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{clientToEdit ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField name="name" label="Nome ou Razão Social" value={formState.name} onChange={handleChange} fullWidth required />
          </Grid>
          <Grid size={12}>
            <TextField name="cpfCnpj" label="CPF ou CNPJ" value={formState.cpfCnpj} onChange={handleChange} fullWidth required />
          </Grid>
          <Grid size={12}>
            <TextField name="email" label="Email" type="email" value={formState.email} onChange={handleChange} fullWidth />
          </Grid>
           <Grid size={12}>
            <TextField name="phone" label="Telefone Fixo" value={formState.phone} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField name="mobilePhone" label="Celular" value={formState.mobilePhone} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField name="postalCode" label="CEP" value={formState.postalCode} onChange={handleChange} fullWidth />
          </Grid>
           <Grid size={12}>
            <TextField name="address" label="Endereço" value={formState.address} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12} >
             <TextField name="addressNumber" label="Número" value={formState.addressNumber} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12} >
             <TextField name="complement" label="Complemento" value={formState.complement} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12} >
             <TextField name="province" label="Bairro" value={formState.province} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField name="municipalInscription" label="Inscrição Municipal" value={formState.municipalInscription} onChange={handleChange} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField name="stateInscription" label="Inscrição Estadual" value={formState.stateInscription} onChange={handleChange} fullWidth />
          </Grid>
           <Grid size={12}>
            <TextField name="signatureValue" label="Valor da Assinatura (R$)" type="number" value={formState.signatureValue} onChange={handleChange} fullWidth />
          </Grid>
           <Grid size={12}>
            <TextField name="observations" label="Observações" value={formState.observations} onChange={handleChange} fullWidth multiline rows={3} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientForm;
