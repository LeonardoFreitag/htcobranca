
import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import { Search, Sync } from '@mui/icons-material';
import { functionsApi } from '../services/functionsApi';
import type { PaymentModel, PaymentStatus } from '../models/PaymentModel';
import type { ClientModel } from '../models/ClientModel';

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const PaymentSkeleton: React.FC = () => (
  <Card sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'divider' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="45%" height={32} />
          <Skeleton variant="text" width="65%" height={20} />
          <Skeleton variant="text" width="55%" height={20} />
        </Box>
        <Skeleton variant="rounded" width={76} height={24} sx={{ borderRadius: 8 }} />
      </Box>
      <Skeleton variant="text" width="48%" height={18} />
      <Skeleton variant="text" width="42%" height={18} />
    </CardContent>
  </Card>
);

interface SummaryCardProps {
  label: string;
  value: number;
  count: number;
  borderColor: string;
  valueColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, count, borderColor, valueColor }) => (
  <Card sx={{ flex: 1, borderTop: '3px solid', borderColor, borderRadius: 2, minWidth: 0 }}>
    <CardContent sx={{ p: '10px !important' }}>
      <Typography variant="caption" color="text.secondary" display="block" noWrap>
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={700} sx={{ color: valueColor, display: 'block', fontSize: '0.72rem' }}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        {count} {count === 1 ? 'item' : 'itens'}
      </Typography>
    </CardContent>
  </Card>
);

const getCardBorderColor = (status: PaymentStatus): string => {
  switch (status) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return '#4caf50';
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return '#ff9800';
    case 'OVERDUE':
      return '#f44336';
    default:
      return '#e0e0e0';
  }
};

