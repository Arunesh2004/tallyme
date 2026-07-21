import { DomainEvent } from './EventContracts';

export interface UserAuthenticatedEvent extends DomainEvent {
  eventType: 'UserAuthenticated';
  payload: {
    userId: string;
    organizationId: string;
    ipAddress: string;
  };
}

export interface RoleAssignedEvent extends DomainEvent {
  eventType: 'RoleAssigned';
  payload: {
    userId: string;
    roleId: string;
    assignedBy: string;
  };
}

export interface PermissionGrantedEvent extends DomainEvent {
  eventType: 'PermissionGranted';
  payload: {
    roleId: string;
    permission: string;
  };
}

export interface OrganizationCreatedEvent extends DomainEvent {
  eventType: 'OrganizationCreated';
  payload: {
    name: string;
    gstin?: string;
  };
}
