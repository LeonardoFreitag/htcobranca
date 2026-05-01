import type { SignatureModel } from './SignatureModel';

export interface ClientModel {
  id: string;
  userId: string;
  createdAt: Date;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  city?: number;
  cityName?: string;
  state?: string;
  country?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
  groupName?: string;
  company?: string;
  foreignCustomer?: boolean;
  asaasIsRegistered: boolean;
  asaasId?: string;
  signature?: SignatureModel;
}
