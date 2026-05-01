
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress } from '@mui/material';
import { People, AttachMoney, MoneyOff } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState({
    activeClients: 0,
    openCharges: 0,
    overdueCharges: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const activeClients = clientsSnapshot.docs.length;

        // Fetch charges
        const chargesSnapshot = await getDocs(collection(db, 'payments'));
        let openCharges = 0;
        let overdueCharges = 0;

        chargesSnapshot.forEach((doc) => {
          const charge = doc.data();
          if (charge.status === 'PENDING') {
            openCharges += charge.value;
          } else if (charge.status === 'OVERDUE') {
            overdueCharges += charge.value;
          }
        });

        setDashboardData({ activeClients, openCharges, overdueCharges });
      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 2.5, backgroundColor: '#4caf50', color: 'white', borderRadius: 3, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.5, mr: 2 }}>
              <People sx={{ fontSize: 36 }} />
            </Box>
            <CardContent sx={{ p: '0 !important' }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Clientes Ativos
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {dashboardData.activeClients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 2.5, backgroundColor: '#ff9800', color: 'white', borderRadius: 3, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.5, mr: 2 }}>
              <AttachMoney sx={{ fontSize: 36 }} />
            </Box>
            <CardContent sx={{ p: '0 !important' }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Cobranças em Aberto
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {dashboardData.openCharges.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 2.5, backgroundColor: '#f44336', color: 'white', borderRadius: 3, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.5, mr: 2 }}>
              <MoneyOff sx={{ fontSize: 36 }} />
            </Box>
            <CardContent sx={{ p: '0 !important' }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Cobranças Vencidas
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {dashboardData.overdueCharges.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
