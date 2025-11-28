
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

// Vamos definir uma interface simples para o Recebível aqui mesmo
interface Receivable {
  id: string;
  clientName: string;
  status: 'pending' | 'paid' | 'overdue';
  // Adicione outros campos relevantes como valor, data de vencimento, etc.
  createdAt: { seconds: number; nanoseconds: number; };
}

const AccountsReceivable: React.FC = () => {
  const { user } = useAuth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const receivablesCollection = collection(db, 'receivables');
    const q = query(receivablesCollection, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Receivable));
      setReceivables(data);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar contas a receber: ", err);
      setError("Não foi possível carregar os dados. Tente novamente mais tarde.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp: { seconds: number; }) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Contas a Receber</Typography>
      
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
         <TableContainer component={Paper}>
         <Table sx={{ minWidth: 650 }} aria-label="simple table">
           <TableHead>
             <TableRow>
               <TableCell>Cliente</TableCell>
               <TableCell align="right">Data de Criação</TableCell>
               <TableCell align="right">Status</TableCell>
             </TableRow>
           </TableHead>
           <TableBody>
             {receivables.length > 0 ? receivables.map((row) => (
               <TableRow
                 key={row.id}
                 sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
               >
                 <TableCell component="th" scope="row">
                   {row.clientName}
                 </TableCell>
                 <TableCell align="right">{formatDate(row.createdAt)}</TableCell>
                 <TableCell align="right">{row.status}</TableCell>
               </TableRow>
             )) : (
                <TableRow>
                    <TableCell colSpan={3} align="center">
                        <Typography>Nenhuma cobrança registrada ainda.</Typography>
                    </TableCell>
                </TableRow>
             )}
           </TableBody>
         </Table>
       </TableContainer>
      )}
    </Box>
  );
};

export default AccountsReceivable;
