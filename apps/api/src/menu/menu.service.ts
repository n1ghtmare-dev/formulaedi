import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MenuCategoryDTO } from '@formulaedi/shared';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(): Promise<MenuCategoryDTO[]> {
    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      iconEmoji: c.iconEmoji,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        priceKopecks: i.priceKopecks,
        imageUrl: i.imageUrl,
        isHalal: i.isHalal,
        isAvailable: i.isAvailable,
      })),
    }));
  }
}
