
import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Chip, Box, Divider, IconButton, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Sync, Person, Email, Badge, Tag } from '@mui/icons-material';
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

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, minWidth: 0, overflow: 'hidden' }}>
    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</Box>
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
      <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>{label}: </Box>
      {value || 'N/A'}
    </Typography>
  </Box>
);

const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onToggleActive, onAddSignature, onSyncSignature, onEditSignature, onDeleteSignature }) => {
  const isActive = client.asaasIsRegistered !== false;

  const billingTypeLabel = (type?: string) => {
    if (type === BillingType.BOLETO) return 'Boleto';
    if (type === BillingType.CREDIT_CARD) return 'Cartão de Crédito';
    if (type === BillingType.PIX) return 'PIX';
    return 'Não definido';
  };

  const formatDate = (date: unknown): string => {
    if (date instanceof Date) return date.toLocaleDateString('pt-BR');
    const d = date as { toDate?: () => Date };
    return d?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A';
  };

  const getDueDay = (date: unknown): string => {
    if (date instanceof Date) return String(date.getDate());
    const d = date as { toDate?: () => Date };
    return String(d?.toDate?.()?.getDate() || 'N/A');
  };

  return (
    <Card sx={{ mb: 2, borderRadius: 3, boxShadow: 2, border: '1px solid', borderColor: 'divider', width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={client.name}>
            {client.name}
          </Typography>
          {client.company && client.company !== client.name && (
            <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {client.company}
            </Typography>
          )}
        </Box>
        <Chip
          label={isActive ? 'Ativo' : 'Inativo'}
          color={isActive ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }}
        />
      </Box>

      <CardContent sx={{ pt: 0.5, pb: '0 !important' }}>
        {/* Dados do cliente */}
        <Box sx={{ mb: 1.5 }}>
          <InfoRow icon={<Email sx={{ fontSize: 14 }} />} label="Email" value={client.email} />
          <InfoRow icon={<Badge sx={{ fontSize: 14 }} />} label="CPF/CNPJ" value={client.cpfCnpj} />
          {client.asaasId && (
            <InfoRow icon={<Tag sx={{ fontSize: 14 }} />} label="ASAAS ID" value={client.asaasId} />
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Assinatura */}
        {client.signature?.customer ? (
          <Box sx={{ backgroundColor: 'grey.50', borderRadius: 2, p: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="primary" sx={{ display: 'block', mb: 1 }}>
              Assinatura
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Tipo</Typography>
                <Typography variant="caption" fontWeight={600}>{billingTypeLabel(client.signature.billingType)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Valor</Typography>
                <Typography variant="caption" fontWeight={600}>
                  {client.signature.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Primeiro Vcto.</Typography>
                <Typography variant="caption" fontWeight={600}>{formatDate(client.signature.nextDueDate)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Dia Vcto.</Typography>
                <Typography variant="caption" fontWeight={600}>{getDueDay(client.signature.nextDueDate)}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={() => onEditSignature?.(client)}
                sx={{ borderRadius: 2, fontSize: '0.72rem', py: 0.5 }}
              >
                Editar
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                onClick={() => onDeleteSignature?.(client)}
                sx={{ borderRadius: 2, fontSize: '0.72rem', py: 0.5 }}
              >
                Excluir
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ backgroundColor: 'grey.50', borderRadius: 2, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Nenhuma assinatura ativa
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Sincronizar assinatura do Asaas">
                <IconButton size="small" sx={{ backgroundColor: 'info.main', '&:hover': { backgroundColor: 'info.dark' } }} onClick={() => onSyncSignature?.(client)}>
                  <Sync sx={{ fontSize: 16, color: 'white' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar assinatura">
                <IconButton size="small" sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' } }} onClick={() => onAddSignature?.(client)}>
                  <AddIcon sx={{ fontSize: 16, color: 'white' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5, pt: 1, gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Person sx={{ fontSize: 14 }} />}
          onClick={() => onEdit(client)}
          sx={{ borderRadius: 2, fontSize: '0.72rem' }}
        >
          Editar Cliente
        </Button>
        <Button
          size="small"
          variant={isActive ? 'outlined' : 'contained'}
          color={isActive ? 'warning' : 'success'}
          onClick={() => onToggleActive(client)}
          sx={{ borderRadius: 2, fontSize: '0.72rem', minWidth: 80 }}
        >
          {isActive ? 'Desativar' : 'Ativar'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ClientCard;
