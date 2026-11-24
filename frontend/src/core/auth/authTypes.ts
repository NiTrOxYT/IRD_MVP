export interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleName?: string;
  roleId?: number;
  propertyId: number;
  permissions?: string[];
}

export interface RoleRecord {
  id: number;
  property_id: number;
  name: string;
  slug: string;
  description: string | null;
  is_builtin: boolean;
  permissions: string[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StaffUserRecord {
  id: number;
  property_id: number;
  username: string;
  full_name: string;
  role: string;
  role_id: number;
  role_name?: string;
  role_slug?: string;
  permissions?: string[];
  is_active: boolean;
  created_at: string;
}
