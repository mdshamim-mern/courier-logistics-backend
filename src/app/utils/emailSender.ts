import nodemailer from "nodemailer";
import config from "../config";
import { AppError } from "../errors/AppError";

export const emailSender = async (
	to: string,
	subject: string,
	html: string,
) => {
	const transporter = nodemailer.createTransport({
		service: "gmail",
		connectionTimeout: Math.min(config.smtp_send_timeout_ms, 10000),
		greetingTimeout: Math.min(config.smtp_send_timeout_ms, 10000),
		dnsTimeout: Math.min(config.smtp_send_timeout_ms, 10000),
		socketTimeout: config.smtp_send_timeout_ms,
		requireTLS: true,
		disableFileAccess: true,
		disableUrlAccess: true,
		auth: {
			user: process.env.EMAIL_SENDER,
			pass: process.env.SMTP_PASSWORD,
		},
	});

	const unavailable = () =>
		new AppError(502, "Email service is temporarily unavailable");
	const close = () => {
		try {
			transporter.close();
		} catch {
			return;
		}
	};
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			close();
			reject(unavailable());
		}, config.smtp_send_timeout_ms);
	});
	try {
		await Promise.race([
			transporter.sendMail({
				from: process.env.EMAIL_SENDER as string,
				to,
				subject,
				html,
			}),
			deadline,
		]);
	} catch {
		throw unavailable();
	} finally {
		clearTimeout(timer);
		close();
	}
};
