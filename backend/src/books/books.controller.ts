// REST controller for books CRUD at /api/books.
// Public endpoints: findAll (paginated, filterable by category), findOne, getTrending.
// Auth-protected: create, update, delete (owner-only via CurrentUser).
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

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

  @Get('new-arrivals')
  getNewArrivals() {
    return this.booksService.findNewArrivals();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateBookDto, @CurrentUser() user: { id: string }) {
    return this.booksService.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.booksService.remove(id, user.id);
  }
}
