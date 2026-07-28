import { Controller, Get } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  // GET /api/menu — все категории с позициями
  @Get()
  getMenu() {
    return this.menu.getMenu();
  }
}
