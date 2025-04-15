import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { convert } from 'html-to-text';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

export class Email {
  private to: string;
  private firstName: string;
  private url?: string;
  private from: string;
  private otp?: string;

  constructor(user: { email: string; firstName: string }, url?: string, otp?: string) {
    console.log(user);
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = `${process.env.MAIL_USERNAME}`;
    this.otp = otp;
  }

  private newTransport(): Transporter {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        ciphers: "SSLv3",
      },
    });
  }

  async send({
    templateName,
    subject,
    dynamicData,
  }: {
    templateName: string;
    subject: string;
    dynamicData?: Record<string, any>;
  }): Promise<any> {
    try {
      // Load and render the EJS template with dynamic data
      const templatePath = path.join(__dirname, "../views", `${templateName}.ejs`);
      const html = ejs.render(fs.readFileSync(templatePath, "utf-8"), {
        name: this.firstName,
        url: this.url,
        otp: this.otp,
        ...dynamicData,
      });
      

      // Email options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: convert(html, { wordwrap: 50 }),
      };

      // Send email
      const info = await this.newTransport().sendMail(mailOptions);
      return `Email sent: ${info.response}`;
    } catch (error) {
        console.log("error",error);
        return { success: false, message: "Failed to send email", error };
    }
  }
}
