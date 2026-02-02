import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import axios from 'axios';
import * as QRCode from 'qrcode';
import { env } from 'process';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly CALLBACK_URL = ''; // TODO: we need to figure out how to handle the callback since its the backend is running locally
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

    async processWebhook(signature: string, event: any) {
        return 'on receiving webhook'
    }
}