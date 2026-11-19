import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateReservationDto } from './dto/create-reservations.dto';
import { CreateReservationItemDto } from './dto/create-reservation-item.dto';
import { UpdateReservationItemDto } from './dto/update-reservation-item.dto';
import { EventAvailabilityService } from '../event-availability/event-availability.service';

@Injectable()
export class ReservationsService {
  private readonly RESERVATION_DURATION_MINUTES = 15;

  constructor(private readonly prisma: PrismaService,
    private readonly eventAvailabilityService: EventAvailabilityService,

  ) { }

  // ============================================================
  // RESERVATIONS - CONSULTA
  // ============================================================

  async findAllByUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    return this.prisma.reservation.findMany({
      where: { userId },
      include: {
        event: true,
        cart: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
            seat: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    let reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        event: true,
        cart: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
            seat: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('La reserva no existe');
    }

    if (
      reservation.status === 'PENDING' &&
      reservation.expiresAt <= new Date()
    ) {
      await this.expireReservation(id);

      reservation = await this.prisma.reservation.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          event: true,
          cart: true,
          items: {
            include: {
              ticketType: true,
              productVariant: {
                include: {
                  product: true,
                },
              },
              seat: true,
            },
          },
        },
      });
    }

    return reservation;
  }

  // ============================================================
  // CREAR RESERVATION DESDE CART
  // ============================================================

  async create(
    userId: number,
    createReservationDto: CreateReservationDto,
  ) {
    const { eventId, cartId } = createReservationDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        configuration: true,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'El evento no está disponible para realizar reservas',
      );
    }

    if (event.startAt <= new Date()) {
      throw new BadRequestException(
        'No se pueden realizar reservas para un evento que ya inició',
      );
    }

    if (!event.configuration) {
      throw new BadRequestException(
        'El evento no tiene configuración',
      );
    }

    const eventConfiguration = event.configuration;

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    if (cart.userId !== userId) {
      throw new BadRequestException(
        'El carrito no pertenece al usuario autenticado',
      );
    }

    if (cart.eventId !== eventId) {
      throw new BadRequestException(
        'El carrito no pertenece al evento indicado',
      );
    }

    if (cart.status !== 'ACTIVE') {
      throw new BadRequestException(
        'El carrito no está disponible para crear una reserva',
      );
    }

    if (cart.items.length === 0) {
      throw new BadRequestException(
        'No se puede crear una reserva con un carrito vacío',
      );
    }

    const existingReservation = await this.prisma.reservation.findUnique({
      where: { cartId },
    });

    if (existingReservation) {
      throw new BadRequestException(
        'El carrito ya tiene una reserva asociada',
      );
    }

    const expiresAt = new Date(
      Date.now() +
      this.RESERVATION_DURATION_MINUTES * 60 * 1000,
    );

    try {
      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const transactionalCart = await tx.cart.findUnique({
          where: { id: cartId },
          include: {
            items: {
              include: {
                ticketType: true,
                productVariant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        });

        if (!transactionalCart) {
          throw new NotFoundException('El carrito no existe');
        }

        if (transactionalCart.userId !== userId) {
          throw new BadRequestException(
            'El carrito no pertenece al usuario',
          );
        }

        if (transactionalCart.eventId !== eventId) {
          throw new BadRequestException(
            'El carrito no pertenece al evento',
          );
        }

        if (transactionalCart.status !== 'ACTIVE') {
          throw new BadRequestException(
            'El carrito ya no está disponible',
          );
        }

        if (transactionalCart.items.length === 0) {
          throw new BadRequestException(
            'No se puede reservar un carrito vacío',
          );
        }

        const duplicatedReservation =
          await tx.reservation.findUnique({
            where: { cartId },
          });

        if (duplicatedReservation) {
          throw new BadRequestException(
            'El carrito ya tiene una reserva asociada',
          );
        }

        const reservationItems: Array<{
          quantity: number;
          ticketTypeId?: number;
          productVariantId?: number;
        }> = [];

        for (const item of transactionalCart.items) {
          const hasTicketType = item.ticketTypeId !== null;
          const hasProductVariant =
            item.productVariantId !== null;

          /*
           * Un CartItem debe representar exactamente
           * un TicketType o un ProductVariant.
           */
          if (hasTicketType === hasProductVariant) {
            throw new BadRequestException(
              `El CartItem ${item.id} debe tener exactamente un TicketType o un ProductVariant`,
            );
          }

          // ----------------------------------------------------
          // TICKET TYPE
          // ----------------------------------------------------

          if (hasTicketType) {
            const ticketType = item.ticketType;

            if (!ticketType) {
              throw new BadRequestException(
                `El TicketType del CartItem ${item.id} no existe`,
              );
            }

            if (ticketType.eventId !== eventId) {
              throw new BadRequestException(
                'Un TicketType del carrito no pertenece al evento',
              );
            }

            this.validateTicketTypeSaleWindow(
              ticketType,
              event.startAt,
            );

            if (
              eventConfiguration.usesSeats &&
              item.quantity < 1
            ) {
              throw new BadRequestException(
                'La cantidad de entradas debe ser mayor que cero',
              );
            }

            /*
             * La reserva descuenta el inventario del TicketType
             * una sola vez.
             *
             * Si posteriormente se asignan asientos,
             * createItem() tomará unidades de esta reserva.
             */
            const updatedTicketType =
              await tx.ticketType.updateMany({
                where: {
                  id: ticketType.id,
                  status: 'ACTIVE',
                  deletedAt: null,
                  available: {
                    gte: item.quantity,
                  },
                },
                data: {
                  available: {
                    decrement: item.quantity,
                  },
                },
              });

            if (updatedTicketType.count === 0) {
              throw new BadRequestException(
                `No hay suficientes unidades disponibles para el TicketType "${ticketType.name}"`,
              );
            }

            reservationItems.push({
              quantity: item.quantity,
              ticketTypeId: ticketType.id,
            });
          }

          // ----------------------------------------------------
          // PRODUCT VARIANT
          // ----------------------------------------------------

          if (hasProductVariant) {
            const productVariant = item.productVariant;

            if (!productVariant) {
              throw new BadRequestException(
                `La variante del CartItem ${item.id} no existe`,
              );
            }

            if (
              !productVariant.product ||
              productVariant.product.eventId !== eventId
            ) {
              throw new BadRequestException(
                'Una variante de producto del carrito no pertenece al evento',
              );
            }

            if (!productVariant.product.isActive) {
              throw new BadRequestException(
                `El producto "${productVariant.product.name}" no está activo`,
              );
            }

            if (!productVariant.isActive) {
              throw new BadRequestException(
                `La variante "${productVariant.sku}" no está activa`,
              );
            }

            if (!eventConfiguration.usesProducts) {
              throw new BadRequestException(
                'El evento no permite productos',
              );
            }


            const updatedVariant =
              await tx.productVariant.updateMany({
                where: {
                  id: productVariant.id,
                  isActive: true,
                  available: {
                    gte: item.quantity,
                  },
                },
                data: {
                  available: {
                    decrement: item.quantity,
                  },
                },
              });

            if (updatedVariant.count === 0) {
              throw new BadRequestException(
                `No hay suficientes productos disponibles para la variante "${productVariant.sku}"`,
              );
            }

            reservationItems.push({
              quantity: item.quantity,
              productVariantId: productVariant.id,
            });
          }
        }

        const reservation = await tx.reservation.create({
          data: {
            userId,
            eventId,
            cartId,
            status: 'PENDING',
            expiresAt,
            items: {
              create: reservationItems,
            },
          },
        });

        await tx.cart.update({
          where: { id: cartId },
          data: {
            status: 'RESERVED',
          },
        });

        return tx.reservation.findUnique({
          where: { id: reservation.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            event: true,
            cart: true,
            items: {
              include: {
                ticketType: true,
                productVariant: {
                  include: {
                    product: true,
                  },
                },
                seat: true,
              },
            },
          },
        });
      },
      );

      await this.eventAvailabilityService.publishAvailability(eventId);

      return result;

    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          'El carrito ya tiene una reserva asociada',
        );
      }

      throw error;
    }
  }

  // ============================================================
  // CANCELAR RESERVATION
  // ============================================================


  async cancel(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('La reserva no existe');
    }

    if (reservation.status === 'CONFIRMED') {
      throw new BadRequestException(
        'Una reserva confirmada no puede cancelarse',
      );
    }

    if (reservation.status === 'CANCELLED') {
      throw new BadRequestException(
        'La reserva ya está cancelada',
      );
    }

    if (reservation.status === 'EXPIRED') {
      throw new BadRequestException(
        'La reserva ya ha expirado',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        'La reserva no se encuentra pendiente',
      );
    }

    if (reservation.expiresAt <= new Date()) {
      await this.expireReservation(id);

      throw new BadRequestException(
        'La reserva ya ha expirado',
      );
    }

    const result = await this.prisma.$transaction((tx) =>
      this.cancelWithinTransaction(tx, id),
    );

    await this.eventAvailabilityService.publishAvailability(
      reservation.eventId,
    );

    return result;
  }

  async cancelWithinTransaction(
    tx: Prisma.TransactionClient,
    id: number,
  ) {
    const now = new Date();

    const updated = await tx.reservation.updateMany({
      where: {
        id,
        status: 'PENDING',
        expiresAt: { gt: now },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException(
        'La reserva ya no puede cancelarse',
      );
    }

    const reservation = await tx.reservation.findUnique({
      where: { id },
      select: { cartId: true },
    });

    if (!reservation) {
      throw new NotFoundException('La reserva no existe');
    }

    // Libera inventario de TicketType y ProductVariant,
    // además de los asientos asignados.
    await this.releaseReservationItems(tx, id);

    await tx.cart.update({
      where: { id: reservation.cartId },
      data: { status: 'CANCELLED' },
    });

    return tx.reservation.findUnique({
      where: { id },
      include: {
        event: true,
        cart: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: { product: true },
            },
            seat: true,
          },
        },
      },
    });
  }

  // ============================================================
  // CONFIRMAR RESERVATION
  // ============================================================

  /*
   * Este método será utilizado internamente por el flujo:
   *
   * Payment APPROVED
   *       ↓
   * Order PAID
   *       ↓
   * Reservation CONFIRMED
   *       ↓
   * Tickets ACTIVE
   */

  async confirm(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            configuration: true,
          },
        },
        items: {
          include: {
            ticketType: true,
            productVariant: true,
            seat: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('La reserva no existe');
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        'Solo se puede confirmar una reserva pendiente',
      );
    }

    if (reservation.expiresAt <= new Date()) {
      await this.expireReservation(id);

      throw new BadRequestException(
        'La reserva ha expirado',
      );
    }

    /*
     * En eventos con asientos, toda entrada debe tener
     * un asiento antes de confirmar la reserva.
     *
     * Los ProductVariant no requieren asiento.
     */
    if (reservation.event.configuration?.usesSeats) {
      const ticketItemsWithoutSeat =
        reservation.items.filter(
          (item) =>
            item.ticketTypeId !== null &&
            item.seatId === null,
        );

      if (ticketItemsWithoutSeat.length > 0) {
        throw new BadRequestException(
          'No se puede confirmar la reserva porque existen entradas sin asiento asignado',
        );
      }
    }


    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.reservation.updateMany({
          where: {
            id,
            status: 'PENDING',
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            status: 'CONFIRMED',
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException(
            'La reserva ya no puede confirmarse',
          );
        }

        return tx.reservation.findUnique({
          where: { id },
          include: {
            event: true,
            cart: true,
            items: {
              include: {
                ticketType: true,
                productVariant: {
                  include: {
                    product: true,
                  },
                },
                seat: true,
              },
            },
          },
        });
      },
    );

    await this.eventAvailabilityService.publishAvailability(
      reservation.eventId,
    );

    return result;

  }

  // ============================================================
  // EXPIRAR RESERVATION
  // ============================================================


  async expireReservation(id: number) {
    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const reservation = await tx.reservation.findUnique({
          where: { id },
        });

        if (!reservation) {
          throw new NotFoundException(
            'La reserva no existe',
          );
        }

        if (reservation.status !== 'PENDING') {
          return reservation;
        }

        if (reservation.expiresAt > new Date()) {
          return reservation;
        }

        const updated = await tx.reservation.updateMany({
          where: {
            id,
            status: 'PENDING',
          },
          data: {
            status: 'EXPIRED',
          },
        });

        if (updated.count === 0) {
          return tx.reservation.findUnique({
            where: { id },
          });
        }

        await this.releaseReservationItems(tx, id);

        await tx.cart.update({
          where: {
            id: reservation.cartId,
          },
          data: {
            status: 'EXPIRED',
          },
        });

        return tx.reservation.findUnique({
          where: { id },
        });
      },
    );

    if (result?.status === 'EXPIRED') {
      await this.eventAvailabilityService.publishAvailability(
        result.eventId,
      );
    }

    return result;
  }


  // ============================================================
  // RESERVATION ITEMS - CONSULTAR
  // ============================================================

  async findAllItems(reservationId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('La reserva no existe');
    }

    return this.prisma.reservationItem.findMany({
      where: { reservationId },
      include: {
        ticketType: true,
        productVariant: {
          include: {
            product: true,
          },
        },
        seat: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  // ============================================================
  // CREAR RESERVATION ITEM
  // ============================================================

  async createItem(
    reservationId: number,
    createReservationItemDto: CreateReservationItemDto,
  ) {
    const {
      ticketTypeId,
      productVariantId,
      quantity,
      seatId,
    } = createReservationItemDto;

    const hasTicketType = ticketTypeId !== undefined;
    const hasProductVariant = productVariantId !== undefined;
    const hasSeat = seatId !== undefined;

    if (hasTicketType === hasProductVariant) {
      throw new BadRequestException(
        'Debe indicar exactamente un TicketType o un ProductVariant',
      );
    }

    if (quantity < 1) {
      throw new BadRequestException(
        'La cantidad debe ser mayor que cero',
      );
    }

    if (hasProductVariant && hasSeat) {
      throw new BadRequestException(
        'Un ProductVariant no puede tener un asiento',
      );
    }

    if (hasSeat && quantity !== 1) {
      throw new BadRequestException(
        'Una entrada con asiento solo puede reservarse con quantity = 1',
      );
    }

    const reservation =
      await this.getPendingReservation(reservationId);

    let ticketType: {
      id: number;
      name: string;
      eventId: number;
      zoneId: number | null;
      status: string;
      deletedAt: Date | null;
      startSaleAt: Date | null;
      endSaleAt: Date | null;
    } | null = null;

    if (ticketTypeId !== undefined) {
      ticketType = await this.prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
      });

      if (!ticketType) {
        throw new NotFoundException(
          'El TicketType no existe',
        );
      }

      if (ticketType.eventId !== reservation.eventId) {
        throw new BadRequestException(
          'El TicketType no pertenece al evento de la reserva',
        );
      }

      this.validateTicketTypeSaleWindow(
        ticketType,
        reservation.event.startAt,
      );
    }

    if (productVariantId !== undefined) {
      const productVariant =
        await this.prisma.productVariant.findUnique({
          where: { id: productVariantId },
          include: {
            product: true,
          },
        });

      if (!productVariant) {
        throw new NotFoundException(
          'El ProductVariant no existe',
        );
      }

      if (!productVariant.product) {
        throw new BadRequestException(
          'El producto asociado a la variante no existe',
        );
      }

      if (
        productVariant.product.eventId !==
        reservation.eventId
      ) {
        throw new BadRequestException(
          'El ProductVariant no pertenece al evento de la reserva',
        );
      }

      if (!productVariant.product.isActive) {
        throw new BadRequestException(
          'El producto no está activo',
        );
      }

      if (!productVariant.isActive) {
        throw new BadRequestException(
          'El ProductVariant no está activo',
        );
      }

      if (
        !reservation.event.configuration ||
        !reservation.event.configuration.usesProducts
      ) {
        throw new BadRequestException(
          'El evento no permite productos',
        );
      }
    }

    if (seatId !== undefined) {
      if (!ticketTypeId) {
        throw new BadRequestException(
          'Un asiento solo puede asociarse a un TicketType',
        );
      }

      if (
        !reservation.event.configuration ||
        !reservation.event.configuration.usesSeats
      ) {
        throw new BadRequestException(
          'El evento no utiliza asientos',
        );
      }

      const seat = await this.prisma.seat.findUnique({
        where: { id: seatId },
      });

      if (!seat) {
        throw new NotFoundException(
          'El asiento no existe',
        );
      }

      if (seat.eventId !== reservation.eventId) {
        throw new BadRequestException(
          'El asiento no pertenece al evento',
        );
      }

      if (
        ticketType?.zoneId !== null &&
        ticketType?.zoneId !== undefined &&
        seat.zoneId !== ticketType.zoneId
      ) {
        throw new BadRequestException(
          'El asiento no pertenece a la zona del TicketType',
        );
      }

      if (seat.status !== 'AVAILABLE') {
        throw new BadRequestException(
          'El asiento no está disponible',
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      /*
       * Volvemos a comprobar que la reserva siga pendiente
       * antes de modificar inventario o asientos.
       */
      const reservationLock =
        await tx.reservation.updateMany({
          where: {
            id: reservationId,
            status: 'PENDING',
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            updatedAt: new Date(),
          },
        });

      if (reservationLock.count === 0) {
        throw new BadRequestException(
          'La reserva ya no está disponible para modificación',
        );
      }

      // --------------------------------------------------------
      // ASIGNACIÓN DE ASIENTO A INVENTARIO YA RESERVADO
      // --------------------------------------------------------

      if (seatId !== undefined) {
        /*
         * Primero buscamos una unidad NO asignada a asiento
         * del mismo TicketType.
         *
         * Ejemplo:
         *
         * ReservationItem:
         *   VIP quantity=3 seat=null
         *
         * Se asigna A1:
         *
         * ReservationItem:
         *   VIP quantity=2 seat=null
         *   VIP quantity=1 seat=A1
         *
         * No se vuelve a descontar available del TicketType.
         */
        const unassignedItem =
          await tx.reservationItem.findFirst({
            where: {
              reservationId,
              ticketTypeId,
              productVariantId: null,
              seatId: null,
              quantity: {
                gt: 0,
              },
            },
            orderBy: {
              id: 'asc',
            },
          });

        if (!unassignedItem) {
          throw new BadRequestException(
            'No existen entradas disponibles dentro de la reserva para asignar ese asiento',
          );
        }

        const reservedSeat = await tx.seat.updateMany({
          where: {
            id: seatId,
            eventId: reservation.eventId,
            status: 'AVAILABLE',
          },
          data: {
            status: 'RESERVED',
          },
        });

        if (reservedSeat.count === 0) {
          throw new BadRequestException(
            'El asiento ya no está disponible',
          );
        }

        if (unassignedItem.quantity === 1) {
          await tx.reservationItem.update({
            where: {
              id: unassignedItem.id,
            },
            data: {
              seatId,
            },
          });
        } else {
          await tx.reservationItem.update({
            where: {
              id: unassignedItem.id,
            },
            data: {
              quantity: {
                decrement: 1,
              },
            },
          });

          await tx.reservationItem.create({
            data: {
              reservationId,
              ticketTypeId,
              quantity: 1,
              seatId,
            },
          });
        }

        return tx.reservationItem.findFirst({
          where: {
            reservationId,
            ticketTypeId,
            seatId,
          },
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
            seat: true,
          },
        });
      }

      // --------------------------------------------------------
      // NUEVO ITEM SIN ASIENTO
      // --------------------------------------------------------

      if (ticketTypeId !== undefined) {
        const updatedTicketType =
          await tx.ticketType.updateMany({
            where: {
              id: ticketTypeId,
              status: 'ACTIVE',
              deletedAt: null,
              available: {
                gte: quantity,
              },
            },
            data: {
              available: {
                decrement: quantity,
              },
            },
          });

        if (updatedTicketType.count === 0) {
          throw new BadRequestException(
            'No hay suficientes entradas disponibles',
          );
        }
      }

      if (productVariantId !== undefined) {
        const updatedVariant =
          await tx.productVariant.updateMany({
            where: {
              id: productVariantId,
              isActive: true,
              available: {
                gte: quantity,
              },
            },
            data: {
              available: {
                decrement: quantity,
              },
            },
          });

        if (updatedVariant.count === 0) {
          throw new BadRequestException(
            'No hay suficientes productos disponibles',
          );
        }
      }

      return tx.reservationItem.create({
        data: {
          reservationId,
          ticketTypeId,
          productVariantId,
          quantity,
          seatId: null,
        },
        include: {
          ticketType: true,
          productVariant: {
            include: {
              product: true,
            },
          },
          seat: true,
        },
      });
    },
    );


    await this.eventAvailabilityService.publishAvailability(
      reservation.eventId,
    );

    return result;
  }

  // ============================================================
  // ACTUALIZAR RESERVATION ITEM
  // ============================================================

  async updateItem(
    id: number,
    updateReservationItemDto: UpdateReservationItemDto,
  ) {
    const item = await this.prisma.reservationItem.findUnique({
      where: { id },
      include: {
        reservation: {
          include: {
            event: {
              include: {
                configuration: true,
              },
            },
          },
        },
        ticketType: true,
        productVariant: {
          include: {
            product: true,
          },
        },
        seat: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'El ReservationItem no existe',
      );
    }

    const reservation =
      await this.getPendingReservation(
        item.reservationId,
      );

    /*
     * Se utiliza hasOwnProperty para distinguir:
     *
     * seatId omitido -> conservar asiento actual
     * seatId: null    -> quitar asiento
     *
     * Aunque el DTO tenga seatId?: number, class-validator
     * permite null al utilizar @IsOptional().
     */
    const hasQuantity =
      Object.prototype.hasOwnProperty.call(
        updateReservationItemDto,
        'quantity',
      );

    const hasSeatId =
      Object.prototype.hasOwnProperty.call(
        updateReservationItemDto,
        'seatId',
      );

    const newQuantity = hasQuantity
      ? updateReservationItemDto.quantity ?? item.quantity
      : item.quantity;

    const newSeatId = hasSeatId
      ? updateReservationItemDto.seatId ?? null
      : item.seatId;

    if (newQuantity < 1) {
      throw new BadRequestException(
        'La cantidad debe ser mayor que cero',
      );
    }

    /*
     * Un item con asiento representa exactamente una entrada.
     */
    if (newSeatId !== null && newQuantity !== 1) {
      throw new BadRequestException(
        'Una entrada con asiento solo puede tener quantity = 1',
      );
    }

    /*
     * ProductVariant nunca puede utilizar asiento.
     */
    if (
      item.productVariantId !== null &&
      newSeatId !== null
    ) {
      throw new BadRequestException(
        'Un ProductVariant no puede tener un asiento',
      );
    }

    /*
     * No se permite convertir directamente un item de
     * quantity > 1 a un asiento.
     *
     * Para asignar asientos individualmente se utiliza
     * createItem(), que divide correctamente la reserva.
     */
    if (
      item.seatId === null &&
      newSeatId !== null &&
      item.quantity > 1
    ) {
      throw new BadRequestException(
        'Para asignar un asiento a una reserva con varias unidades, primero debe dividirse la cantidad por entradas',
      );
    }

    let newSeat: {
      id: number;
      eventId: number;
      zoneId: number | null;
      status: string;
    } | null = null;

    if (
      newSeatId !== null &&
      newSeatId !== item.seatId
    ) {
      if (
        !reservation.event.configuration ||
        !reservation.event.configuration.usesSeats
      ) {
        throw new BadRequestException(
          'El evento no utiliza asientos',
        );
      }

      newSeat = await this.prisma.seat.findUnique({
        where: { id: newSeatId },
      });

      if (!newSeat) {
        throw new NotFoundException(
          'El nuevo asiento no existe',
        );
      }

      if (
        newSeat.eventId !==
        reservation.eventId
      ) {
        throw new BadRequestException(
          'El nuevo asiento no pertenece al evento',
        );
      }

      if (
        item.ticketType?.zoneId !== null &&
        item.ticketType?.zoneId !== undefined &&
        newSeat.zoneId !== item.ticketType.zoneId
      ) {
        throw new BadRequestException(
          'El nuevo asiento no pertenece a la zona del TicketType',
        );
      }

      if (newSeat.status !== 'AVAILABLE') {
        throw new BadRequestException(
          'El nuevo asiento no está disponible',
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reservationLock =
        await tx.reservation.updateMany({
          where: {
            id: reservation.id,
            status: 'PENDING',
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            updatedAt: new Date(),
          },
        });

      if (reservationLock.count === 0) {
        throw new BadRequestException(
          'La reserva ya no está disponible para modificación',
        );
      }

      const quantityDifference =
        newQuantity - item.quantity;

      // --------------------------------------------------------
      // INVENTARIO
      // --------------------------------------------------------

      /*
       * Si el item tiene asiento, quantity siempre es 1.
       *
       * Por eso el inventario no se modifica cuando solamente
       * se cambia de asiento.
       */

      if (
        item.seatId === null &&
        item.ticketTypeId !== null &&
        quantityDifference !== 0
      ) {
        if (quantityDifference > 0) {
          const increased =
            await tx.ticketType.updateMany({
              where: {
                id: item.ticketTypeId,
                status: 'ACTIVE',
                deletedAt: null,
                available: {
                  gte: quantityDifference,
                },
              },
              data: {
                available: {
                  decrement: quantityDifference,
                },
              },
            });

          if (increased.count === 0) {
            throw new BadRequestException(
              'No hay suficientes entradas disponibles',
            );
          }
        }

        if (quantityDifference < 0) {
          await tx.ticketType.update({
            where: {
              id: item.ticketTypeId,
            },
            data: {
              available: {
                increment: Math.abs(quantityDifference),
              },
            },
          });
        }
      }

      if (
        item.seatId === null &&
        item.productVariantId !== null &&
        quantityDifference !== 0
      ) {
        if (quantityDifference > 0) {
          const increased =
            await tx.productVariant.updateMany({
              where: {
                id: item.productVariantId,
                isActive: true,
                available: {
                  gte: quantityDifference,
                },
              },
              data: {
                available: {
                  decrement: quantityDifference,
                },
              },
            });

          if (increased.count === 0) {
            throw new BadRequestException(
              'No hay suficientes productos disponibles',
            );
          }
        }

        if (quantityDifference < 0) {
          await tx.productVariant.update({
            where: {
              id: item.productVariantId,
            },
            data: {
              available: {
                increment: Math.abs(quantityDifference),
              },
            },
          });
        }
      }

      // --------------------------------------------------------
      // CAMBIO DE ASIENTO
      // --------------------------------------------------------

      if (
        newSeatId !== null &&
        newSeatId !== item.seatId
      ) {
        const reservedNewSeat =
          await tx.seat.updateMany({
            where: {
              id: newSeatId,
              eventId: reservation.eventId,
              status: 'AVAILABLE',
            },
            data: {
              status: 'RESERVED',
            },
          });

        if (reservedNewSeat.count === 0) {
          throw new BadRequestException(
            'El nuevo asiento ya no está disponible',
          );
        }

        if (item.seatId !== null) {
          await tx.seat.update({
            where: {
              id: item.seatId,
            },
            data: {
              status: 'AVAILABLE',
            },
          });
        }
      }

      // --------------------------------------------------------
      // LIBERAR ASIENTO
      // --------------------------------------------------------

      if (
        item.seatId !== null &&
        newSeatId === null
      ) {
        await tx.seat.update({
          where: {
            id: item.seatId,
          },
          data: {
            status: 'AVAILABLE',
          },
        });
      }

      return tx.reservationItem.update({
        where: { id },
        data: {
          quantity: newQuantity,
          seatId: newSeatId,
        },
        include: {
          ticketType: true,
          productVariant: {
            include: {
              product: true,
            },
          },
          seat: true,
        },
      });
    },
    );

    await this.eventAvailabilityService.publishAvailability(
      reservation.eventId,
    );

    return result;
  }

  // ============================================================
  // ELIMINAR RESERVATION ITEM
  // ============================================================

  async removeItem(id: number) {
    const item = await this.prisma.reservationItem.findUnique({
      where: { id },
      include: {
        reservation: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'El ReservationItem no existe',
      );
    }

    await this.getPendingReservation(
      item.reservationId,
    );

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reservationLock =
        await tx.reservation.updateMany({
          where: {
            id: item.reservationId,
            status: 'PENDING',
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            updatedAt: new Date(),
          },
        });

      if (reservationLock.count === 0) {
        throw new BadRequestException(
          'La reserva ya no está disponible',
        );
      }

      /*
       * Eliminar un ReservationItem significa liberar
       * las unidades que estaban reservadas.
       */
      if (item.ticketTypeId !== null) {
        await tx.ticketType.update({
          where: {
            id: item.ticketTypeId,
          },
          data: {
            available: {
              increment: item.quantity,
            },
          },
        });
      }

      if (item.productVariantId !== null) {
        await tx.productVariant.update({
          where: {
            id: item.productVariantId,
          },
          data: {
            available: {
              increment: item.quantity,
            },
          },
        });
      }

      /*
       * Si tenía asiento, también se libera.
       */
      if (item.seatId !== null) {
        await tx.seat.update({
          where: {
            id: item.seatId,
          },
          data: {
            status: 'AVAILABLE',
          },
        });
      }

      return tx.reservationItem.delete({
        where: { id },
      });
    },
    );

    await this.eventAvailabilityService.publishAvailability(
      item.reservation.eventId,
    );

    return result;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async getPendingReservation(id: number) {
    const reservation =
      await this.prisma.reservation.findUnique({
        where: { id },
        include: {
          event: {
            include: {
              configuration: true,
            },
          },
          items: true,
        },
      });

    if (!reservation) {
      throw new NotFoundException(
        'La reserva no existe',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        'La reserva no está pendiente',
      );
    }

    if (reservation.expiresAt <= new Date()) {
      await this.expireReservation(id);

      throw new BadRequestException(
        'La reserva ha expirado',
      );
    }

    return reservation;
  }

  private validateTicketTypeSaleWindow(
    ticketType: {
      status: string;
      deletedAt: Date | null;
      startSaleAt: Date | null;
      endSaleAt: Date | null;
      name: string;
    },
    eventStartAt: Date,
  ) {
    const now = new Date();

    if (ticketType.status !== 'ACTIVE') {
      throw new BadRequestException(
        `El TicketType "${ticketType.name}" no está activo`,
      );
    }

    if (ticketType.deletedAt !== null) {
      throw new BadRequestException(
        `El TicketType "${ticketType.name}" fue eliminado`,
      );
    }

    if (
      ticketType.startSaleAt !== null &&
      now < ticketType.startSaleAt
    ) {
      throw new BadRequestException(
        `La venta de "${ticketType.name}" todavía no ha comenzado`,
      );
    }

    if (
      ticketType.endSaleAt !== null &&
      now > ticketType.endSaleAt
    ) {
      throw new BadRequestException(
        `La venta de "${ticketType.name}" ya terminó`,
      );
    }

    if (
      ticketType.startSaleAt !== null &&
      ticketType.endSaleAt !== null &&
      ticketType.startSaleAt >= ticketType.endSaleAt
    ) {
      throw new BadRequestException(
        `El intervalo de venta de "${ticketType.name}" no es válido`,
      );
    }

    if (
      ticketType.endSaleAt !== null &&
      ticketType.endSaleAt > eventStartAt
    ) {
      throw new BadRequestException(
        `La venta de "${ticketType.name}" no puede terminar después del inicio del evento`,
      );
    }
  }

  private async releaseReservationItems(
    tx: Prisma.TransactionClient,
    reservationId: number,
  ) {
    const items = await tx.reservationItem.findMany({
      where: {
        reservationId,
      },
    });

    for (const item of items) {
      /*
       * Liberar inventario del TicketType.
       */
      if (item.ticketTypeId !== null) {
        await tx.ticketType.update({
          where: {
            id: item.ticketTypeId,
          },
          data: {
            available: {
              increment: item.quantity,
            },
          },
        });
      }

      /*
       * Liberar inventario del ProductVariant.
       */
      if (item.productVariantId !== null) {
        await tx.productVariant.update({
          where: {
            id: item.productVariantId,
          },
          data: {
            available: {
              increment: item.quantity,
            },
          },
        });
      }

      /*
       * Liberar asiento.
       */
      if (item.seatId !== null) {
        await tx.seat.update({
          where: {
            id: item.seatId,
          },
          data: {
            status: 'AVAILABLE',
          },
        });
      }
    }
  }

  private isUniqueConstraintError(
    error: unknown,
  ): boolean {
    if (
      typeof error !== 'object' ||
      error === null
    ) {
      return false;
    }

    return (
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private async assertReservationOwner(
    reservationId: number,
    userId: number,
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('La reserva no existe');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException(
        'No puedes acceder a la reserva de otro usuario',
      );
    }
  }

  async findOneForUser(id: number, userId: number) {
    await this.assertReservationOwner(id, userId);
    return this.findOne(id);
  }

  async cancelForUser(id: number, userId: number) {
    await this.assertReservationOwner(id, userId);
    return this.cancel(id);
  }

  async findAllItemsForUser(
    reservationId: number,
    userId: number,
  ) {
    await this.assertReservationOwner(reservationId, userId);
    return this.findAllItems(reservationId);
  }

  async createItemForUser(
    reservationId: number,
    userId: number,
    dto: CreateReservationItemDto,
  ) {
    await this.assertReservationOwner(reservationId, userId);
    return this.createItem(reservationId, dto);
  }

  async updateItemForUser(
    itemId: number,
    userId: number,
    dto: UpdateReservationItemDto,
  ) {
    const item = await this.prisma.reservationItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        reservation: {
          select: { userId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(
        'El artículo de la reserva no existe',
      );
    }

    if (item.reservation.userId !== userId) {
      throw new ForbiddenException(
        'No puedes modificar artículos de una reserva ajena',
      );
    }

    return this.updateItem(itemId, dto);
  }

  async removeItemForUser(
    itemId: number,
    userId: number,
  ) {
    const item = await this.prisma.reservationItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        reservation: {
          select: { userId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(
        'El artículo de la reserva no existe',
      );
    }

    if (item.reservation.userId !== userId) {
      throw new ForbiddenException(
        'No puedes eliminar artículos de una reserva ajena',
      );
    }

    return this.removeItem(itemId);
  }
}
