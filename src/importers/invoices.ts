import moment from "moment";
import { db, admin } from "../db/admin";
import { transformInvoicesData } from "../mappers/invoices";
import { adminUserId, getCell, parseDate } from "../utils";
import type { Models } from "../models";
import path from "path";
import Excel from "exceljs";
import fs from "fs";

async function getNotifiersData(clientId: string, ids: string[]) {
	try {
		const notifiers = await Promise.all(
			ids.map(async (id) => {
				const contactsRef = db
					.collection(`CLIENTS/${clientId}/CLIENTS_CONTACTS`)
					.where("id", "==", id);
				const contacts = (await contactsRef.get()).docs.map(
					(doc) => doc.data()?.email
				);
				return contacts;
			})
		);
		return notifiers.flat();
	} catch (error) {
		console.log(error);
		return [];
	}
}

export async function deleteCollection(docPath: string) {
	// Create a new batch

	// Add the document to the batch
	// const docRef = db.doc(docPath);
	// await docRef.delete();

	// Add all subcollections of the document to the batch
	return db
		.collection(`${docPath}/PAYMENTS_HISTORY`)
		.get()
		.then((querySnapshot) => {
			const promises = querySnapshot.docs.map((doc) => {
				return doc.ref.delete();
			});
			return Promise.all(promises);
		})
		.then(() => {
			console.log("Document and subcollections deleted");
		})
		.catch((error) => {
			console.error("Error deleting document:", error);
		});
}

export async function deleteInvoices() {
	// const invoices = await transformInvoicesData();
	// console.log(`Total invoices to delete: ${invoices.length}`);
	// const promises = invoices.map(async (invoice, index) => {
	// 	try {
	// 		if (index % 400 === 0) {
	// 			console.log(`Sleeping for 2 seconds`);
	// 			await new Promise((resolve) => setTimeout(resolve, 2000));
	// 		}
	// 		await deleteCollection(`INVOICES/${invoice.invoiceNumber}`);
	// 		console.log(`Deleted invoice ${invoice.invoiceNumber}`);
	// 	} catch (error) {
	// 		console.log(error);
	// 	}
	// });
	// await Promise.all(promises);
	// console.log(`Deleted ${invoices.length} invoices`);
}

