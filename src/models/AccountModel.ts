

export interface AccountModel {
  id: string; // O ID do documento do Firestore
  userId: string;
  client: string;
  value: number;
  dueDate: Date;
  createdAt: Date;
  status?: 'paid' | 'pending'; // Opcional por enquanto
}
