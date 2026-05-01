import { functionsApi } from './functionsApi';

export interface RegistroPayload {
  id: string;
  validade: string; // formato esperado pela API externa (YYYY-MM-DD)
}

export interface RegistroValidadeResponse {
  // Estrutura flexível; adapte se a API retornar um shape específico
  validade?: string;
  [key: string]: any;
}

export async function createRegistro(payload: RegistroPayload) {
  const { data } = await functionsApi.post('/registro', payload);
  return data as any;
}

export async function updateRegistro(payload: RegistroPayload) {
  const { data } = await functionsApi.patch('/registro', payload);
  return data as any;
}

export async function getValidade(id: string) {
  const { data } = await functionsApi.get<RegistroValidadeResponse>('/registro', {
    params: { id },
  });
  return data;
}
