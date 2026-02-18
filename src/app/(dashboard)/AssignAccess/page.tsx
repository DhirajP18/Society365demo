"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Role, ModuleWithMenus } from "@/types/role-menu"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function RoleMenuMappingPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [modules, setModules] = useState<ModuleWithMenus[]>([])
  const [loading, setLoading] = useState(false)

  /* Load Roles */
  useEffect(() => {
    api.get("/RoleMaster/GetAll")
      .then(res => setRoles(res.data.result ?? []))
      .catch(() => toast.error("Failed to load roles"))
  }, [])

  /* Load Modules + Menus by Role */
  useEffect(() => {
    if (!selectedRole) {
      setModules([])
      return
    }

    api
      .get(`/RoleMenuMapping/GetModulesWithMenusByRole/${selectedRole}`)
      .then(res => setModules(res.data.result ?? []))
      .catch(() => toast.error("Failed to load modules & menus"))
  }, [selectedRole])

  /* Toggle permission */
  const togglePermission = (
    moduleId: number,
    menuId: number,
    field: "canView" | "canAdd" | "canEdit" | "canDelete",
    value: boolean
  ) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? {
              ...module,
              menus: module.menus.map(menu =>
                menu.menuId === menuId
                  ? { ...menu, [field]: value }
                  : menu
              ),
            }
          : module
      )
    )
  }

  /* Save permissions */
  const savePermissions = async () => {
    if (!selectedRole) {
      toast.error("Please select role")
      return
    }

    const payload = {
      roleId: selectedRole,
      menus: modules.flatMap(m =>
        m.menus.map(menu => ({
          moduleId: m.id,
          menuId: menu.menuId,
          menuKey: menu.menuKey,
          canView: menu.canView,
          canAdd: menu.canAdd,
          canEdit: menu.canEdit,
          canDelete: menu.canDelete,
        }))
      ),
    }

    setLoading(true)
    try {
      await api.post("/RoleMenuMapping/SaveRoleMenus", payload)
      toast.success("Permissions saved successfully")
    } catch {
      toast.error("Save failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Menu Mapping</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Role Dropdown */}
        <Select
          value={selectedRole ? String(selectedRole) : ""}
          onValueChange={v => setSelectedRole(Number(v))}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem
                key={role.roleId}
                value={String(role.roleId)}
              >
                {role.roleName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Modules & Menus */}
        {modules.map(module => (
          <div key={module.id} className="border rounded-md">
            <div className="bg-muted px-4 py-2 font-semibold">
              {module.name}
            </div>

            {module.menus.map(menu => (
              <div
                key={menu.menuId}
                className="grid grid-cols-6 items-center px-4 py-3 border-t"
              >
                <div className="col-span-2 font-medium">
                  {menu.menuName}
                </div>

                <PermissionSwitch
                  label="View"
                  value={menu.canView}
                  onChange={v =>
                    togglePermission(module.id, menu.menuId, "canView", v)
                  }
                />

                <PermissionSwitch
                  label="Add"
                  value={menu.canAdd}
                  onChange={v =>
                    togglePermission(module.id, menu.menuId, "canAdd", v)
                  }
                />

                <PermissionSwitch
                  label="Edit"
                  value={menu.canEdit}
                  onChange={v =>
                    togglePermission(module.id, menu.menuId, "canEdit", v)
                  }
                />

                <PermissionSwitch
                  label="Delete"
                  value={menu.canDelete}
                  onChange={v =>
                    togglePermission(module.id, menu.menuId, "canDelete", v)
                  }
                />
              </div>
            ))}
          </div>
        ))}

        {modules.length > 0 && (
          <Button onClick={savePermissions} disabled={loading}>
            {loading ? "Saving..." : "Save Permissions"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/* Permission Switch */
function PermissionSwitch({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
