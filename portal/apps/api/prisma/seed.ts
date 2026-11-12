import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  ACTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  MODULES,
  ROLE_LABELS,
  ROLES,
  permissionKey,
  type ActionName,
  type ModuleId,
  type RoleName,
} from "@portal/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Semeando permissões...");
  const allActions = Object.values(ACTIONS) as ActionName[];
  const allModules = Object.values(MODULES) as ModuleId[];
  for (const module of allModules) {
    for (const action of allActions) {
      const key = permissionKey(module, action);
      await prisma.permission.upsert({
        where: { key },
        create: { key, module, action },
        update: {},
      });
    }
  }

  console.log("→ Semeando perfis e vínculos de permissão...");
  for (const roleName of Object.values(ROLES) as RoleName[]) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, description: ROLE_LABELS[roleName] },
      update: { description: ROLE_LABELS[roleName] },
    });

    const keys = DEFAULT_ROLE_PERMISSIONS[roleName];
    const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  console.log("→ Semeando base inicial (Rio Preto)...");
  const base = await prisma.base.upsert({
    where: { code: "RP" },
    create: { name: "S. José do Rio Preto", code: "RP" },
    update: {},
  });

  console.log("→ Semeando usuário administrador...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@portal.local";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrador";
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.ADMIN } });

  const existing = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPass, 10),
        baseId: base.id,
        userRoles: { create: { roleId: adminRole.id } },
      },
    });
    console.log(`  ✓ Admin criado: ${adminEmail} / senha: ${adminPass}`);
  } else {
    console.log("  • Admin já existe, mantido.");
  }

  console.log("✅ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
