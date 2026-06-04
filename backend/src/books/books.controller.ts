import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BooksService } from './books.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.booksService.findAll(
      Number(page) || 1,
      Number(limit) || 12,
      category,
    );
  }

  @Get('trending')
  getTrending() {
    return this.booksService.getTrending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() body: {
      title: string;
      author: string;
      price: string;
      cover: string;
      synopsis: string;
      category: string;
      trending?: boolean;
    },
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.create(body, user.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      author: string;
      price: string;
      cover: string;
      synopsis: string;
      category: string;
      trending: boolean;
    }>,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.update(id, body, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.remove(id, user.id);
  }
}
