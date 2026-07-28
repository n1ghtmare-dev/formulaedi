import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

// Публичные настройки для футера/шапки (часы работы, e-mail, адрес).
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getPublic() {
    return this.settings.getAll();
  }
}
