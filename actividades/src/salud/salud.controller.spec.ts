import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SaludController } from './salud.controller';

describe('SaludController', () => {
  let controller: SaludController;

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      controllers: [SaludController],
      providers: [
        {
          provide: PrismaService,
          useValue: { estado: () => 'no-configurada' },
        },
      ],
    }).compile();

    controller = modulo.get(SaludController);
  });

  it('responde sin datos de conexión', () => {
    expect(controller.salud()).toEqual({
      estado: 'ok',
      baseDatos: 'no-configurada',
    });
  });
});
