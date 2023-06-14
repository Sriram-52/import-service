export namespace Models {
	export namespace Placements {
		export type General = {
			clientId: string;
			createdAt: string;
			createdBy: string;
			description: string;
			draft: boolean;
			employeeID: string;
			endDate: string;
			fillableSections: string[];
			id: string;
			isExist: boolean;
			jobTitle: string;
			metaInfo: Record<string, any>;
			netTerms: string;
			paidWhenPaid: boolean;
			placementID: string;
			projectEndDate: string;
			startDate: string;
			closingReason: string;
		};

		export type DocumentsData = {
			documentType: string;
			effectiveDate: string;
			effectiveUntilDate: string;
			status: string;
			work_doc: {
				name: string;
				url: string;
			};
		};

		export type Documents = {
			id: "documents";
			createdAt: string;
			createdBy: string;
			placementID: string;
			documents: DocumentsData[];
		};

		export type WorkLocationType = "Onsite" | "Remote";

		export type WorkLocation = {
			amendmentRequired: boolean;
			city: string;
			country: string;
			createdAt: string;
			createdBy: string;
			email: string;
			id: "worklocation";
			line1: string;
			line2: string;
			managers: string[];
			phoneExtension: string;
			phonenumber: string;
			placementID: string;
			state: string;
			type: WorkLocationType;
			zip: string;
		};

		export type TimesheetCycle = {
			date: string;
			startDay: string;
			range: number;
		};

		export type Timesheet = {
			id: "timesheets";
			placementID: string;
			createdAt: string;
			createdBy: string;
			enableTask: boolean;
			attachMandatory: boolean;
			makeMandatory: boolean;
			cycle: Array<TimesheetCycle>;
			linkToProject: string;
			approvalBy: Array<string>;
		};

		export type ClientType =
			| "End Client"
			| "Prime-Contractor"
			| "Billable Client";

		export type ClientLayer = {
			clientId: string;
			clientType: ClientType;
			comments: string;
			contingencyinPayment: string;
			identification: string;
			liquidatedDamages: string;
			prohibibitionPeriod: string;
			rightToHire: string;
			selectAddress: string;
			subContracting: string;
			workLocation: boolean;
		};

		export type ClientDetails = {
			clients: ClientLayer[];
			createdAt: string;
			createdBy: string;
			id: "client_details";
			placementID: string;
		};

		export const frequencies = {
			Daily: 0,
			"By Dates": 0,
			Weekly: 1,
			Biweekly: 2,
			"Bi-Weekly": 2,
			"Semi-Monthly": 3,
			"Semi Monthly": 3,
			Monthly: 4,
			Dates: 4,
		} as const;

		export type TimeSheetFrequency = keyof typeof frequencies;
		export type InvoiceFrequency = Exclude<
			TimeSheetFrequency,
			"Daily" | "By Dates"
		>;

		export type Invoice = {
			OT: boolean;
			POnumber: boolean;
			attachFlairExpense: boolean;
			attachFlairTimesheets: boolean;
			bcc: Array<string>;
			billingAddress: string;
			caluculationType: string;
			cc: Array<string>;
			createdAt: string;
			createdBy: string;
			frequency: (typeof frequencies)[InvoiceFrequency];
			frequencyStartDate: string;
			id: "invoices";
			placementID: string;
			pointOfContactMailId: string;
			pointOfContactName: string;
			pointOfContactPhone: string;
			to: Array<string>;
		};

		export type RecruitmentDetails = {
			companyIDs: Array<string>;
			createdAt: string;
			createdBy: string;
			id: "recruitment_details";
			placementID: string;
			recruitersList: Array<string>;
		};

		export type ExpenseDetails = {
			id: "expense_details";
			placementID: string;
			createdAt: string;
			createdBy: string;
			approvalBy: Array<string>;
		};

		export type BillingRateType =
			| "Per Hour"
			| "Per Day"
			| "Per Week"
			| "Per Month"
			| "Per Annum";

		export type PayRateType = "Hourly" | "FixedPay";

		export type PaymentHistory = {
			OTbillingRate: number;
			OTpayRate: number;
			attachmentDetails?: {
				name: string;
				url: string;
			};
			billingRate: number;
			billingType: BillingRateType;
			discountDetails?: {
				name: string;
				type: string;
				value: number;
			};
			effectiveDate: string;
			effectiveUntil: string;
			employeePayRate: number;
			fixedPay: number;
			payType: PayRateType;
			percentage: number;
			purchaseOrderNumber: string;
		};

		export type PaymentDetails = {
			id: "payments";
			placementID: string;
			createdAt: string;
			createdBy: string;
			data: Array<PaymentHistory>;
		};
	}

	export type TimeSheets = {
		approvedDetails?: {
			approvedAt: string;
			approvedBy: string;
		};
		rejectedDetails?: {
			rejectedAt: string;
			reason: string;
			rejectedBy: string;
		};
		attachmentDetails: {
			publicURL: string;
			sourcePath: string;
		};
		clientId: string;
		createdAt: string;
		createdBy: string;
		employeeID: string;
		endDate: string;
		id: string;
		invoiceDetails: {
			invoiceIds: string[];
			isInvoiced: boolean;
		};
		isApproved: boolean;
		isDefaulter: boolean;
		isExist: boolean;
		isRejected: boolean;
		placementID: string;
		reportingManger: string;
		startDate: string;
		statusReport: string;
		timesheetDetails: Record<string, any>;
		totalWorkedHours: {
			OT: string;
			standard: string;
		};
		workdetails: {
			OTtime: Array<{
				date: string;
				value: string;
			}>;
			standardTime: Array<{
				date: string;
				value: string;
			}>;
		};
	};

	export type Discount = {
		name: string;
		type: string;
		value: number;
	};

	export type Invoice = {
		additionalInfo: string;
		clientDetails: {
			address: string;
			name: string;
		};
		clientID: string;
		companyDetails: {
			address: string;
			name: string;
		};
		createdAt: string;
		createdBy: string;
		discount: Array<Discount>;
		dueDate: string;
		employeeID: string;
		externalDetails: {
			externalAmount: number;
			toClient: boolean;
		};
		grandTotal: number;
		id: string;
		includeInvoicePDF: boolean;
		invoiceBy: string;
		invoiceDate: string;
		invoiceName: string;
		invoiceSettings: Record<string, any>;
		isClientApproved: boolean;
		isClientRejected: boolean;
		isExist: boolean;
		isMailedToClient: boolean;
		isPaymentDone: boolean;
		isVoid: boolean;
		latestPaymentDate: string;
		netTerms: string;
		notes: string;
		notifiers: {
			bcc: Array<string>;
			cc: Array<string>;
			to: Array<string>;
		};
		payableTo: string;
		paymentDiscountAmount: number;
		placementID: string;
		poNumber: string;
		receivedAmount: number;
		selectedExpenses: Array<any>;
		selectedTimesheets: Record<string, any>;
		statementMemo: string;
		subTotal: number;
	};

	export type PaymentHistory = {
		clientID: string;
		createdAt: string;
		createdBy: string;
		discountDetails: Array<any>;
		id: string;
		invoiceID: string;
		isExist: boolean;
		noReference: boolean;
		otherInfo: {
			attachmentDetails: {
				publicURL: string;
				sourcePath: string;
			};
			paymentType: "online" | "cheque";
			referenceNumber: string;
		};
		paymentAmount: number;
		paymentDate: string;
	};
}

