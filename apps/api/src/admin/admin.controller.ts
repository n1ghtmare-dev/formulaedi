import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.guard';
import { AdminService } from './admin.service';
import {
  AdjustFormulasDto,
  BlockUserDto,
  ChangePasswordDto,
  CreateCategoryDto,
  CreateItemDto,
  UpdateCategoryDto,
  UpdateItemDto,
  UpdateOrderStatusDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  // ——— Меню ———
  @Get('menu')
  menu() {
    return this.admin.fullMenu();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.admin.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.admin.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.admin.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.admin.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.admin.deleteItem(id);
  }

  // ——— Заказы ———
  @Get('orders')
  orders(@Query('status') status?: string) {
    return this.admin.orders(status);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto);
  }

  // ——— Пользователи ———
  @Get('users')
  users() {
    return this.admin.users();
  }

  @Patch('users/:id/block')
  block(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.admin.setBlocked(id, dto.isBlocked);
  }

  // ——— Формулы ———
  @Get('loyalty')
  loyalty(@Query('userId') userId?: string) {
    return this.admin.formulaTransactions(userId);
  }

  @Post('loyalty/adjust')
  adjust(@Body() dto: AdjustFormulasDto) {
    return this.admin.adjustFormulas(dto);
  }

  // ——— Пароль админа ———
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.admin.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }
}
