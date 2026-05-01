
import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Chip, Box, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Sync } from '@mui/icons-material';
import type { ClientModel } from '../models/ClientModel';
import { BillingType } from '../models/SignatureModel';

interface ClientCardProps {
  client: ClientModel;
  onEdit: (client: ClientModel) => void;
  onToggleActive: (client: ClientModel) => void;
  onAddSignature?: (client: ClientModel) => void;
  onSyncSignature?: (client: ClientModel) => void;
  onEditSignature?: (client: ClientModel) => void;
  onDeleteSignature?: (client: ClientModel) => void;
}

// Vamos assumir que o objeto client pode ter esses campos, mesmo que não estejam no modelo formal.
// Isso facilita a conexão posterior.
// type ClientWithStatus = ClientModel & { active?: boolean; billingRegistered?: boolean };

const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onToggleActive, onAddSignature, onSyncSignature, onEditSignature, onDeleteSignature }) => {
  const typedClient = client as ClientModel;

  
  return (
    <Card sx={{ mb: 2, flex: 1, position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', position: 'relative', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" component="div">
              {typedClient.name}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {typedClient.email}
            </Typography>
            <Typography variant="caption">
              CPF/CNPJ: {typedClient.cpfCnpj}
            </Typography>
            <Typography variant="caption">
              ASAAS ID: {typedClient.asaasId || 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, position: 'absolute', top: 0, right: 0 }}>
            <Chip
              label={(typedClient.asaasIsRegistered  === false) ? 'Off' : 'On'}
              color={typedClient.asaasIsRegistered === false ? 'error' : 'success'}
              size="small"
            />
          </Box>
        </Box>
        
        {typedClient.signature?.customer ? (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
              Informações da Assinatura
            </Typography>
            <Typography variant="caption" component="div">
              Tipo de Cobrança: {typedClient.signature.billingType === BillingType.BOLETO ? 'Boleto' : 
                                  typedClient.signature.billingType === BillingType.CREDIT_CARD ? 'Cartão de Crédito' : 
                                  typedClient.signature.billingType === BillingType.PIX ? 'PIX' : 
                                  'Não definido'}
            </Typography>
            <Typography variant="caption" component="div">
              Valor: R$ {typedClient.signature.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" component="div">
              Primeiro Vencimento: {typedClient.signature.nextDueDate instanceof Date 
                ? typedClient.signature.nextDueDate.toLocaleDateString('pt-BR')
                : (typedClient.signature.nextDueDate as any)?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
            </Typography>
            <Typography variant="caption" component="div" sx={{ mb: 1.5 }}>
              Dia de Vencimento: {typedClient.signature.nextDueDate instanceof Date 
                ? typedClient.signature.nextDueDate.getDate()
                : (typedClient.signature.nextDueDate as any)?.toDate?.()?.getDate() || 'N/A'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                size="small" 
                variant="contained" 
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => onEditSignature?.(typedClient)}
                sx={{ minWidth: 100, borderRadius: 2 }}
              >
                Editar
              </Button>
              <Button 
                size="small" 
                variant="contained" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => onDeleteSignature?.(typedClient)}
                sx={{ minWidth: 100, borderRadius: 2 }}
              >
                Excluir
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" component="div" color="text.secondary">
              Nenhuma assinatura ativa
            </Typography>
            <IconButton size="small" aria-label="sincronizar assinatura" sx={{ p: 2, backgroundColor: 'green' }} onClick={() => onSyncSignature?.(typedClient)}>
              <Sync sx={{ fontSize: 16, color: 'white' }} />
            </IconButton>
            <IconButton size="small" aria-label="adicionar assinatura" sx={{ p: 2, backgroundColor: 'green' }} onClick={() => onAddSignature?.(typedClient)}>
              <AddIcon sx={{ fontSize: 16, color: 'white' }} />
            </IconButton>
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => onEdit(typedClient)} variant='outlined'>Editar</Button>
        <Button size="small" 
          color={typedClient.asaasIsRegistered === false ? 'success' : 'warning'} 
          onClick={() => onToggleActive(typedClient)} 
          variant='outlined'
          sx={{borderColord: typedClient.asaasIsRegistered === false ? 'green' : 'orange', minWidth: '90px'}}
        >
          {typedClient.asaasIsRegistered === false ? 'Ativar' : 'Desativar'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ClientCard;
