
import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Container, Grid, List, ListItem, ListItemText } from '@mui/material';
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AsaasClientModel } from '../models/AsaasClientModel';
import type { ClientModel } from '../models/ClientModel';
import type { User } from 'firebase/auth';
import { api } from '../services/axios';


interface SettingsData {
  finePercentage: number;
  interestPercentage: number;
  daysToStartInterest: number;
  tokenAsaas: string;
}

interface AsaasClientListResponse {
  object: 'list';
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: AsaasClientModel[];
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({
    finePercentage: 0,
    interestPercentage: 0,
    daysToStartInterest: 0,
    tokenAsaas: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [asaasClients, setAsaasClients] = useState<AsaasClientModel[]>([]);
  const [firestoreClients, setFirestoreClients] = useState<ClientModel[]>([]);


  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SettingsData);
        }
      } catch (err) {
        setError('Ocorreu um erro ao carregar as configurações.');
        console.error(err);
      }
      setLoadingData(false);
    };

    fetchSettings();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const docRef = doc(db, 'settings', user.uid);
      await setDoc(docRef, settings, { merge: true });
      setSuccess('Configurações salvas com sucesso!');
    } catch (err) {
      setError('Ocorreu um erro ao salvar as configurações.');
      console.error(err);
    }

    setLoading(false);
  };

  const handleLoadAsaasClients = async () => {
    if (!user) {
      setError("Usuário não autenticado.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // const idToken = await user.getIdToken();
      console.log(settings.tokenAsaas);
      const response = await api.get('/customers?limit=10', {
        headers: {
          'accept': 'application/json',
          'access_tokan': settings.tokenAsaas,
        },
      });

      console.log(response.data);

      return response.data;

    } catch (err: any) {
        setError(`Erro ao buscar clientes do Asaas: ${err.message}`);
        console.error(err);
        return []; // Retorna um array vazio em caso de erro
    }
    finally {
      setLoading(false);
    }
  };

  const handleImportClientsFirestore = async () => {
    if (!user) return [];

    try {
        const q = query(collection(db, "clients"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const clients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientModel));
        setFirestoreClients(clients);
        return clients;
    } catch (error) {
        console.error("Erro ao buscar clientes do Firestore: ", error);
        setError("Falha ao carregar clientes do sistema.");
        return [];
    }
  };

  const syncClientsToFirestore = async (
    asaasClients: AsaasClientModel[],
    firestoreClients: ClientModel[],
    user: User
  ): Promise<number> => {
    if (!user) {
      setError("Usuário não autenticado.");
      return 0;
    }

    const existingCpfCnpjs = new Set(firestoreClients.map(client => client.cpfCnpj));
    const clientsToImport = asaasClients.filter(
      asaasClient => asaasClient.cpfCnpj && !existingCpfCnpjs.has(asaasClient.cpfCnpj)
    );

    if (clientsToImport.length === 0) {
      return 0;
    }

    const batch = writeBatch(db);
    clientsToImport.forEach(newClient => {
      const clientData: Omit<ClientModel, 'id'> = {
        userId: user.uid,
        createdAt: new Date(),
        name: newClient.name,
        cpfCnpj: newClient.cpfCnpj,
        email: newClient.email,
        phone: newClient.phone ?? '',
        mobilePhone: newClient.mobilePhone ?? '',
        address: newClient.address ?? '',
        addressNumber: newClient.addressNumber ?? '',
        complement: newClient.complement ?? '',
        province: newClient.province ?? '',
        postalCode: newClient.postalCode,
        city: newClient.city,
        cityName: newClient.cityName,
        state: newClient.state,
        country: newClient.country,
        externalReference: newClient.externalReference ?? '',
        notificationDisabled: newClient.notificationDisabled,
        additionalEmails: newClient.additionalEmails ?? '',
        municipalInscription: newClient.municipalInscription ?? '',
        stateInscription: newClient.stateInscription ?? '',
        observations: newClient.observations ?? '',
        company: newClient.company ?? '',
        asaasIsRegistered: true,
        asaasId: newClient.id,
        signatureValue: 0,
      };
      const newClientRef = doc(collection(db, "clients"));
      batch.set(newClientRef, clientData);
    });

    await batch.commit();
    return clientsToImport.length;
  };


  const handleImportClientsFromSaas = async () => {
    if (!user) {
      setError("Usuário não autenticado.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const clientsFromAsaas = await handleLoadAsaasClients();
      const clientsFromFirestore = await handleImportClientsFirestore();

      if(clientsFromAsaas && clientsFromFirestore) {
        const importedCount = await syncClientsToFirestore(clientsFromAsaas, clientsFromFirestore, user);
        setSuccess(`${importedCount} cliente(s) novo(s) importado(s) com sucesso!`);
        // Opcional: recarregar a lista do firestore para refletir na UI se necessário
        await handleImportClientsFirestore(); 
      }

    } catch (err: any) {
      setError(`Ocorreu um erro durante a importação: ${err.message}`);
      console.error(err);
    }
    finally{
      setLoading(false);
    }
    
  }

  if (loadingData) {
    return <CircularProgress />;
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Configurações
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Token Asaas"
              name="tokenAsaas"
              value={settings.tokenAsaas}
              onChange={handleChange}
              variant="outlined"
              helperText="Seu token de API para integração com Asaas."
            />
          </Grid>
          <Grid size={12} >
            <TextField
              fullWidth
              label="Multa por Atraso (%)"
              name="finePercentage"
              type="number"
              value={settings.finePercentage}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          <Grid size={12} >
            <TextField
              fullWidth
              label="Juros por Atraso (% ao dia)"
              name="interestPercentage"
              type="number"
              value={settings.interestPercentage}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Dias para Iniciar Juros"
              name="daysToStartInterest"
              type="number"
              value={settings.daysToStartInterest}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>

          <Grid size={12}>
            <Box sx={{ position: 'relative', display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                disabled={loading}
                onClick={handleSave}
              >
                Salvar Configurações
              </Button>
              <Button
                variant="outlined"
                onClick={handleImportClientsFromSaas}
                disabled={loading}
              >
                Importar Clientes do Asaas
              </Button>
              {loading && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />}
            </Box>
          </Grid>

          {error && <Grid size={12}><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></Grid>}
          {success && <Grid size={12}><Alert severity="success" sx={{ mt: 2 }}>{success}</Alert></Grid>}
          
          {asaasClients.length > 0 && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mt: 4 }}>Clientes Carregados do Asaas</Typography>
              <List>
                {asaasClients.map(client => (
                  <ListItem key={client.id}>
                    <ListItemText primary={client.name} secondary={client.email} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default Settings;
