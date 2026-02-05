import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import axios from 'axios';
import * as QRCode from 'qrcode';
import { env } from 'process';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import * as crypto from 'crypto';
import { ChapaWebhookDto } from './dto/webhook.dto';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    constructor(private readonly databaseService: DatabaseService) { }

    async initializePayment(dto: InitializePaymentDto) {
        const reservation = await this.databaseService.reservation.findUnique({
            where: { id: dto.reservationId },
        });

        if (!reservation) throw new NotFoundException('Reservation not found');
        if (reservation.status === 'CONFIRMED') throw new BadRequestException('Already paid');

        const tx_ref = `${reservation.bookingRef}-${Date.now()}`;

        await this.databaseService.reservation.update({
            where: { id: dto.reservationId },
            data: { transactionReference: tx_ref },
        });

        const user = await this.databaseService.customer.findUnique({
            where: { id: reservation?.userId },
        })
        if (!user) throw new NotFoundException('User not found');

        const payload = {
            amount: reservation.totalPrice.toString(),
            currency: 'ETB',
            first_name: user?.firstName,
            last_name: user.lastName,
            phone_number: user.phoneNo,
            tx_ref: tx_ref,
            callback_url: env.CALLBACK_URL,
            customization: {
                title: 'Reservation',
                description: `Payment for booking ${reservation.bookingRef}`,
            },
        };

        try {
            const response = await axios.post(
                'https://api.chapa.co/v1/transaction/initialize',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${env.CHAPA_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return { checkout_url: response.data.data.checkout_url };
        } catch (error) {
            this.logger.error('Chapa Initialization Error', error.response?.data);
            throw new BadRequestException('Payment initialization failed');
        }
    }

    async confirmPayment(dto: ConfirmPaymentDto) {
        const { reservationId, transactionReference } = dto;

        const reservation = await this.databaseService.reservation.findUnique({
            where: { id: reservationId },
            include: { parkingAvenue: true },
        });

        if (!reservation) {
            throw new NotFoundException('Reservation not found');
        }

        if (reservation.status === 'CONFIRMED') {
            throw new BadRequestException('Reservation is already confirmed');
        }

        try {
            const chapaResponse = await axios.get(
                `https://api.chapa.co/v1/transaction/verify/${transactionReference}`,
                {
                    headers: {
                        Authorization: `Bearer ${env.CHAPA_SECRET_KEY}`,
                    },
                },
            );

            if (chapaResponse.data.status !== 'success') {
                throw new BadRequestException('Payment verification failed or pending');
            }
        } catch (error) {
            console.error('Payment Verification Error:', error.message);
            throw new BadRequestException('Could not verify payment with provider');
        }

        const qrPayload = JSON.stringify({
            ref: reservation.bookingRef,
            pid: reservation.parkingAvenueId,
            start: reservation.startTime,
            end: reservation.endTime,
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

        const updatedReservation = await this.databaseService.reservation.update({
            where: { id: reservationId },
            data: {
                status: 'CONFIRMED',
                qrCode: qrCodeDataUrl,
            },
        });

        return {
            message: 'Payment confirmed and reservation secured',
            bookingReference: updatedReservation.bookingRef,
            qrCode: updatedReservation.qrCode, // Frontend can display this directly <img src="..." />
            status: updatedReservation.status,
        };
    }

    async processWebhook(payload: ChapaWebhookDto, signature?: string, rawBody?: Buffer,) {
        const secret = env.CHAPA_SECRET_KEY;
        if (!secret) {
            throw new Error('CHAPA_SECRET_KEY is not defined');
        }
        if (!signature) {
            throw new ForbiddenException('Missing signature');
        }

        const payloadToHash = rawBody ? rawBody : JSON.stringify(payload);

        const hash = crypto
            .createHmac('sha256', secret)
            .update(payloadToHash)
            .digest('hex');

        if (hash !== signature) {
            this.logger.warn('Invalid Webhook Signature');
            // throw new BadRequestException('Invalid signature'); 
        }

        
        if (payload.status !== 'success') {
            return { message: 'Ignored: Payment not successful' };
        }
        
        const tx_ref = payload.tx_ref;
        if (!tx_ref) {
            this.logger.warn('Webhook received without tx_ref');
            return;
        }

        const reservation = await this.databaseService.reservation.findUnique({
            where: { transactionReference: tx_ref },
        });

        if (!reservation) {
            this.logger.error(`Reservation with ref ${tx_ref} not found`);
            throw new NotFoundException('Reservation not found');
        }

        if (reservation.status === 'CONFIRMED') {
            return { message: 'Already confirmed' };
        }

        const qrPayload = JSON.stringify({
            ref: reservation.bookingRef,
            pid: reservation.parkingAvenueId,
            start: reservation.startTime,
            end: reservation.endTime,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

        await this.databaseService.reservation.update({
            where: { id: reservation.id },
            data: {
                status: 'CONFIRMED',
                qrCode: qrCodeDataUrl,
            },
        });

        this.logger.log(`Payment confirmed for ${reservation.bookingRef}`);
        return { status: 'success' };
    }
}