import { Module } from '@nestjs/common';
import { AlmacenUsuarios, AlmacenUsuariosMemoria } from '../almacen/almacen-usuarios';
import { AlmacenUsuariosHibrido } from '../almacen/almacen-usuarios-prisma';
import { KeysService } from '../crypto/keys.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    KeysService,
    AuthService,
    AlmacenUsuariosMemoria,
    AlmacenUsuariosHibrido,
    {
      provide: AlmacenUsuarios,
      useClass: AlmacenUsuariosHibrido,
    },
  ],
  exports: [AuthService, KeysService, AlmacenUsuarios],
})
export class AuthModule {}
