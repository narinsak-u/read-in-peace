// REST controller for books CRUD at /api/books.
// Public endpoints: findAll (paginated, filterable by category), findOne, getTrending.
// Auth-protected: create, update, delete. Update/delete additionally require
// @Policies(ownership check).
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
import { PoliciesGuard } from '../auth/policies/policies.guard';
import { Policies } from '../auth/policies/policies.decorator';
import { CAN_DELETE_BOOK, CAN_EDIT_BOOK } from '../auth/policies/policy.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { OptionalUser } from '../auth/optional-user.decorator';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { RateBookDto } from './dto/rate-book.dto';

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
  @UseGuards(AuthGuard, PoliciesGuard)
  @Policies(CAN_EDIT_BOOK)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PoliciesGuard)
  @Policies(CAN_DELETE_BOOK)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.booksService.remove(id, user.id);
  }

  @Get(':id/like')
  @UseGuards(OptionalAuthGuard)
  isLiked(@Param('id') id: string, @OptionalUser() user?: { id: string }) {
    if (!user) return { liked: false };
    return this.booksService.isLiked(id, user.id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  toggleLike(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.booksService.toggleLike(id, user.id);
  }

  @Get(':id/rate')
  @UseGuards(OptionalAuthGuard)
  getRating(@Param('id') id: string, @OptionalUser() user?: { id: string }) {
    if (!user) return null;
    return this.booksService.getUserRating(id, user.id);
  }

  @Post(':id/rate')
  @UseGuards(AuthGuard)
  rateBook(
    @Param('id') id: string,
    @Body() dto: RateBookDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.rateBook(id, user.id, dto.rating);
  }
}
