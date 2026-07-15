import { gatewayRequest } from './gateway-client';
import type { OrganizationDto, Paginated } from '@/types/api';

export interface Organization {
  id: string;
  name: string;
  grn?: string;
  role?: string;
  createdAt?: string;
}

function mapOrganization(dto: OrganizationDto): Organization {
  return {
    id: dto.org_id,
    name: dto.display_name ?? dto.name ?? 'Organization',
    grn: dto.grn,
    role: dto.role,
    createdAt: dto.created_at ?? undefined,
  };
}

export async function listMyOrganizations(): Promise<Organization[]> {
  const res = await gatewayRequest<Paginated<OrganizationDto>>('/organizations');
  return (res.items ?? []).map(mapOrganization);
}

export async function getOrganization(orgId: string): Promise<Organization> {
  const dto = await gatewayRequest<OrganizationDto>(
    `/organizations/${encodeURIComponent(orgId)}`,
  );
  return mapOrganization(dto);
}
