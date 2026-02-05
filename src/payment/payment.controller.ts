import { Controller, Post, Body, UseGuards, Req, Headers, HttpCode, HttpStatus, Query, Get } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { ChapaWebhookDto } from './dto/webhook.dto';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chapa Webhook listener' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>
  ) {
    console.log('WEBHOOK RECEIVED!');

    const signature = (req.headers['x-chapa-signature'] ||
      req.headers['chapa-signature']) as string;
    const payload = req.body as unknown as ChapaWebhookDto;
    const rawBody = req.rawBody;

    return this.paymentService.processWebhook(payload, signature, rawBody);
  }

  @Get('verify')
  verify(@Query('bookingRef') ref: string) {
    return this.paymentService.verifyPayment(ref);
  }
}