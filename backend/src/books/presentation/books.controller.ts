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
import { AuthGuard, OptionalAuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { PoliciesGuard } from '../../iam/authorization/policies.guard';
import { Policies } from '../../iam/authorization/policies.decorator';
import { BooksService } from '../application/books.service';
import { CAN_DELETE_BOOK, CAN_EDIT_BOOK } from '../authorization/policy.tokens';
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

  @Get('search')
  search(@Query('q') q?: string) {
    if (!q || !q.trim()) return [];
    return this.booksService.search(q.trim());
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
  update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PoliciesGuard)
  @Policies(CAN_DELETE_BOOK)
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  @Get(':id/like')
  @UseGuards(OptionalAuthGuard)
  isLiked(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
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
  getRating(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
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
