
export interface AsaasClientModel {
  object: string;
  id: string;
  dateCreated: string; // ou Date, se for converter
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  province: string | null;
  postalCode: string;
  cpfCnpj: string;
  personType: 'FISICA' | 'JURIDICA'; // Usando um tipo literal para segurança
  deleted: boolean;
  additionalEmails: string | null;
  externalReference: string | null;
  notificationDisabled: boolean;
  observations: string | null;
  municipalInscription: string | null;
  stateInscription: string | null;
  canDelete: boolean;
  cannotBeDeletedReason: string | null;
  canEdit: boolean;
  cannotEditReason: string | null;
  city: number;
  cityName: string;
  state: string;
  country: string;
}

export interface AsaasClientObjectModel {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: 10;
  offset: number;
  data: AsaasClientModel[];
}