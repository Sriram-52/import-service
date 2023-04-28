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

export async function importInvoices() {
	const invoices = await transformInvoicesData();
	console.log(`Total invoices to import: ${invoices.length}`);
	const companyRef = db.collection("COMPANY_CONFIG").doc("details");
	const company = (await companyRef.get()).data();
	const promises = invoices.map(async (invoice, index) => {
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
			const invoiceId = `MINV#${index}`;
			const invoiceRef = db.collection("INVOICES").doc(invoiceId);
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
				invoiceName: `${invoice.activity}-${invoice.hours}`,
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

			const invoicePaymentRef = invoiceRef.collection("PAYMENTS_HISTORY").doc();
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

			return Promise.resolve(
				`Invoice ${invoiceId} - ${invoice.employeeId} - ${invoice.jobCode} imported successfully`
			);
		} catch (error) {
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
