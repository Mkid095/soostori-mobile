// DEPRECATED — re-export shim for backward compatibility.
// The canonical customer implementation lives in ./db-customers.ts.
// All new code should import from db-customers directly.
// The Client type in types.ts is structurally identical to Customer;
// these wrappers cast results to Client for legacy callers.

import type { Client, Sale } from '../lib/types'
import {
  searchCustomers as _searchCustomers,
  getAllCustomers as _getAllCustomers,
  getCustomerById as _getCustomerById,
  createCustomer as _createCustomer,
  updateCustomer as _updateCustomer,
  deactivateCustomer as _deactivateCustomer,
  getCustomerPurchaseHistory as _getCustomerPurchaseHistory,
} from './db-customers'

export async function getClients(): Promise<Client[]> {
  return (await _getAllCustomers()) as unknown as Client[]
}

export async function searchClients(query: string): Promise<Client[]> {
  return (await _searchCustomers(query)) as unknown as Client[]
}

export async function getClientById(id: string): Promise<Client | null> {
  return (await _getCustomerById(id)) as unknown as Client | null
}

export async function createClient(data: {
  name: string
  phone?: string
  idNumber?: string
}): Promise<Client> {
  return (await _createCustomer(data)) as unknown as Client
}

export async function updateClient(
  id: string,
  data: { name?: string; phone?: string; idNumber?: string }
): Promise<Client | null> {
  return (await _updateCustomer(id, data)) as unknown as Client | null
}

export async function deleteClient(id: string): Promise<void> {
  return _deactivateCustomer(id)
}

export async function getClientPurchaseHistory(
  customerIdNumber: string
): Promise<Sale[]> {
  return _getCustomerPurchaseHistory(customerIdNumber)
}
