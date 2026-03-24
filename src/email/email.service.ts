import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendVerificationEmail(email: string, name: string, status: string, firstPart: string,reason?: string) {
    const subject = status === 'APPROVED' ? 'Your account has been approved!' : 'Account verification update';
    
     const res = await this.resend.emails.send({
      from: 'onboarding@resend.dev', 
      to: email,
      subject: subject,
      html: `
        <h1>Hello ${name},</h1>
        <p>${firstPart}: <strong>${status}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Best regards,<br>Parking App Team</p>
      `,
    });
  }


    async sendForgotPasswordEmail(email: string, firsName: string, token:string) {
    
     const res = await this.resend.emails.send({
      from: 'onboarding@resend.dev', 
      to: email,
      subject: "Reset your park request password",
      html: `
        <h1>Hi ${firsName},</h1>
        <p>We received a request to reset the password for your park request account. No worries—it happens to the best of us!</p>
        <p>Use the token below to reset your password<p>
        <p>${token}</p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this change, you can safely ignore this email. Your password will remain the same.</p>
        ` 
      ,
    });
  }
}