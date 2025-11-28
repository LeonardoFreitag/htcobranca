
import { createTheme } from '@mui/material/styles';
import { purple, red } from '@mui/material/colors';

// Cria uma instância do tema para a aplicação
export const theme = createTheme({
  palette: {
    primary: {
      main: purple[700], // Um roxo forte e moderno
    },
    secondary: {
      main: purple[300], // Um tom mais claro de roxo para elementos secundários
    },
    error: {
      main: red.A400, // Cor para mensagens de erro
    },
    background: {
      default: '#f4f5f7', // Um cinza muito claro para o fundo geral
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600, // Títulos mais fortes
    },
  },
  components: {
    // Estilização padrão para os botões
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Botões com cantos mais arredondados
          textTransform: 'none', // Evita que o texto do botão fique em maiúsculas
        },
        containedPrimary: {
          color: '#fff', // Texto branco para botões primários
        },
      },
    },
    // Estilização para os cards
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Cards com cantos mais arredondados
          boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', // Sombra sutil
        },
      },
    },
  },
});