export type Employee = {
	firstName: string;
	lastName: string;
	gender: string;
	email: string;
	phoneNumber: string;
	reportingMangerID: string;
	category: string;
	jobTitle: string;
	dateOfBirth: string;
	department: string;
	payrollId: string;
	branch: string;
	dateOfJoining: string;
	dateOfExit: string;
	exitByID: string;
	reasonOfExit: string;
};

export type ClientCategoryType = "End Client" | "Prime-Contractor";

export type Client = {
	businessName: string;
	email: string;
	contactNumber: string;
	federalId?: string;
	website?: string;
	netTerms: number;
	clientCategory: ClientCategoryType;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	country: string;
	zipCode: string;
	invoiceContactName: string;
	invoiceContactEmail: string;
	invoiceContactPhone: string;
};

export type TimeSheetFrequency =
	| "Daily"
	| "Weekly"
	| "Biweekly"
	| "Semi-Monthly"
	| "Monthly";
export type BillingRateType =
	| "Per Hour"
	| "Per Day"
	| "Per Week"
	| "Per Month"
	| "Per Annum";
export type PayRateType = "Percentage" | "FixedPay";
export type WorkLocationType = "Onsite" | "Remote";

export type Placement = {
	employeeId: string;
	jobCode: string;
	billableClientId: string;
	jobTitle: string;
	netTerms: number;
	startDate: string;
	endDate: string;
	closingReason?: string;
	projectEndDate: string;
	workLocationType: WorkLocationType;
	workLocationLine1: string;
	workLocationLine2?: string;
	workLocationCity: string;
	workLocationState: string;
	workLocationCountry: string;
	workLocationZipCode: string;
	timeSheetFrequency: TimeSheetFrequency;
	timeSheetStartDay: string;
	endClientID: string;
	invoiceFrequency: Omit<TimeSheetFrequency, "Daily">;
	billingRateType: BillingRateType;
	billingRate: number;
	oTBillingRate?: number;
	payRateType: PayRateType;
	payPercentage: number;
	pONumber?: string;
};

export type TimeSheet = {
	employeeId: string;
	jobCode: string;
	fromDate: string;
	toDate: string;
	submittedAt: string;
	submittedBy: string;
	approvedAt: string;
	approvedBy: string;
	totalWorkingHoursStandard: string;
	totalWorkingHoursOT: string;
	reportingManager: string;
};

export type Invoice = {
	employeeId: string;
	jobCode: string;
	activity: string;
	hours: number;
	invoicedAmount: number;
	receivedAmount: number;
	invoicedDate: string;
	invoiceDueDate: string;
	latestPaymentDate: string;
	discountAmount?: number;
	invoiceNumber: string;
	employeeName: string;
};
