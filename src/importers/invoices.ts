import moment from "moment";
import { db } from "../db/admin";
import { transformInvoicesData } from "../mappers/invoices";
import { adminUserId, parseDate } from "../utils";

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
	const invoices = await transformInvoicesData();
	console.log(`Total invoices to delete: ${invoices.length}`);
	const promises = invoices.map(async (invoice, index) => {
		try {
			if (index % 400 === 0) {
				console.log(`Sleeping for 2 seconds`);
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
			await deleteCollection(`INVOICES/${invoice.invoiceNumber}`);
			console.log(`Deleted invoice ${invoice.invoiceNumber}`);
		} catch (error) {
			console.log(error);
		}
	});
	await Promise.all(promises);
	console.log(`Deleted ${invoices.length} invoices`);
}

export async function importInvoices() {
	const invoices = await transformInvoicesData();
	console.log(`Total invoices to import: ${invoices.length}`);
	const companyRef = db.collection("COMPANY_CONFIG").doc("details");
	const company = (await companyRef.get()).data();
	const promises = invoices
		.filter((i) => {
			// check if latestPaymentDate is a valid date or not
			try {
				const latestPaymentDate = parseDate(i.latestPaymentDate);
				if (!latestPaymentDate) {
					console.log(
						`Invalid latestPaymentDate ${i.latestPaymentDate} for invoice ${i.invoiceNumber}`
					);
					return false;
				}
				return true;
			} catch (error) {
				return false;
			}
		})
		.map(async (invoice, index) => {
			try {
				const placementRef = db
					.collection(`EMPLOYEES/${invoice.employeeId}/PLACEMENTS`)
					.doc(invoice.jobCode);
				const placement = (await placementRef.get()).data();
				if (!placement) {
					console.log(`Placement not found for ${invoice.jobCode}`);
					return;
				}
				const invoiceSettingsRef = db
					.collection(
						`EMPLOYEES/${invoice.employeeId}/PLACEMENTS/${invoice.jobCode}/SETTINGS`
					)
					.doc("invoices");
				const invoiceSettings = (await invoiceSettingsRef.get()).data();
				const clientId = placement.clientId;
				const clientRef = db.collection(`CLIENTS`).doc(clientId);
				const client = (await clientRef.get()).data();
				if (!client) {
					console.log(`Client not found for ${invoice.jobCode}`);
					return;
				}
				const invoiceLocationId = client.invoiceLocationId;
				const invoiceLocationRef = db
					.collection(`CLIENTS/${clientId}/CLIENTS_LOCATIONS`)
					.doc(invoiceLocationId);
				const invoiceLocation = (await invoiceLocationRef.get()).data();
				if (!invoiceLocation) {
					console.log(`Invoice location not found for ${invoice.jobCode}`);
					return;
				}
				const invoiceId = invoice.invoiceNumber;
				const invoiceRef = db.collection("INVOICES").doc(invoiceId);
				if (index % 400 === 0) {
					console.log(`Sleeping for 2 seconds`);
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
				await invoiceRef.set({
					additionalInfo: "",
					clientDetails: {
						address: [
							invoiceLocation?.locationsline1,
							invoiceLocation?.locationsline2,
							invoiceLocation?.locationscity,
							invoiceLocation?.locationsstate_name,
							invoiceLocation?.locationszip,
						]
							.filter(Boolean)
							.join(", "),
						name: client?.businessDisplayName,
					},
					clientID: clientId,
					companyDetails: {
						address: company?.contactDetails?.address,
						name: company?.companyName,
					},
					createdAt: new Date(invoice.invoicedDate).toISOString(),
					createdBy: adminUserId,
					discount: invoice.discountAmount
						? [
								{
									name: "Discount",
									value: invoice.discountAmount,
									type: "byValue",
								},
						  ]
						: [],
					dueDate: parseDate(invoice.invoiceDueDate),
					employeeID: invoice.employeeId,
					externalDetails: {
						externalAmount: invoice.invoicedAmount,
						toClient: false,
					},
					grandTotal: invoice.invoicedAmount - (invoice.discountAmount ?? 0),
					id: invoiceId,
					includeInvoicePDF: false,
					invoiceBy: "external",
					invoiceDate: parseDate(invoice.invoicedDate),
					invoiceName: `${invoice.activity}-${invoice.hours ?? ""}-${
						invoice.employeeName
					}`,
					invoiceSettings,
					isClientApproved: true,
					isClientRejected: false,
					isExist: true,
					isMailedToClient: true,
					isPaymentDone: true,
					isVoid: false,
					latestPaymentDate: parseDate(invoice.latestPaymentDate),
					netTerms: client?.netTerms,
					notes: "",
					notifiers: {
						bcc: [],
						cc: [],
						to: await getNotifiersData(clientId, invoiceSettings?.to ?? []),
					},
					payableTo: `<p>${company?.companyName}</p>`,
					paymentDiscountAmount: 0,
					placementID: invoice.jobCode,
					poNumber: "",
					receivedAmount: invoice.receivedAmount,
					selectedExpenses: [],
					selectedTimesheets: {},
					statementMemo: "",
					subTotal: invoice.invoicedAmount,
				});

				const invoicePaymentRef = invoiceRef
					.collection("PAYMENTS_HISTORY")
					.doc();
				console.log(
					`importing invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode}`
				);
				await invoicePaymentRef.set({
					clientID: clientId,
					createdAt: new Date(invoice.latestPaymentDate).toISOString(),
					createdBy: adminUserId,
					discountDetails: [],
					id: invoicePaymentRef.id,
					invoiceID: invoiceId,
					isExist: true,
					noReference: true,
					otherInfo: {
						attachmentDetails: {
							publicURL: "",
							sourcePath: "",
						},
						paymentType: "online",
						referenceNumber: "",
					},
					paymentAmount: invoice.receivedAmount,
					paymentDate: parseDate(invoice.latestPaymentDate),
				});
				console.log(
					`Invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode} imported successfully`
				);
				return Promise.resolve(
					`Invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode} imported successfully`
				);
			} catch (error) {
				console.error(
					`Invoice ${invoice.invoiceNumber} - ${invoice.employeeId} - ${invoice.jobCode} import failed`,
					(<Error>error).stack
				);
				return Promise.reject((<Error>error).message);
			}
		});
	const promiseSettedResult = await Promise.allSettled(promises);
	console.log(`Total: ${promiseSettedResult.length}`);
	const rejected = promiseSettedResult.filter(
		(result) => result.status === "rejected"
	);
	console.log(`Rejected: ${rejected.length}`);
	const fulfilled = promiseSettedResult.filter(
		(result) => result.status === "fulfilled"
	);
	console.log(`Fulfilled: ${fulfilled.length}`);
}
