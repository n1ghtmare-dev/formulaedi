import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PreviewOrderDto } from './dto/preview.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtGuard, type AuthUser } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // POST /api/orders/preview — расчёт чека без создания заказа (публичный)
  @Post('preview')
  preview(@Body() dto: PreviewOrderDto) {
    return this.orders.preview(dto);
  }

  // POST /api/orders — создание заказа (требует входа)
  @Post()
  @UseGuards(JwtGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.userId, dto);
  }

  // GET /api/orders/my — история заказов пользователя
  @Get('my')
  @UseGuards(JwtGuard)
  listMine(@CurrentUser() user: AuthUser) {
    return this.orders.listMine(user.userId);
  }

  // GET /api/orders/last-accepted — последний оплаченный (для окна после возврата с оплаты)
  // ВАЖНО: объявлен до :id, иначе перехватится параметрическим маршрутом.
  @Get('last-accepted')
  @UseGuards(JwtGuard)
  lastAccepted(@CurrentUser() user: AuthUser) {
    return this.orders.lastAccepted(user.userId);
  }

  // GET /api/orders/:id — заказ владельца
  @Get(':id')
  @UseGuards(JwtGuard)
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.getById(user.userId, id);
  }

  // POST /api/orders/:id/mock-confirm — ЗАГЛУШКА оплаты (до ЮKassa)
  @Post(':id/mock-confirm')
  @UseGuards(JwtGuard)
  mockConfirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.mockConfirm(user.userId, id);
  }
}
