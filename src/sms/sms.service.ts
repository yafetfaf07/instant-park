import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import axios from 'axios';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    async sendSms(to: string, message: string): Promise<boolean> {
        const token = env.AFRO_MESSAGE_TOKEN;
        if (!token) {
            this.logger.warn('AFRO_MESSAGE_TOKEN is not configured. Skipping SMS.');
            return false;
        }

        try {
            const identifierId = env.AFRO_MESSAGE_IDENTIFIER_ID || '';
            const sender = env.AFRO_MESSAGE_SENDER || 'AfroMessage';

            // Construct GET URL with URL params
            const baseUrl = 'https://api.afromessage.com/api/send';
            const params = new URLSearchParams({
                to,
                message,
                sender,
            });

            if (identifierId) {
                params.append('from', identifierId);
            }

            const url = `${baseUrl}?${params.toString()}`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data && response.data.acknowledge === 'success') {
                this.logger.log(`SMS sent successfully to ${to}`);
                return true;
            } else {
                this.logger.warn(`SMS send warning to ${to}: ${JSON.stringify(response.data)}`);
                return true; // Still true, API accepted it.
            }

        } catch (error) {
            this.logger.error(`Failed to send SMS to ${to}`, error.response?.data || error.message);
            return false;
        }
    }
}
