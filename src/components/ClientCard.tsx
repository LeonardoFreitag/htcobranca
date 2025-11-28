
import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Chip, Box } from '@mui/material';
import type { ClientModel } from '../models/ClientModel';

interface ClientCardProps {
  client: ClientModel;
  onEdit: (client: ClientModel) => void;
  onToggleActive: (client: ClientModel) => void;
}

// Vamos assumir que o objeto client pode ter esses campos, mesmo que não estejam no modelo formal.
// Isso facilita a conexão posterior.
type ClientWithStatus = ClientModel & { active?: boolean; billingRegistered?: boolean };

const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onToggleActive }) => {
  const typedClient = client as ClientWithStatus;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex' }}>
          <Box>
            <Typography variant="h6" component="div">
              {typedClient.name}
            </Typography>
            <Typography sx={{ mb: 1.5 }} color="text.secondary">
              {typedClient.email}
            </Typography>
            <Typography variant="body2">
              CPF/CNPJ: {typedClient.cpfCnpj}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Chip
              label={typedClient.asaasIsRegistered === false ? 'Inativo' : 'Ativo'}
              color={typedClient.asaasIsRegistered === false ? 'error' : 'success'}
              size="small"
            />
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'green', textAlign: 'justify', mr: 6}}>
          {Number(typedClient.signatureValue).toLocaleString(
            'pt-BR',
            { style: 'currency', currency: 'BRL' }
          )}
        </Typography>
        <Button size="small" onClick={() => onEdit(typedClient)} variant='outlined'>Editar</Button>
        <Button size="small" 
          color={typedClient.asaasIsRegistered === false ? 'success' : 'warning'} 
          onClick={() => onToggleActive(typedClient)} 
          variant='outlined'
          sx={{borderColord: typedClient.asaasIsRegistered === false ? 'green' : 'orange'}}
        >
          {typedClient.asaasIsRegistered === false ? 'Ativar' : 'Desativar'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ClientCard;
