// DTO validated by class-validator for creating a new book. All fields required except trending.
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  author: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: string;

  @IsString()
  cover: string;

  @IsString()
  synopsis: string;

  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsBoolean()
  trending?: boolean;

  @IsOptional()
  @IsNumber()
  totalPages?: number;
}
