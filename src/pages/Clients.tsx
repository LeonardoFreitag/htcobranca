
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  IconButton
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { collection, addDoc, Timestamp, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ClientForm from '../components/ClientForm';
import type { ClientModel } from '../models/ClientModel';
import ClientCard from '../components/ClientCard';


const Clients: React.FC = () => {
  const { user } = useAuth();
  const [isFormOpen, setFormOpen] = useState(false);
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [clientToEdit, setClientToEdit] = useState<ClientModel>({} as ClientModel);


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
      alert("Você precisa estar logado para cadastrar um cliente.");
      return;
    }

    // Por enquanto, apenas adicionando novos clientes
    if (!id) {
        try {
            await addDoc(collection(db, 'clients'), {
                ...clientData,
                userId: user.uid,
                createdAt: Timestamp.now(),
            });
            console.log("Cliente salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar cliente: ", error);
            alert("Ocorreu um erro ao salvar o cliente. Verifique o console para mais detalhes.");
        }
    } else {
      try {
        await updateDoc(doc(db, "clients", id), {
          ...clientData,
        });
        console.log("Cliente atualizado com sucesso!");
      } catch (error) {
        console.error("Erro ao atualizar cliente: ", error);
        alert("Ocorreu um erro ao atualizar o cliente. Verifique o console para mais detalhes.");
      }
    }
  };

  useEffect(() => {
    // Garante que a busca só ocorra se houver um usuário logado.
    if (!user) {
      setClients([]); // Limpa os clientes se o usuário fizer logout.
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
            // será executado novamente se o objeto 'user' mudar.

  const handleTaggleActive = (clientItem: ClientModel) => {
    if (!user) {
      alert("Você precisa estar logado para cadastrar um cliente.");
      return;
    }

    // cadastrar o cliente no asaas

    // se tudo correu bem cadastrar a assinatura no asaas
    
    // se tudo correu bem, atualizar dados no firestore

    handleSave({
      ...clientItem,
      asaasIsRegistered: !clientItem.asaasIsRegistered,
    },
    clientItem.id);
  }
  
  return (
    <Container sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', mb: 2, alignItems: 'center', position: 'relative' }}>
        <Typography variant="h4" component="h4">
          Meus Clientes
        </Typography>
        <IconButton onClick={handleOpenForm} size="large" sx={{ position: 'absolute', right: 12, backgroundColor: 'green' }} aria-label='Add new client'>
          <Add sx={{ color: 'white'}}/>
        </IconButton>
      </Box>

      {clients.length > 0 ? (
        clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onEdit={handleClientEdit}
            onToggleActive={handleTaggleActive}
          />
        ))
      ) : (
        <Typography>
          Nenhum cliente cadastrado.
        </Typography>
      )}
      <ClientForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        clientToEdit={clientToEdit}
      />

    </Container>
  );
};

export default Clients;
