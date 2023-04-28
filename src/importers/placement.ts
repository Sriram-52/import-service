import { db } from "../db/admin";
import { transformPlacementsData } from "../mappers/placement";
import { adminUserId, parseDate } from "../utils";
import type { TimeSheetFrequency, Placement, PayRateType } from "../models";

const rangeFromTimesheetFrequency = (frequency: TimeSheetFrequency) => {
	switch (frequency) {
		case "Daily":
			return 0;
		case "Weekly":
			return 1;
		case "Biweekly":
			return 2;
		case "Semi-Monthly":
			return 3;
		case "Monthly":
			return 4;
	}
};

const mapPayRateType = (payRateType: PayRateType) => {
	if (payRateType === "FixedPay") {
		return "FixedPay";
	}
	if (payRateType === "Percentage") {
		return "Hourly";
	}
	return "Hourly";
};

const getPaymentDetails = (placement: Placement) => {
	const paymentDetails = {
		OTbillingRate: placement.oTBillingRate,
		OTpayRate: 0,
		attachmentDetails: {},
		billingRate: placement.billingRate,
		billingType: placement.billingRateType,
		discountDetails: {
			name: "",
			type: "",
			value: 0,
		},
		effectiveDate: parseDate(placement.startDate),
		effectiveUntil: parseDate(placement.endDate),
		employeePayRate: 0,
		fixedPay: 0,
		payType: mapPayRateType(placement.payRateType),
		percentage: 0,
		purchaseOrderNumber: placement.pONumber,
	};
	if (placement.payRateType === "Percentage") {
		paymentDetails.percentage = placement.payPercentage;
		// calculate employeePayRate and OTpayRate
		paymentDetails.employeePayRate = Number(
			(placement.billingRate * placement.payPercentage * 0.01).toFixed(2)
		);
		paymentDetails.OTpayRate = placement.oTBillingRate
			? Number(
					(placement.oTBillingRate * placement.payPercentage * 0.01).toFixed(2)
			  )
			: 0;
	} else {
		paymentDetails.fixedPay = placement.payPercentage;
	}

	return paymentDetails;
};

const makeClients = async (
	clientIds: Array<{
		clientId: string;
		type: "Billable Client" | "End Client";
	}>
): Promise<Record<string, Record<string, any>>> => {
	const clients: Record<string, Record<string, any>> = {};
	const promises = clientIds.map(async ({ clientId, type }) => {
		const ref = db.collection(`CLIENTS/${clientId}/CLIENTS_LOCATIONS`);
		const snapshot = await ref.orderBy("createdAt").limit(1).get();
		const locations = snapshot.docs.map((doc) => doc.data());
		return {
			clientId,
			clientType: type,
			comments: "",
			contingencyinPayment: "",
			identification: "",
			liquidatedDamages: "",
			prohibibitionPeriod: "",
			rightToHire: "",
			selectAddress: locations[0]?.id ?? "",
			subContracting: "",
			workLocation: false,
		};
	});
	const results = await Promise.all(promises);
	results.forEach((result) => {
		clients[result.clientId] = result;
	});
	return clients;
};

export const makeInvoiceDetails = async (
	placement: Placement
): Promise<Record<string, any>> => {
	const invoiceDetails: Record<string, any> = {
		OT: false,
		POnumber: false,
		attachFlairExpense: false,
		attachFlairTimesheets: false,
		bcc: [],
		billingAddress: "",
		caluculationType: "",
		cc: [],
		createdAt: new Date(placement.startDate).toISOString(),
		createdBy: adminUserId,
		frequency: rangeFromTimesheetFrequency(
			<TimeSheetFrequency>placement.invoiceFrequency
		),
		frequencyStartDate: parseDate(placement.startDate),
		id: "invoices",
		placementID: placement.jobCode,
		pointOfContactMailId: "",
		pointOfContactName: "",
		pointOfContactPhone: "",
		to: [],
	};
	const contactsRef = db.collection(
		`CLIENTS/${placement.billableClientId}/CLIENTS_CONTACTS`
	);
	const contactsQuerySnapshot = await contactsRef
		.orderBy("createdAt")
		.limit(1)
		.get();
	const contacts = contactsQuerySnapshot.docs.map((doc) => doc.data());
	invoiceDetails.to = [contacts[0]?.id ?? ""];

	const locationsRef = db.collection(
		`CLIENTS/${placement.billableClientId}/CLIENTS_LOCATIONS`
	);
	const locationsQuerySnapshot = await locationsRef
		.orderBy("createdAt")
		.limit(1)
		.get();
	const locations = locationsQuerySnapshot.docs.map((doc) => doc.data());
	invoiceDetails.billingAddress =
		locations.length > 0
			? [
					locations[0].locationsline1,
					locations[0].locationsline2,
					locations[0].locationscity,
					locations[0].locationsstate_name,
					locations[0].locationszip,
			  ]
					.filter(Boolean)
					.join(", ")
			: "";
	return invoiceDetails;
};

