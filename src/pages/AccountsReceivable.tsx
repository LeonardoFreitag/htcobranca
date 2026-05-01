
import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Container,
  TextField,
  InputAdornment,
  Snackbar,
  Alert as MuiAlert,
  IconButton,
} from '@mui/material';
import { Search, Sync } from '@mui/icons-material';
import { functionsApi } from '../services/functionsApi';
import type { PaymentModel, PaymentStatus } from '../models/PaymentModel';
import type { ClientModel } from '../models/ClientModel';

const AccountsReceivable: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asaasToken, setAsaasToken] = useState<string>('');
  const [clients, setClients] = useState<ClientModel[]>([]);

  // Campo único de busca (name, cpfCnpj, cityName)
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'received'>('all');

  // Filtro por mês/ano de vencimento (formato YYYY-MM)
  const [dueMonthFilter, setDueMonthFilter] = useState<string>('');

  // Sync states
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [syncSeverity, setSyncSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

  const openSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSyncMessage(message);
    setSyncSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  useEffect(() => {
    const fetchAsaasToken = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, "settings", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.tokenAsaas) {
            setAsaasToken(data.tokenAsaas);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar token Asaas: ", error);
      }
    };

    fetchAsaasToken();
  }, [user]);

  useEffect(() => {
    const fetchClientsFromFirestore = async () => {
      if (!user) return;

      try {
        const clientsQuery = query(
          collection(db, "clients"),
          where("userId", "==", user.uid)
        );
        
        const querySnapshot = await getDocs(clientsQuery);
        const clientsList: ClientModel[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as ClientModel;
          data.id = doc.id;
          clientsList.push(data);
        });
        setClients(clientsList);
      } catch (error) {
        console.error("Erro ao buscar clientes do Firestore: ", error);
      }
    };

    fetchClientsFromFirestore();
  }, [user]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user || !asaasToken || clients.length === 0) return;

      try {
        setLoading(true);
        const response = await functionsApi.get('/asaas/payments', {
          params: { 
            asaasToken: asaasToken,
            limit: 100
          }
        });

        if (response.status === 200) {
          const paymentsData: PaymentModel[] = response.data.data || [];
          
          // Adicionar clientDetail a cada payment
          const paymentsWithClients: PaymentModel[] = paymentsData.map(payment => {
            const clientDetail = clients.find(client => client.asaasId === payment.customer);
            return {
              ...payment,
              clientDetail: clientDetail || null
            };
          });

          // Ordenar por dueDate (YYYY-MM-DD) crescente
          paymentsWithClients.sort((a, b) => {
            const ad = a.dueDate || '';
            const bd = b.dueDate || '';
            if (ad === bd) return 0;
            return ad < bd ? -1 : 1; // formato ISO permite comparação lexicográfica
          });

          setPayments(paymentsWithClients);
        }
        setLoading(false);
      } catch (err) {
        console.error("Erro ao buscar pagamentos: ", err);
        setError("Não foi possível carregar os dados. Tente novamente mais tarde.");
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, asaasToken, clients]);

  // Handlers de sincronização
  const handleVerifyOpenTitles = async () => {
    if (!asaasToken) {
      openSnackbar('Token Asaas não configurado.', 'error');
      return;
    }
    setSyncLoading(true);
    try {
      const response = await functionsApi.get('/dev/verify-open-titles', { params: { asaasToken } });
      if (response.status === 200) {
        // Endpoint /dev/verify-open-titles retorna resultado de performOpenTitlesSync: { total, success, failed }
        const { total, success, failed } = response.data;
        openSnackbar(`Verificação concluída. Total: ${total}, sucesso: ${success}, falhas: ${failed}.`, 'success');
        // Refetch payments após atualização
        await refetchPayments();
      } else {
        openSnackbar('Falha na verificação de títulos.', 'error');
      }
    } catch (err) {
      console.error('Erro na verificação de títulos:', err);
      openSnackbar('Erro na verificação de títulos.', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncStoreWithAsaas = async () => {
    if (!asaasToken) {
      openSnackbar('Token Asaas não configurado.', 'error');
      return;
    }
    setSyncLoading(true);
    try {
      const response = await functionsApi.get('/dev/sync-store-with-asaas', { params: { asaasToken } });
      if (response.status === 200) {
        const { checked, updated } = response.data;
        openSnackbar(`Sincronização concluída. Checados: ${checked}, atualizados: ${updated}.`, 'success');
        // Refetch payments após sincronização
        await refetchPayments();
      } else {
        openSnackbar('Falha na sincronização com Asaas.', 'error');
      }
    } catch (err) {
      console.error('Erro na sincronização com Asaas:', err);
      openSnackbar('Erro na sincronização com Asaas.', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  // Handler único que chama as duas sincronizações em sequência
  const handleFullSync = async () => {
    if (!asaasToken) {
      openSnackbar('Token Asaas não configurado.', 'error');
      return;
    }
    setSyncLoading(true);
    try {
      await handleVerifyOpenTitles();
      await handleSyncStoreWithAsaas();
    } finally {
      setSyncLoading(false);
    }
  };

  // Função reutilizável para refetch de payments
  const refetchPayments = async () => {
    try {
      const response = await functionsApi.get('/asaas/payments', { params: { asaasToken, limit: 100 } });
      if (response.status === 200) {
        const paymentsData: PaymentModel[] = response.data.data || [];
        const paymentsWithClients: PaymentModel[] = paymentsData.map(payment => {
          const clientDetail = clients.find(client => client.asaasId === payment.customer);
          return { ...payment, clientDetail: clientDetail || null };
        });
        paymentsWithClients.sort((a, b) => (a.dueDate || '') < (b.dueDate || '') ? -1 : (a.dueDate === b.dueDate ? 0 : 1));
        setPayments(paymentsWithClients);
      }
    } catch (err) {
      console.error('Erro ao atualizar lista de pagamentos após sync:', err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Parse da data no formato YYYY-MM-DD sem conversão de timezone
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
      case 'RECEIVED_IN_CASH':
        return 'success';
      case 'PENDING':
      case 'AWAITING_RISK_ANALYSIS':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      case 'REFUNDED':
      case 'REFUND_REQUESTED':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'RECEIVED':
        return 'Recebido';
      case 'PENDING':
        return 'Pendente';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'OVERDUE':
        return 'Vencido';
      case 'REFUNDED':
        return 'Reembolsado';
      case 'RECEIVED_IN_CASH':
        return 'Recebido em Dinheiro';
      case 'REFUND_REQUESTED':
        return 'Reembolso Solicitado';
      case 'REFUND_IN_PROGRESS':
        return 'Reembolso em Andamento';
      case 'CHARGEBACK_REQUESTED':
        return 'Chargeback Solicitado';
      case 'CHARGEBACK_DISPUTE':
        return 'Disputa de Chargeback';
      case 'AWAITING_CHARGEBACK_REVERSAL':
        return 'Aguardando Reversão';
      case 'DUNNING_REQUESTED':
        return 'Cobrança Solicitada';
      case 'DUNNING_RECEIVED':
        return 'Cobrança Recebida';
      case 'AWAITING_RISK_ANALYSIS':
        return 'Aguardando Análise';
      default:
        return status;
    }
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (statusFilter) {
          case 'pending':
            return p.status === 'PENDING' || p.status === 'AWAITING_RISK_ANALYSIS';
          case 'overdue':
            return p.status === 'OVERDUE';
          case 'received':
            return p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH';
          default:
            return true;
        }
      });
    }

    // Apply due date month/year filter (YYYY-MM)
    if (dueMonthFilter) {
      filtered = filtered.filter(p => {
        if (!p.dueDate) return false;
        return p.dueDate.startsWith(dueMonthFilter);
      });
    }

    // Quando filtrando por recebidos, ordenar por data de pagamento (paymentDate) descrescente
    if (statusFilter === 'received') {
      filtered = filtered.slice().sort((a, b) => {
        const ad = a.paymentDate || '';
        const bd = b.paymentDate || '';
        if (ad === bd) return 0;
        // Datas no formato YYYY-MM-DD permitem comparação lexicográfica
        return ad < bd ? 1 : -1; // mais recente primeiro
      });
    }

    // Apply search filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(p => {
        const c = p.clientDetail;
        if (!c) return false;
        const fields = [c.name, c.cpfCnpj, c.cityName || ''];
        return fields.some(f => f && f.toLowerCase().includes(term));
      });
    }

    return filtered;
  }, [payments, searchTerm, statusFilter, dueMonthFilter]);

  return (
    <>
    <Container sx={{ mt: 1, pb: 3, position: 'relative', minHeight: '80vh' }}>
      <Box sx={{ position: 'relative', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Contas a Receber
        </Typography>
        <IconButton
          aria-label="Sincronizar títulos"
          onClick={handleFullSync}
          disabled={syncLoading || !asaasToken}
          size="small"
          sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'primary.main', color: '#fff', '&:hover': { backgroundColor: 'primary.dark' } }}
        >
          {syncLoading ? <CircularProgress size={18} color="inherit" /> : <Sync fontSize="small" />}
        </IconButton>

      </Box>
      
      {loading && (
        <Box display="flex" justifyContent="center" mt={4} position="absolute" left={0} right={0}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          {/* Botões de filtro por status */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label="Todas"
              onClick={() => setStatusFilter('all')}
              color={statusFilter === 'all' ? 'primary' : 'default'}
              variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            />
            <Chip 
              label="A Receber"
              onClick={() => setStatusFilter('pending')}
              color={statusFilter === 'pending' ? 'primary' : 'default'}
              variant={statusFilter === 'pending' ? 'filled' : 'outlined'}
            />
            <Chip 
              label="Vencidas"
              onClick={() => setStatusFilter('overdue')}
              color={statusFilter === 'overdue' ? 'error' : 'default'}
              variant={statusFilter === 'overdue' ? 'filled' : 'outlined'}
            />
            <Chip 
              label="Recebidas"
              onClick={() => setStatusFilter('received')}
              color={statusFilter === 'received' ? 'success' : 'default'}
              variant={statusFilter === 'received' ? 'filled' : 'outlined'}
            />
          </Box>

          {/* Filtro por mês/ano de vencimento */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Vencimento (mês/ano)"
              type="month"
              size="small"
              value={dueMonthFilter}
              onChange={e => setDueMonthFilter(e.target.value)}
              sx={{ minWidth: 220, width: '100%', minHeight: 40 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {/* Campo único de busca */}
            <TextField
              fullWidth
              size="small"
              placeholder="Pesquisar por nome, CPF/CNPJ ou cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          

          {filteredPayments.length > 0 ? (
            <Box>
              {filteredPayments.map((payment) => (
                <Card 
                  key={payment.id} 
                  sx={{ 
                    mb: 2, 
                    position: 'relative', 
                    flex: 1,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                          {formatCurrency(payment.value)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {payment.description || 'Sem descrição'}
                        </Typography>
                        {payment.clientDetail && (
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {payment.clientDetail.name}
                          </Typography>
                        )}
                      </Box>
                      <Chip 
                        label={getStatusLabel(payment.status)} 
                        color={getStatusColor(payment.status)}
                        size="small"
                        sx={{ position: 'absolute', top: 4, right: 4}}
                      />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Vencimento: {formatDate(payment.dueDate)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Criado em: {formatDate(payment.dateCreated)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body1" color="text.secondary">
                {asaasToken ? (searchTerm ? `Nenhuma cobrança encontrada para "${searchTerm}".` : 'Nenhuma cobrança encontrada.') : 'Configure o token Asaas nas configurações.'}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert elevation={6} variant="filled" onClose={handleCloseSnackbar} severity={syncSeverity}>
          {syncMessage}
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default AccountsReceivable;
