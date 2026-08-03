import { Controller, Post, Delete, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiOperation } from '@nestjs/swagger';

@Controller('customer')
@UseGuards(JwtAuthGuard, )
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('favorites/:avenueId')
  @ApiOperation({ summary: 'add a parking avenue to favorite' })
  async addFavorite(@Req() req, @Param('avenueId') avenueId: string) {
    await this.customerService.addFavorite(req.user.id, avenueId);
    return { message: 'Added to favorites successfully' };
  }

  @Delete('favorites/:avenueId')
  @ApiOperation({ summary: 'remove a parking avenue from favorite' })
  async removeFavorite(@Req() req, @Param('avenueId') avenueId: string) {
    await this.customerService.removeFavorite(req.user.id, avenueId);
    return { message: 'Removed from favorites successfully' };
  }

  @Get('favorites')
  @ApiOperation({ summary: 'get favorite list' })
  async getFavorites(@Req() req) {
    const favorites = await this.customerService.getFavorites(req.user.id);
    
    return favorites.map(fav => {
      const reviews = fav.parkingAvenue.reviews;
      const avgRating = reviews.length > 0 
        ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
        : 0;

      return {
        id: fav.parkingAvenue.id,
        name: fav.parkingAvenue.name,
        address: fav.parkingAvenue.address,
        hourlyRate: fav.parkingAvenue.hourlyRate,
        type: fav.parkingAvenue.type,
        currentSpots: fav.parkingAvenue.currentSpots,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalReviews: reviews.length,
        favoritedAt: fav.createdAt
      };
    });
  }

  @Post('reviews/:avenueId')
  @ApiOperation({ summary: 'review a parking area' })
  async submitReview(
    @Req() req, 
    @Param('avenueId') avenueId: string, 
    @Body() dto: CreateReviewDto
  ) {
    const review = await this.customerService.submitReview(req.user.id, avenueId, dto);
    return { 
      message: 'Review submitted successfully',
      review
    };
  }
}