export const importPlacements = async () => {
	const placements = await transformPlacementsData();
	console.log(`Total placements to import: ${placements.length}`);
	const promises = placements.map(async (placement) => {
		try {
			// creating general section
			console.log(`Creating general section for ${placement.jobCode}`);
			const placementRef = db
				.collection(`EMPLOYEES/${placement.employeeId}/PLACEMENTS`)
				.doc(placement.jobCode);
			const createdAt = new Date(placement.startDate).toISOString();
			await placementRef.set({
				clientId: placement.billableClientId,
				createdAt: createdAt,
				createdBy: adminUserId,
				description: "",
				draft: false,
				employeeID: placement.employeeId,
				endDate: parseDate(placement.endDate),
				fillableSections: [],
				id: placement.jobCode,
				isExist: true,
				jobTitle: placement.jobTitle,
				metaInfo: {},
				netTerms: placement.netTerms.toString(),
				placementID: placement.jobCode,
				projectEndDate: parseDate(placement.projectEndDate),
				startDate: parseDate(placement.startDate),
				closingReason: "<p></p>",
			});
			// creating work location section
			console.log(`Creating work location section for ${placement.jobCode}`);
			const workLocationRef = placementRef
				.collection("SETTINGS")
				.doc("worklocation");
			await workLocationRef.set({
				amendmentRequired: false,
				city: placement.workLocationCity,
				country: placement.workLocationCountry,
				createdAt: createdAt,
				createdBy: adminUserId,
				email: "",
				id: "worklocation",
				line1: placement.workLocationLine1,
				line2: placement.workLocationLine2,
				managers: [],
				phoneExtension: "",
				phonenumber: "",
				placementID: placement.jobCode,
				state: placement.workLocationState,
				type: placement.workLocationType,
				zip: placement.workLocationZipCode,
			});
			// creating timesheet section
			console.log(`Creating timesheet section for ${placement.jobCode}`);
			const timesheetRef = placementRef
				.collection("SETTINGS")
				.doc("timesheets");
			await timesheetRef.set({
				approvalBy: [adminUserId],
				attachMandatory: false,
				createdAt: createdAt,
				createdBy: adminUserId,
				cycle: [
					{
						date: parseDate(placement.startDate),
						startDay: placement.timeSheetStartDay,
						range: rangeFromTimesheetFrequency(placement.timeSheetFrequency),
					},
				],
				enableTask: false,
				id: "timesheets",
				linkToProject: "",
				makeMandatory: false,
				placementID: placement.jobCode,
			});
			// create client_details section
			console.log(`Creating client_details section for ${placement.jobCode}`);
			const clientDetailsRef = placementRef
				.collection("SETTINGS")
				.doc("client_details");
			await clientDetailsRef.set({
				clients: await makeClients([
					{
						clientId: placement.billableClientId,
						type: "Billable Client",
					},
					{
						clientId: placement.endClientID,
						type: "End Client",
					},
				]),
				createdAt: createdAt,
				createdBy: adminUserId,
				id: "clientdetails",
				placementID: placement.jobCode,
			});
			// create invoices section
			console.log(`Creating invoices section for ${placement.jobCode}`);
			const invoicesRef = placementRef.collection("SETTINGS").doc("invoices");
			await invoicesRef.set(await makeInvoiceDetails(placement));
			// create recruitment_details section
			console.log(
				`Creating recruitment_details section for ${placement.jobCode}`
			);
			const recruitmentDetailsRef = placementRef
				.collection("SETTINGS")
				.doc("recruitment_details");
			await recruitmentDetailsRef.set({
				companyIDs: [adminUserId],
				createdAt: createdAt,
				createdBy: adminUserId,
				id: "recruitment_details",
				placementID: placement.jobCode,
				recruitersList: [],
			});
			// create expense_details section
			console.log(`Creating expense_details section for ${placement.jobCode}`);
			const expenseDetailsRef = placementRef
				.collection("SETTINGS")
				.doc("expense_details");
			await expenseDetailsRef.set({
				approvalBy: [adminUserId],
				createdAt: createdAt,
				createdBy: adminUserId,
				id: "expense_details",
				placementID: placement.jobCode,
			});
			// create payments section
			console.log(`Creating payments section for ${placement.jobCode}`);
			const paymentsRef = placementRef.collection("SETTINGS").doc("payments");
			await paymentsRef.set({
				createdAt: createdAt,
				createdBy: adminUserId,
				data: [getPaymentDetails(placement)],
				id: "payments",
				placementID: placement.jobCode,
			});
			return Promise.resolve(
				`Placement created successfully - ${placement.jobCode}`
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
};
