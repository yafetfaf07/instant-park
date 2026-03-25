import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SmsService', () => {
    let service: SmsService;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, AFRO_MESSAGE_TOKEN: 'test-token', AFRO_MESSAGE_IDENTIFIER_ID: 'sender-1', AFRO_MESSAGE_SENDER: 'InstantPark' };

        const module: TestingModule = await Test.createTestingModule({
            providers: [SmsService],
        }).compile();

        service = module.get<SmsService>(SmsService);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendSms', () => {
        it('should send SMS using GET and return true on success', async () => {
            mockedAxios.get.mockResolvedValue({ data: { acknowledge: 'success' } });

            const result = await service.sendSms('0912345678', 'Test message');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('https://api.afromessage.com/api/send'),
                { headers: { Authorization: 'Bearer test-token' } }
            );

            const calledUrl = mockedAxios.get.mock.calls[0][0];
            expect(calledUrl).toContain('to=0912345678');
            expect(calledUrl).toContain('from=sender-1');
            expect(calledUrl).toContain('sender=InstantPark');

            expect(result).toBe(true);
        });

        it('should return false if token is missing', async () => {
            delete process.env.AFRO_MESSAGE_TOKEN;

            const result = await service.sendSms('0912345678', 'Test message');

            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });
});
