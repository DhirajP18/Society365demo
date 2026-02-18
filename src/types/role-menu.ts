export interface Role {
  roleId: number
  roleName: string
}

/* Menu permission */
export interface MenuPermission {
  menuId: number
  menuName: string
  menuKey: string
  canView: boolean
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
}

/* Module with menus */
export interface ModuleWithMenus {
  id: number
  name: string
  icon?: string
  menus: MenuPermission[]
}
