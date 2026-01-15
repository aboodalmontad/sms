
export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  source: 'phone' | 'manual' | 'cloud';
}

export interface Group {
  id: string;
  name: string;
  contacts: Contact[];
  createdAt: number;
}

export interface SendStatus {
  contactName: string;
  phoneNumber: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export type View = 'home' | 'groups' | 'create-group' | 'history';
