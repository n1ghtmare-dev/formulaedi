import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PreviewOrderDto } from './dto/preview.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // POST /api/orders/preview — расчёт чека без создания заказа
  @Post('preview')
  preview(@Body() dto: PreviewOrderDto) {
    return this.orders.preview(dto);
  }

  // TODO: POST /api/orders — создание заказа + инициализация оплаты ЮKassa
  //       (требует авторизации; списание/начисление формул в транзакции)
}
