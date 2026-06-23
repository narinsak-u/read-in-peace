import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;
}
