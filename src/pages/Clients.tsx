
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { collection, addDoc, Timestamp, query, where, onSnapshot, updateDoc, doc, getDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ClientForm from '../components/ClientForm';
import SignatureForm from '../components/SignatureForm';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomSnackbar from '../components/CustomSnackbar';
import type { ClientModel } from '../models/ClientModel';
import ClientCard from '../components/ClientCard';
import { functionsApi } from '../services/functionsApi';
import type { SignatureModel } from '../models/SignatureModel';
import { createRegistro } from '../services/registro';


const Clients: React.FC = () => {
  const { user } = useAuth();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSignatureFormOpen, setSignatureFormOpen] = useState(false);
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientToEdit, setClientToEdit] = useState<ClientModel>({} as ClientModel);
  const [clientForSignature, setClientForSignature] = useState<ClientModel | null>(null);
  const [asaasToken, setAsaasToken] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  

  const filteredClients = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return clients;
    }

    const term = searchTerm.toLowerCase().trim();
    return clients.filter(client => {
      const searchableFields = [
        client.company,
        client.name,
        client.cityName,
        client.cpfCnpj,
        client.email,
        client.mobilePhone
      ];

      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(term)
      );
    });
  }, [clients, searchTerm]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    handleCloseConfirmDialog();
  };

  useEffect(() => {
    const fetchAsaasTokenFromSettings = async () => {
      if (!user) {
        return;
      }

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

    fetchAsaasTokenFromSettings();
  }, [user]);


  // No futuro, aqui listaremos os clientes
  // const [clients, setClients] = useState<ClientModel[]>([]);

  const handleOpenForm = () => {
    setClientToEdit({} as ClientModel);
    setFormOpen(true);
  };

  const handleClientEdit = (clientItem: ClientModel) => {
    setClientToEdit(clientItem);
    setFormOpen(true);
  }

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  const handleSave = async (clientData: Omit<ClientModel, 'id' | 'userId' | 'createdAt'>, id?: string) => {
    if (!user) {
      showSnackbar('Você precisa estar logado para cadastrar um cliente.', 'error');
      return;
    }

    // Remover campos undefined antes de salvar no Firestore
    const cleanData = Object.fromEntries(
      Object.entries(clientData).filter(([_, value]) => value !== undefined)
    );

    // Por enquanto, apenas adicionando novos clientes
    if (!id) {
        try {
            await addDoc(collection(db, 'clients'), {
                ...cleanData,
                userId: user.uid,
                createdAt: Timestamp.now(),
                asaasIsRegistered: false,
            });
            console.log("Cliente salvo com sucesso!");
            showSnackbar('Cliente salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar cliente: ", error);
            showSnackbar('Ocorreu um erro ao salvar o cliente.', 'error');
        }
    } else {
      try {
        await updateDoc(doc(db, "clients", id), cleanData);
        console.log("Cliente atualizado com sucesso!");
        showSnackbar('Cliente atualizado com sucesso!', 'success');
      } catch (error) {
        console.error("Erro ao atualizar cliente: ", error);
        showSnackbar('Ocorreu um erro ao atualizar o cliente.', 'error');
      }
    }
  };

  useEffect(() => {
    // Garante que a busca só ocorra se houver um usuário logado.
    if (!user) {
      return;
    }

    // Cria uma consulta (query) para a coleção 'clients', filtrando
    // os documentos pelo 'userId' do usuário que está logado.
    const q = query(collection(db, "clients"), where("userId", "==", user.uid));

    // A função onSnapshot estabelece uma escuta em tempo real com o Firestore.
    // Ela será executada uma vez com os dados iniciais e, depois, toda vez que
    // os dados que correspondem à consulta forem alterados.
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      // Mapeia os documentos retornados para um array no formato do seu ClientModel,
      // garantindo que o ID do documento seja incluído.
      const clientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClientModel)); // Usamos 'as Client' para garantir a tipagem correta.
      
      // Atualiza o estado local com os dados dos clientes.
      setClients(clientsData);
    }, (error) => {
      // Captura e exibe qualquer erro que ocorra ao buscar os dados.
      console.error("Erro ao buscar clientes: ", error);
    });

    // A função de limpeza do useEffect. Ela é chamada quando o componente
    // é desmontado, encerrando a escuta do onSnapshot para evitar
    // consumo desnecessário de recursos.
    return () => unsubscribe();
  }, [user]); // O array de dependências com 'user' garante que o useEffect


  // função que cria o cliente no asaas e atualiza o firestore
  const handleCreateClientInAsaas = async (clientItem: ClientModel): Promise<string | null> => {
    if (!user) {
      showSnackbar('Você precisa estar logado para cadastrar um cliente.', 'error');
      return null;
    }

    const newAsaasClient = {
      name: clientItem.name,
      cpfCnpj: clientItem.cpfCnpj,
      email: clientItem.email,
      mobilePhone: clientItem.mobilePhone,
      address: clientItem.address,
      addressNumber: clientItem.addressNumber,
      complement: clientItem.complement,
      province: clientItem.province,
      postalCode: clientItem.postalCode,
      externalReference: clientItem.externalReference,
    }

    // cadastrar o cliente no asaas
    const response = await functionsApi.post('/asaas/customers', newAsaasClient, {
      params: { asaasToken: asaasToken }
    });

    // console.log('Resposta da criação do cliente no Asaas:', response.data);

    // return '0';

    if (!response.status || response.status !== 200) {
      // console.error("Erro ao criar cliente no Asaas:", response.statusText);
      showSnackbar('Ocorreu um erro ao criar o cliente no Asaas.', 'error');
      return null;
    }

    const data = await response.data;
    // console.log("Cliente criado no Asaas com sucesso:", data);
    return data.id; // Retorna o ID do cliente criado no Asaas
  }


  const handleTaggleActive = async (clientItem: ClientModel) => {
    if (!user) {
      showSnackbar('Você precisa estar logado para cadastrar um cliente.', 'error');
      return;
    }

    const asaasIsRegistered = clientItem.asaasIsRegistered || false;

    // cadastrar o cliente no asaas se não tiver o asaasId
    if (!asaasIsRegistered) {
      const newAsaasClientId = await handleCreateClientInAsaas(clientItem);

      if (!newAsaasClientId) {
        return;
      }
      // atualizar o cliente no firestore com o asaasId
      await handleSave({
        ...clientItem,
        asaasIsRegistered: true,
        asaasId: newAsaasClientId,
      },
      clientItem.id);
      return;
    } else {
      // excluir o cliente do asaas
      try {
        const response = await functionsApi.delete(`/asaas/customers/${clientItem.asaasId}`, {
          params: { asaasToken: asaasToken }
        });

        if (response.status !== 200) {
          console.error("Erro ao deletar cliente no Asaas:", response.statusText);
          showSnackbar('Ocorreu um erro ao deletar o cliente no Asaas.', 'error');
          return;
        }
        showSnackbar('Cliente desativado com sucesso!', 'success');

        // atualizar o cliente no firestore removendo o asaasId
        await handleSave({
          ...clientItem,
          asaasIsRegistered: false,
          asaasId: '',
        },
        clientItem.id);
        return;
      } catch (error) {
        console.error('Erro ao excluir cliente do Asaas:', error);
        showSnackbar('Erro ao excluir cliente do Asaas.', 'error');
      }
    }    
  }

  const handleAddSignature = (client: ClientModel) => {
    setClientForSignature(client);
    setSignatureFormOpen(true);
  };

  const handleEditSignature = (client: ClientModel) => {
    setClientForSignature(client);
    setSignatureFormOpen(true);
  };

  const handleDeleteSignature = (client: ClientModel) => {
    showConfirmDialog(
      'Excluir Assinatura',
      'Deseja realmente excluir esta assinatura?',
      async () => {
        try {
      // TODO: Implementar chamada à API Asaas para deletar assinatura
      const response = await functionsApi.delete(`/asaas/subscriptions/${client.signature?.id}`, {
        params: { asaasToken: asaasToken }
      });

      if (response.status !== 200) {
        console.error("Erro ao deletar assinatura no Asaas:", response.statusText);
        showSnackbar('Ocorreu um erro ao deletar a assinatura no Asaas.', 'error');
        return;
      }

      // Atualizar Firestore removendo a assinatura do cliente
      await updateDoc(doc(db, "clients", client.id), {
        signature: deleteField(),
      });
      showSnackbar('Assinatura excluída com sucesso!', 'success');
        } catch (error) {
          console.error('Erro ao excluir assinatura:', error);
          showSnackbar('Erro ao excluir assinatura.', 'error');
        }
      }
    );
  };

  const handleSyncSignature = async (client: ClientModel) => {
    if (!client.asaasId) {
      showSnackbar('Cliente não possui Asaas ID.', 'error');
      return;
    }

    try {
      const response = await functionsApi.get('/asaas/subscriptions', {
        params: { 
          asaasToken: asaasToken,
          customer: client.asaasId,
        }
      });

      if (response.status !== 200) {
        console.error("Erro ao buscar assinaturas no Asaas:", response.statusText);
        showSnackbar('Ocorreu um erro ao buscar assinaturas no Asaas.', 'error');
        return;
      }

      const subscriptions = response.data.data;
      if (subscriptions.length === 0) {
        showSnackbar('Nenhuma assinatura encontrada para este cliente no Asaas.', 'info');
        return;
      }

      const subscription = subscriptions[0];

      // Atualizar Firestore com os dados da assinatura
      await updateDoc(doc(db, "clients", client.id), {
        signature: {...subscription,
          nextDueDate: subscription.nextDueDate ? new Date(subscription.nextDueDate) : null,
        },
      });

      // Criar/atualizar licença na API externa (Registro)
      try {
        // Calcular validade: 1 mês após o nextDueDate
        const nextDueDate = subscription.nextDueDate;
        const validadeDate = nextDueDate ? new Date(nextDueDate) : new Date();
        validadeDate.setMonth(validadeDate.getMonth() + 1);
        
        const validade = validadeDate.toISOString().slice(0, 10); // YYYY-MM-DD
        
        await createRegistro({
          id: client.asaasId,
          validade,
        });
        
        console.log(`Licença criada/atualizada para cliente ${client.asaasId} com validade ${validade}`);
      } catch (registroError) {
        console.error('Erro ao criar licença no Registro:', registroError);
        // Não bloqueia o fluxo se falhar a criação da licença
      }

      showSnackbar('Assinatura sincronizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao sincronizar assinatura:', error);
      showSnackbar('Erro ao sincronizar assinatura.', 'error');
    }
  }

  const handleSaveSignature = async (signatureData: Partial<SignatureModel>) => {
    if (!clientForSignature || !asaasToken) {
      showSnackbar('Cliente ou token não disponível.', 'error');
      return;
    }

    try {
      // Verifica se é edição (tem ID) ou criação (não tem ID)
      const isEditing = !!signatureData.id;
      
      // Formatar nextDueDate para o formato YYYY-MM-DD esperado pela API Asaas
      const formatDateForAsaas = (date: any): string => {
        let dateObj: Date;
        
        if (date instanceof Date) {
          dateObj = date;
        } else if (date?.toDate && typeof date.toDate === 'function') {
          // Firestore Timestamp
          dateObj = date.toDate();
        } else if (typeof date === 'string') {
          dateObj = new Date(date);
        } else {
          dateObj = new Date();
        }
        
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Preparar dados para enviar à API com a data formatada
      const dataToSend = {
        ...signatureData,
        nextDueDate: formatDateForAsaas(signatureData.nextDueDate),
        updatePendingPayments: true, // Para atualizar pagamentos pendentes ao editar
      };

      let response;

      if (isEditing) {
        // PUT - Atualizar assinatura existente
        response = await functionsApi.put(`/asaas/subscriptions/${signatureData.id}`, dataToSend, {
          params: { asaasToken: asaasToken }
        });
        
        if (response.status === 200) {
          console.log('Assinatura atualizada no Asaas:', response.data);
          
          // Atualizar Firestore com dados da assinatura
          await handleSave({
            ...clientForSignature,
            signature: {
              ...signatureData,
              id: response.data.id,
            } as SignatureModel,
          }, clientForSignature.id);
          
          showSnackbar('Assinatura atualizada com sucesso!', 'success');
          setSignatureFormOpen(false);
        }
      } else {
        // POST - Criar nova assinatura
        response = await functionsApi.post('/asaas/subscriptions', dataToSend, {
          params: { asaasToken: asaasToken }
        });

        if (response.status === 200 || response.status === 201) {
          console.log('Assinatura criada no Asaas:', response.data);
          
          // Atualizar Firestore com dados da assinatura incluindo o ID do Asaas
          await handleSave({
            ...clientForSignature,
            signature: {
              ...signatureData,
              id: response.data.id,
            } as SignatureModel,
          }, clientForSignature.id);
          
          showSnackbar('Assinatura criada com sucesso!', 'success');
          setSignatureFormOpen(false);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      showSnackbar('Erro ao salvar assinatura.', 'error');
    }
  };
  
  return (
    <Container sx={{ mt: 1, position: 'relative' }}>
      <Box sx={{ display: 'flex', mb: 2, mt: 2, alignItems: 'center' }}>
        <Typography variant="h6" component="h6">
          {`Meus Clientes ${asaasToken ? '' : '(Token Asaas não configurado)'}`}
        </Typography>
        <IconButton onClick={handleOpenForm} size="large" sx={{ position: 'absolute', right: 12, backgroundColor: 'green' }} aria-label='Add new client'>
          <Add sx={{ color: 'white'}}/>
        </IconButton>
      </Box>

      <TextField
        fullWidth
        placeholder="Pesquisar por empresa, nome, cidade, CPF/CNPJ, email ou telefone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {filteredClients.length > 0 ? (
        filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onEdit={handleClientEdit}
            onToggleActive={handleTaggleActive}
            onAddSignature={handleAddSignature}
            onSyncSignature={handleSyncSignature}
            onEditSignature={handleEditSignature}
            onDeleteSignature={handleDeleteSignature}
          />
        ))
      ) : (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          {clients.length === 0 
            ? 'Nenhum cliente cadastrado ainda.' 
            : `Nenhum resultado encontrado para "${searchTerm}".`
          }
        </Typography>
      )}
      <ClientForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        clientToEdit={clientToEdit}
      />
      <SignatureForm
        open={isSignatureFormOpen}
        onClose={() => setSignatureFormOpen(false)}
        onSave={handleSaveSignature}
        customerId={clientForSignature?.asaasId || ''}
        signatureToEdit={clientForSignature?.signature}
      />

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={handleCloseConfirmDialog}
      />

    </Container>
  );
};

export default Clients;
