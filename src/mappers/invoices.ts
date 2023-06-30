import * as path from "path";
import Excel from "exceljs";
import type { Models } from "../models";
import { adminUserId, getCell } from "../utils";
import { db } from "../db/admin";

type InvoiceWithPaymentHistory = {
	invoice: Models.Invoice;
	payments: Array<Models.PaymentHistory>;
};

export async function transformInvoicesData(): Promise<
	InvoiceWithPaymentHistory[]
> {
	const filePath = path.join(__dirname, "../../data/invoices.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const invoiceWs = content.getWorksheet(1);
	const invoiceDetailsWs = content.getWorksheet(2);
	const invoiceDiscountWs = content.getWorksheet(3);
	const invoicePaymentsWs = content.getWorksheet(4);
	const invoicePaymentDetailsWs = content.getWorksheet(5);

	const rows = invoiceWs.getRows(2, invoiceWs.rowCount - 1) ?? [];
	const invoiceDetails =
		invoiceDetailsWs.getRows(2, invoiceDetailsWs.rowCount - 1) ?? [];
	const invoiceDiscount =
		invoiceDiscountWs.getRows(2, invoiceDiscountWs.rowCount - 1) ?? [];
	const invoicePayments =
		invoicePaymentsWs.getRows(2, invoicePaymentsWs.rowCount - 1) ?? [];
	const invoicePaymentDetails =
		invoicePaymentDetailsWs.getRows(2, invoicePaymentDetailsWs.rowCount - 1) ??
		[];

	const invoices: InvoiceWithPaymentHistory[] = [];
	for (const row of rows) {
		const oldInvoiceId = getCell(row, "A");
		const invoiceId = `IMP#${getCell(row, "B")}`;
		const reqInvoiceDetails = invoiceDetails.find(
			(row) => getCell(row, "A") === oldInvoiceId
		);
		const invoicedAmount = invoiceDetails
			.filter((row) => getCell(row, "A") === oldInvoiceId)
			.reduce((acc, row) => acc + Number(getCell(row, "N")), 0);
		const reqInvoiceDiscount = invoiceDiscount.filter(
			(row) => getCell(row, "A") === oldInvoiceId
		);
		const reqInvoicePaymentDetails = invoicePaymentDetails.filter(
			(r) => getCell(r, "B") === `Invoice # ${getCell(row, "B")}`
		);

		const reqPaymentIds = reqInvoicePaymentDetails.map((i) => getCell(i, "A"));
		const reqInvoicePayments = invoicePayments.filter((row) =>
			reqPaymentIds.includes(getCell(row, "A"))
		);
		const latestPaymentId = Math.max(...reqPaymentIds.map(Number)).toString();
		const latestPayment = reqInvoicePayments.find(
			(row) => getCell(row, "A") === latestPaymentId
		);

		if (!reqInvoiceDetails) {
			console.log(`Invoice details not found for ${oldInvoiceId}`);
			continue;
		}

		const employeeId = getCell(reqInvoiceDetails, "I");
		if (!employeeId) {
			console.log(`Employee not found for ${oldInvoiceId}`);
			continue;
		}
		const grandTotal = Number(
			getCell(row, "R").replace("$", "").replace(/,/g, "")
		);
		let discounts: Models.Discount[] = [];
		if (reqInvoiceDiscount) {
			discounts = reqInvoiceDiscount.map((row) => ({
				name: getCell(row, "C"),
				value: Number(getCell(row, "E")),
				type: getCell(row, "D") === "value" ? "byValue" : "byPercentage",
			}));
		}
		let openBalance = grandTotal;
		if (reqInvoicePaymentDetails.length > 0) {
			openBalance = Number(
				getCell(reqInvoicePaymentDetails[0], "E")
					.replace("$", "")
					.replace(/,/g, "")
			);
			console.log(`Open balance for ${invoiceId} is ${openBalance}`);
		} else {
			console.log(`No reqInvoicePaymentDetails found for ${invoiceId}`);
		}

		const data: InvoiceWithPaymentHistory = {
			invoice: {
				id: invoiceId,
				additionalInfo: "",
				clientDetails: {
					address: getCell(row, "F"),
					name: getCell(row, "D"),
				},
				clientID: getCell(row, "E"),
				companyDetails: {
					address: "",
					name: "",
				},
				createdAt: new Date(getCell(row, "H")).toISOString(),
				createdBy: adminUserId,
				dueDate: getCell(row, "J"),
				employeeID: employeeId,
				discount: discounts,
				externalDetails: {
					externalAmount: invoicedAmount,
					toClient: false,
				},
				placementID: getCell(reqInvoiceDetails, "F"),
				grandTotal,
				includeInvoicePDF: false,
				invoiceBy: "external",
				invoiceDate: getCell(row, "H"),
				invoiceName: getCell(reqInvoiceDetails, "K"),
				invoiceSettings: {},
				isClientApproved: true,
				isClientRejected: false,
				isExist: true,
				isMailedToClient: true,
				isPaymentDone: openBalance <= 0,
				isVoid: false,
				latestPaymentDate: latestPayment ? getCell(latestPayment, "C") : "",
				netTerms: "",
				notes: "",
				notifiers: {
					bcc: getCell(row, "N").split(",").filter(Boolean),
					cc: getCell(row, "M").split(",").filter(Boolean),
					to: getCell(row, "L").split(",").filter(Boolean),
				},
				payableTo: "",
				paymentDiscountAmount: 0,
				poNumber: "",
				receivedAmount: Number(Number(grandTotal - openBalance).toFixed(2)),
				selectedExpenses: [],
				selectedTimesheets: {},
				statementMemo: "",
				subTotal: invoicedAmount,
			},
			payments: reqInvoicePaymentDetails.map((row) => {
				const paymentId = getCell(row, "A");
				const payment = reqInvoicePayments.find(
					(row) => getCell(row, "A") === paymentId
				);
				if (!payment) {
					console.log(`Payment not found for ${paymentId}`);
					throw new Error(`Payment not found for ${paymentId}`);
				}
				return {
					clientID: getCell(payment, "B"),
					createdAt: new Date(getCell(payment, "C")).toISOString(),
					paymentDate: getCell(payment, "C"),
					createdBy: adminUserId,
					paymentAmount: Number(
						getCell(row, "F").replace("$", "").replace(/,/g, "")
					),
					discountDetails: [],
					id: `PAY#${getCell(payment, "A")}`,
					invoiceID: invoiceId,
					isExist: true,
					otherInfo: {
						attachmentDetails: {
							publicURL: "",
							sourcePath: "",
						},
						paymentType:
							getCell(payment, "D") === "Cheque Payment" ? "cheque" : "online",
						referenceNumber: getCell(payment, "F"),
					},
					noReference: getCell(payment, "E").length === 0,
				};
			}),
		};

		invoices.push(data);
	}
	return invoices;
}