export async function missedInvoices() {
	const filePath = path.join(__dirname, "../../data/invoices.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const invoiceDetailsWs = content.getWorksheet(2);
	const rows = invoiceDetailsWs.getRows(2, invoiceDetailsWs.rowCount - 1) ?? [];

	const invoiceIds: string[] = [];
	const promises = rows.map(async (row) => {
		const invoiceId = `IMP#${getCell(row, "B")}`;
		const invoiceRef = db.collection("INVOICES").doc(invoiceId);
		const invoice = await invoiceRef.get();
		if (!invoice.exists) {
			invoiceIds.push(invoiceId);
			return;
		}
	});
	await Promise.all(promises);
	fs.writeFileSync("missed-invoices.json", JSON.stringify(invoiceIds, null, 2));
	console.log(`Done`);
}

export async function updateEmpIds() {
	const filePath = path.join(__dirname, "../../data/invoices.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const invoiceDetailsWs = content.getWorksheet(2);
	const rows = invoiceDetailsWs.getRows(2, invoiceDetailsWs.rowCount - 1) ?? [];

	const promises = rows.map(async (row, idx) => {
		const invoiceId = `IMP#${getCell(row, "B")}`;
		const employeeId = getCell(row, "I");
		const invoicedAmount = Number(getCell(row, "N"));
		const invoiceRef = db.collection("INVOICES").doc(invoiceId);
		const invoice = await invoiceRef.get();
		if (!invoice.exists) {
			console.log(`Invoice ${invoiceId} does not exist`);
			return;
		}
		if (idx % 400 === 0) {
			console.log(`Sleeping for 2 seconds`);
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
		await invoiceRef.update({
			// employeeID: employeeId,
			// "externalDetails.toClient": false,
			// placementID: getCell(row, "F"),

			// placementID: admin.firestore.FieldValue.delete(),
			// invoiceName: getCell(row, "K"),
			// "externalDetails.externalAmount": invoicedAmount,
			paymentDiscountAmount: 0,
		});
		console.log(`Updated invoice ${invoiceId}`);
	});
	await Promise.all(promises);
	console.log(`Updated ${promises.length} invoices`);
}

export async function importInvoices() {
	const data = await transformInvoicesData();
	console.log(`Total invoices to import: ${data.length}`);
	const companyRef = db.collection("COMPANY_CONFIG").doc("details");
	const company = (await companyRef.get()).data();
	for await (const item of data) {
		try {
			const invoiceRef = db.collection(`INVOICES`).doc(item.invoice.id);
			const placementRef = db.doc(
				`EMPLOYEES/${item.invoice.employeeID}/PLACEMENTS/${item.invoice.placementID}`
			);
			const placement = (await placementRef.get()).data();
			const invoiceSettingsRef = placementRef
				.collection("SETTINGS")
				.doc("invoices");
			const invoiceSettings = (await invoiceSettingsRef.get()).data();

			const updatedInvoice: Models.Invoice = {
				...item.invoice,
				companyDetails: {
					address: company?.contactDetails?.address,
					name: company?.companyName,
				},
				payableTo: `<p>${company?.companyName}</p>`,
				invoiceSettings: invoiceSettings || {},
				netTerms: placement?.netTerms || "0",
			};
			await invoiceRef.set(updatedInvoice);
			console.log(`Now creating payments history`);
			for await (const payment of item.payments) {
				const paymentsHistoryRef = invoiceRef
					.collection("PAYMENTS_HISTORY")
					.doc();
				const paymentsHistory: Models.PaymentHistory = {
					...payment,
					id: paymentsHistoryRef.id,
				};
				await paymentsHistoryRef.set(paymentsHistory);
				console.log(
					`Created payment history ${paymentsHistory.id} for invoice ${item.invoice.id}`
				);
			}
			console.log(`Imported invoice ${item.invoice.id}`);
			console.log("====================================");
		} catch (error) {
			console.log(error);
			console.log("====================================");
		}
	}
	// const promises = invoices
	// 	.filter((i) => {
	// 		// check if latestPaymentDate is a valid date or not
	// 		try {
	// 			const latestPaymentDate = parseDate(i.latestPaymentDate);
	// 			if (!latestPaymentDate) {
	// 				console.log(
	// 					`Invalid latestPaymentDate ${i.latestPaymentDate} for invoice ${i.invoiceNumber}`
	// 				);
	// 				return false;
	// 			}
	// 			return true;
	// 		} catch (error) {
	// 			return false;
	// 		}
	// 	})
	// 	.map(async (invoice, index) => {
	// 		try {
	// 			const placementRef = db
	// 				.collection(`EMPLOYEES/${invoice.employeeId}/PLACEMENTS`)
	// 				.doc(invoice.jobCode);
	// 			const placement = (await placementRef.get()).data();
	// 			if (!placement) {
	// 				console.log(`Placement not found for ${invoice.jobCode}`);
	// 				return;
	// 			}
	// 			const invoiceSettingsRef = db
	// 				.collection(
	// 					`EMPLOYEES/${invoice.employeeId}/PLACEMENTS/${invoice.jobCode}/SETTINGS`
	// 				)
	// 				.doc("invoices");
	// 			const invoiceSettings = (await invoiceSettingsRef.get()).data();
	// 			const clientId = placement.clientId;
	// 			const clientRef = db.collection(`CLIENTS`).doc(clientId);
	// 			const client = (await clientRef.get()).data();
	// 			if (!client) {
	// 				console.log(`Client not found for ${invoice.jobCode}`);
	// 				return;
	// 			}
	// 			const invoiceLocationId = client.invoiceLocationId;
	// 			const invoiceLocationRef = db
	// 				.collection(`CLIENTS/${clientId}/CLIENTS_LOCATIONS`)
	// 				.doc(invoiceLocationId);
	// 			const invoiceLocation = (await invoiceLocationRef.get()).data();
	// 			if (!invoiceLocation) {
	// 				console.log(`Invoice location not found for ${invoice.jobCode}`);
	// 				return;
	// 			}
	// 			const invoiceId = invoice.invoiceNumber;
	// 			const invoiceRef = db.collection("INVOICES").doc(invoiceId);
	// 			if (index % 400 === 0) {
	// 				console.log(`Sleeping for 2 seconds`);
	// 				await new Promise((resolve) => setTimeout(resolve, 2000));
	// 			}
	// 			await invoiceRef.set({
	// 				additionalInfo: "",
	// 				clientDetails: {
	// 					address: [
	// 						invoiceLocation?.locationsline1,
	// 						invoiceLocation?.locationsline2,
	// 						invoiceLocation?.locationscity,
	// 						invoiceLocation?.locationsstate_name,
	// 						invoiceLocation?.locationszip,
	// 					]
	// 						.filter(Boolean)
	// 						.join(", "),
	// 					name: client?.businessDisplayName,
	// 				},
	// 				clientID: clientId,
	// 				companyDetails: {
	// 					address: company?.contactDetails?.address,
	// 					name: company?.companyName,
	// 				},
	// 				createdAt: new Date(invoice.invoicedDate).toISOString(),
	// 				createdBy: adminUserId,
	// 				discount: invoice.discountAmount
	// 					? [
	// 							{
	// 								name: "Discount",
	// 								value: invoice.discountAmount,
	// 								type: "byValue",
	// 							},
	// 					  ]
	// 					: [],
	// 				dueDate: parseDate(invoice.invoiceDueDate),
	// 				employeeID: invoice.employeeId,
	// 				externalDetails: {
	// 					externalAmount: invoice.invoicedAmount,
	// 					toClient: false,
	// 				},
	// 				grandTotal: invoice.invoicedAmount - (invoice.discountAmount ?? 0),
	// 				id: invoiceId,
	// 				includeInvoicePDF: false,
	// 				invoiceBy: "external",
	// 				invoiceDate: parseDate(invoice.invoicedDate),
	// 				invoiceName: `${invoice.activity}-${invoice.hours ?? ""}-${
	// 					invoice.employeeName
	// 				}`,
	// 				invoiceSettings,
	// 				isClientApproved: true,
	// 				isClientRejected: false,
	// 				isExist: true,
	// 				isMailedToClient: true,
	// 				isPaymentDone: true,
	// 				isVoid: false,
	// 				latestPaymentDate: parseDate(invoice.latestPaymentDate),
	// 				netTerms: client?.netTerms,
	// 				notes: "",
	// 				notifiers: {
	// 					bcc: [],
	// 					cc: [],
	// 					to: await getNotifiersData(clientId, invoiceSettings?.to ?? []),
	// 				},
	// 				payableTo: `<p>${company?.companyName}</p>`,
	// 				paymentDiscountAmount: 0,
	// 				placementID: invoice.jobCode,
	// 				poNumber: "",
	// 				receivedAmount: invoice.receivedAmount,
	// 				selectedExpenses: [],
	// 				selectedTimesheets: {},
	// 				statementMemo: "",
	// 				subTotal: invoice.invoicedAmount,
	// 			});

	// 			const invoicePaymentRef = invoiceRef
	// 				.collection("PAYMENTS_HISTORY")
	// 				.doc();
	// 			console.log(
	// 				`importing invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode}`
	// 			);
	// 			await invoicePaymentRef.set({
	// 				clientID: clientId,
	// 				createdAt: new Date(invoice.latestPaymentDate).toISOString(),
	// 				createdBy: adminUserId,
	// 				discountDetails: [],
	// 				id: invoicePaymentRef.id,
	// 				invoiceID: invoiceId,
	// 				isExist: true,
	// 				noReference: true,
	// 				otherInfo: {
	// 					attachmentDetails: {
	// 						publicURL: "",
	// 						sourcePath: "",
	// 					},
	// 					paymentType: "online",
	// 					referenceNumber: "",
	// 				},
	// 				paymentAmount: invoice.receivedAmount,
	// 				paymentDate: parseDate(invoice.latestPaymentDate),
	// 			});
	// 			console.log(
	// 				`Invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode} imported successfully`
	// 			);
	// 			return Promise.resolve(
	// 				`Invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode} imported successfully`
	// 			);
	// 		} catch (error) {
	// 			console.error(
	// 				`Invoice ${invoice.invoiceNumber} - ${invoice.employeeId} - ${invoice.jobCode} import failed`,
	// 				(<Error>error).stack
	// 			);
	// 			return Promise.reject((<Error>error).message);
	// 		}
	// 	});
}
