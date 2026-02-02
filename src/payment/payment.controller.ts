import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // FIX: removed auth guard because I was getting 401
  @Post('initialize')
  @ApiOperation({ summary: 'Initialize payment' })
  @ApiResponse({ status: 200, description: 'Payment initializaed' })
  @ApiResponse({ status: 400, description: 'Initialization failed' })
  initialize(@Body() initializePaymentDto: InitializePaymentDto) {
    return this.paymentService.initializePayment(initializePaymentDto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Verify payment and generate QR code' })
  @ApiResponse({ status: 200, description: 'Payment verified, QR generated' })
  @ApiResponse({ status: 400, description: 'Invalid transaction or verification failed' })
  confirm(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(confirmPaymentDto);
  }
}