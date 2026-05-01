
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
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* <Grid size={12}> */}
          <Card sx={{ display: 'flex', alignItems: 'center', p: 2, backgroundColor: '#4caf50', color: 'white', width: '100%' }}>
            <People sx={{ fontSize: 40, mr: 2 }} />
            <CardContent>
              <Typography variant="h6" component="div">
                Clientes Ativos
              </Typography>
              <Typography variant="h4">
                {dashboardData.activeClients}
              </Typography>
            </CardContent>
          </Card>
        {/* </Grid> */}
        {/* <Grid size={12}> */}
          <Card sx={{ display: 'flex', alignItems: 'center', p: 2, backgroundColor: '#ff9800', color: 'white', width: '100%' }}>
            <AttachMoney sx={{ fontSize: 40, mr: 2 }} />
            <CardContent>
              <Typography variant="h6" component="div">
                Cobranças em Aberto
              </Typography>
              <Typography variant="h4">
                {dashboardData.openCharges.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </CardContent>
          </Card>
        {/* </Grid> */}
        {/* <Grid size={12}> */}
          <Card sx={{ display: 'flex', alignItems: 'center', p: 2, backgroundColor: '#f44336', color: 'white', width: '100%' }}>
            <MoneyOff sx={{ fontSize: 40, mr: 2 }} />
            <CardContent>
              <Typography variant="h6" component="div">
                Cobranças Vencidas
              </Typography>
              <Typography variant="h4">
                {dashboardData.overdueCharges.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </CardContent>
          </Card>
        {/* </Grid> */}
      </Grid>
    </Box>
  );
};

export default Dashboard;
