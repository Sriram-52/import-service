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
	totalWorkingHoursStandard: number;
	totalWorkingHoursOT: number;
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
};
