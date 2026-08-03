import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addFavorite(customerId: string, parkingAvenueId: string) {
    try {
      return await this.databaseService.favorite.create({
        data: {
          customerId,
          parkingAvenueId,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Parking avenue is already in your favorites');
      }
      throw error;
    }
  }

  async removeFavorite(customerId: string, parkingAvenueId: string) {
    const favorite = await this.databaseService.favorite.findUnique({
      where: {
        customerId_parkingAvenueId: { customerId, parkingAvenueId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return this.databaseService.favorite.delete({
      where: { id: favorite.id },
    });
  }

  async getFavorites(customerId: string) {
    return this.databaseService.favorite.findMany({
      where: { customerId },
      include: {
        parkingAvenue: {
          select: {
            id: true,
            name: true,
            address: true,
            hourlyRate: true,
            type: true,
            currentSpots: true,
            reviews: {
              select: { rating: true }
            }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitReview(customerId: string, parkingAvenueId: string, dto: CreateReviewDto) {
    const avenue = await this.databaseService.parkingAvenue.findUnique({
      where: { id: parkingAvenueId }
    });

    if (!avenue) {
      throw new NotFoundException('Parking avenue not found');
    }

    return this.databaseService.review.upsert({
      where: {
        customerId_parkingAvenueId: { customerId, parkingAvenueId },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
      create: {
        customerId,
        parkingAvenueId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }
}