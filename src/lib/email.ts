import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

export async function sendOTPEmail(to: string, code: string) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@bananalabs.cloud',
        to,
        subject: 'Your login code',
        text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
        html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
                <h2>Your login code</h2>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #f4d03f;">${code}</p>
                <p>This code expires in 10 minutes.</p>
                <p style="color: #666; font-size: 12px;">If you didn't request this, ignore this email.</p>
            </div>
        `,
    });
}