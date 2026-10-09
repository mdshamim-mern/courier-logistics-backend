import "./environment";
import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import nodemailer from "nodemailer";
import { emailSender } from "../src/app/utils/emailSender";
import config from "../src/app/config";

afterEach(() => mock.restoreAll());

test("email delivery has bounded timeouts and cannot fetch files or URLs", async () => {
	let options: any;
	let message: any;
	let closed = false;
	mock.method(nodemailer, "createTransport", (input: any) => {
		options = input;
		return {
			sendMail: async (value: any) => {
				message = value;
			},
			close: () => {
				closed = true;
			},
		};
	});
	await emailSender("recipient@example.test", "Test", "<p>Test</p>");
	assert.equal(options.socketTimeout, config.smtp_send_timeout_ms);
	for (const field of ["connectionTimeout", "greetingTimeout", "dnsTimeout"])
		assert.equal(options[field], 10000);
	assert.equal(options.requireTLS, true);
	assert.equal(options.disableFileAccess, true);
	assert.equal(options.disableUrlAccess, true);
	assert.equal(message.to, "recipient@example.test");
	assert.equal(closed, true);
});

test("SMTP failures expose a generic service error without provider credentials", async () => {
	let closed = false;
	mock.method(nodemailer, "createTransport", () => ({
		sendMail: async () => {
			throw new Error("private SMTP server diagnostic");
		},
		close: () => {
			closed = true;
		},
	}));
	await assert.rejects(
		() => emailSender("recipient@example.test", "Test", "Test"),
		(error: any) =>
			error.statusCode === 502 &&
			error.message === "Email service is temporarily unavailable",
	);
	assert.equal(closed, true);
});

test("a stalled SMTP send is closed at the total deadline", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	let closed = false;
	mock.method(nodemailer, "createTransport", () => ({
		sendMail: () => new Promise(() => undefined),
		close: () => {
			closed = true;
		},
	}));
	const result = emailSender("recipient@example.test", "Test", "Test");
	t.mock.timers.tick(config.smtp_send_timeout_ms);
	await assert.rejects(result, (error: any) => error.statusCode === 502);
	assert.equal(closed, true);
});