const AccountsReceivable: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asaasToken, setAsaasToken] = useState<string>('');
  const [clients, setClients] = useState<ClientModel[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'received'>('all');
  const [dueMonth, setDueMonth] = useState<string>('');
  const [dueYear, setDueYear] = useState<string>('');

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
          if (data.tokenAsaas) setAsaasToken(data.tokenAsaas);
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
        const clientsQuery = query(collection(db, "clients"), where("userId", "==", user.uid));
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
          params: { asaasToken, limit: 100 }
        });
        if (response.status === 200) {
          const paymentsData: PaymentModel[] = response.data.data || [];
          const paymentsWithClients: PaymentModel[] = paymentsData.map(payment => ({
            ...payment,
            clientDetail: clients.find(client => client.asaasId === payment.customer) || null
          }));
          paymentsWithClients.sort((a, b) => {
            const ad = a.dueDate || '';
            const bd = b.dueDate || '';
            return ad < bd ? -1 : ad === bd ? 0 : 1;
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

  const refetchPayments = async () => {
    try {
      const response = await functionsApi.get('/asaas/payments', { params: { asaasToken, limit: 100 } });
      if (response.status === 200) {
        const paymentsData: PaymentModel[] = response.data.data || [];
        const paymentsWithClients: PaymentModel[] = paymentsData.map(payment => ({
          ...payment,
          clientDetail: clients.find(client => client.asaasId === payment.customer) || null
        }));
        paymentsWithClients.sort((a, b) => (a.dueDate || '') < (b.dueDate || '') ? -1 : (a.dueDate === b.dueDate ? 0 : 1));
        setPayments(paymentsWithClients);
      }
    } catch (err) {
      console.error('Erro ao atualizar lista de pagamentos após sync:', err);
    }
  };

  const handleVerifyOpenTitles = async () => {
    if (!asaasToken) { openSnackbar('Token Asaas não configurado.', 'error'); return; }
    setSyncLoading(true);
    try {
      const response = await functionsApi.get('/dev/verify-open-titles', { params: { asaasToken } });
      if (response.status === 200) {
        const { total, success, failed } = response.data;
        openSnackbar(`Verificação concluída. Total: ${total}, sucesso: ${success}, falhas: ${failed}.`, 'success');
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
    if (!asaasToken) { openSnackbar('Token Asaas não configurado.', 'error'); return; }
    setSyncLoading(true);
    try {
      const response = await functionsApi.get('/dev/sync-store-with-asaas', { params: { asaasToken } });
      if (response.status === 200) {
        const { checked, updated } = response.data;
        openSnackbar(`Sincronização concluída. Checados: ${checked}, atualizados: ${updated}.`, 'success');
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

  const handleFullSync = async () => {
    if (!asaasToken) { openSnackbar('Token Asaas não configurado.', 'error'); return; }
    setSyncLoading(true);
    try {
      await handleVerifyOpenTitles();
      await handleSyncStoreWithAsaas();
    } finally {
      setSyncLoading(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    payments.forEach(p => { if (p.dueDate) years.add(p.dueDate.split('-')[0]); });
    return Array.from(years).sort().reverse();
  }, [payments]);

  const summaryTotals = useMemo(() => {
    const pending = { value: 0, count: 0 };
    const overdue = { value: 0, count: 0 };
    const received = { value: 0, count: 0 };
    payments.forEach(p => {
      if (p.status === 'PENDING' || p.status === 'AWAITING_RISK_ANALYSIS') {
        pending.value += p.value; pending.count++;
      } else if (p.status === 'OVERDUE') {
        overdue.value += p.value; overdue.count++;
      } else if (p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH') {
        received.value += p.value; received.count++;
      }
    });
    return { pending, overdue, received };
  }, [payments]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'RECEIVED': case 'CONFIRMED': case 'RECEIVED_IN_CASH': return 'success';
      case 'PENDING': case 'AWAITING_RISK_ANALYSIS': return 'warning';
      case 'OVERDUE': return 'error';
      case 'REFUNDED': case 'REFUND_REQUESTED': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'RECEIVED': return 'Recebido';
      case 'PENDING': return 'Pendente';
      case 'CONFIRMED': return 'Confirmado';
      case 'OVERDUE': return 'Vencido';
      case 'REFUNDED': return 'Reembolsado';
      case 'RECEIVED_IN_CASH': return 'Rec. em Dinheiro';
      case 'REFUND_REQUESTED': return 'Reembolso Solicitado';
      case 'REFUND_IN_PROGRESS': return 'Reembolso em Andamento';
      case 'CHARGEBACK_REQUESTED': return 'Chargeback Solicitado';
      case 'CHARGEBACK_DISPUTE': return 'Disputa de Chargeback';
      case 'AWAITING_CHARGEBACK_REVERSAL': return 'Aguardando Reversão';
      case 'DUNNING_REQUESTED': return 'Cobrança Solicitada';
      case 'DUNNING_RECEIVED': return 'Cobrança Recebida';
      case 'AWAITING_RISK_ANALYSIS': return 'Aguardando Análise';
      default: return status;
    }
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (statusFilter) {
          case 'pending': return p.status === 'PENDING' || p.status === 'AWAITING_RISK_ANALYSIS';
          case 'overdue': return p.status === 'OVERDUE';
          case 'received': return p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH';
          default: return true;
        }
      });
    }

    if (dueMonth || dueYear) {
      filtered = filtered.filter(p => {
        if (!p.dueDate) return false;
        const [year, month] = p.dueDate.split('-');
        if (dueYear && year !== dueYear) return false;
        if (dueMonth && month !== dueMonth) return false;
        return true;
      });
    }

    if (statusFilter === 'received') {
      filtered = filtered.slice().sort((a, b) => {
        const ad = a.paymentDate || '';
        const bd = b.paymentDate || '';
        return ad < bd ? 1 : ad === bd ? 0 : -1;
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(p => {
        const c = p.clientDetail;
        if (!c) return false;
        return [c.name, c.cpfCnpj, c.cityName || ''].some(f => f && f.toLowerCase().includes(term));
      });
    }

    return filtered;
  }, [payments, searchTerm, statusFilter, dueMonth, dueYear]);

  const filteredTotal = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + (p.value || 0), 0),
    [filteredPayments]
  );

  return (
    <>
      <Container sx={{ mt: 1, pb: 3, position: 'relative', minHeight: '80vh' }}>
        {/* Header */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Typography variant="h6" gutterBottom>Contas a Receber</Typography>
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

        {/* Skeleton loading */}
        {loading && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {[1, 2, 3].map(i => (
                <Box key={i} sx={{ flex: 1 }}>
                  <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
                </Box>
              ))}
            </Box>
            <Skeleton variant="rounded" height={36} sx={{ mb: 2, borderRadius: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Skeleton variant="rounded" height={40} sx={{ flex: 1, borderRadius: 1 }} />
              <Skeleton variant="rounded" height={40} sx={{ flex: 1, borderRadius: 1 }} />
            </Box>
            <Skeleton variant="rounded" height={40} sx={{ mb: 2, borderRadius: 1 }} />
            <PaymentSkeleton />
            <PaymentSkeleton />
            <PaymentSkeleton />
          </>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {!loading && !error && (
          <>
            {/* Cards de resumo */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <SummaryCard
                label="A Receber"
                value={summaryTotals.pending.value}
                count={summaryTotals.pending.count}
                borderColor="#ff9800"
                valueColor="#e65100"
              />
              <SummaryCard
                label="Vencido"
                value={summaryTotals.overdue.value}
                count={summaryTotals.overdue.count}
                borderColor="#f44336"
                valueColor="#c62828"
              />
              <SummaryCard
                label="Recebido"
                value={summaryTotals.received.value}
                count={summaryTotals.received.count}
                borderColor="#4caf50"
                valueColor="#2e7d32"
              />
            </Box>

            {/* Filtros de status */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {([
                { key: 'all', label: 'Todas' },
                { key: 'pending', label: 'A Receber' },
                { key: 'overdue', label: 'Vencidas' },
                { key: 'received', label: 'Recebidas' },
              ] as const).map(({ key, label }) => (
                <Chip
                  key={key}
                  label={label}
                  onClick={() => setStatusFilter(key)}
                  color={statusFilter === key ? (key === 'overdue' ? 'error' : key === 'received' ? 'success' : 'primary') : 'default'}
                  variant={statusFilter === key ? 'filled' : 'outlined'}
                />
              ))}
            </Box>

            {/* Filtro mês + ano */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Mês</InputLabel>
                <Select value={dueMonth} onChange={e => setDueMonth(e.target.value)} label="Mês">
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {MONTHS.map(m => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Ano</InputLabel>
                <Select value={dueYear} onChange={e => setDueYear(e.target.value)} label="Ano">
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {availableYears.map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Campo de busca */}
            <TextField
              fullWidth
              size="small"
              placeholder="Pesquisar por nome, CPF/CNPJ ou cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
            />

            {/* Resumo dos itens filtrados */}
            {filteredPayments.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {filteredPayments.length} {filteredPayments.length === 1 ? 'cobrança' : 'cobranças'} · {formatCurrency(filteredTotal)}
              </Typography>
            )}

            {/* Lista de pagamentos */}
            {filteredPayments.length > 0 ? (
              <Box>
                {filteredPayments.map((payment) => (
                  <Card
                    key={payment.id}
                    sx={{
                      mb: 2,
                      borderLeft: '4px solid',
                      borderColor: getCardBorderColor(payment.status),
                      position: 'relative',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            {formatCurrency(payment.value)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {payment.description || 'Sem descrição'}
                          </Typography>
                          {payment.clientDetail && (
                            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }} noWrap>
                              {payment.clientDetail.name}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={getStatusLabel(payment.status)}
                          color={getStatusColor(payment.status)}
                          size="small"
                          sx={{ flexShrink: 0 }}
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
                  {asaasToken
                    ? (searchTerm ? `Nenhuma cobrança encontrada para "${searchTerm}".` : 'Nenhuma cobrança encontrada.')
                    : 'Configure o token Asaas nas configurações.'}
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
