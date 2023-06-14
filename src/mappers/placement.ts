import * as path from "path";
import Excel from "exceljs";
import { Invoice, Models } from "../models";
import { adminUserId, getCell, getDayFromDate } from "../utils";

type PlacementsData = {
	general: Models.Placements.General;
	documents: Models.Placements.Documents;
	workLocation: Models.Placements.WorkLocation;
	timesheetDetails: Models.Placements.Timesheet;
	invoiceDetails: Models.Placements.Invoice;
	clientDetails: Models.Placements.ClientDetails;
	recruitmentDetails: Models.Placements.RecruitmentDetails;
	expenseDetails: Models.Placements.ExpenseDetails;
	paymentDetails: Models.Placements.PaymentDetails;
};

export async function transformPlacementsData(): Promise<PlacementsData[]> {
	const filePath = path.join(__dirname, "../../data/placements.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const worksheet = content.getWorksheet(1);
	const rows = worksheet.getRows(2, worksheet.rowCount - 1) ?? [];

	const placementsData: PlacementsData[] = [];

	for (const row of rows) {
		const createdAt = new Date(getCell(row, "G")).toISOString();
		const placementID = getCell(row, "L");
		const employeeID = getCell(row, "C");
		const createdBy = adminUserId;

		const getNetTerms = () => {
			const netTerms = getCell(row, "J");
			if (netTerms.startsWith("N") || netTerms.startsWith("n")) {
				const num = netTerms.replace(/[^0-9]/g, "");
				return num;
			} else if (isNaN(+netTerms)) {
				// +'30' => 30
				return "0";
			}
			return netTerms;
		};

		const general: Models.Placements.General = {
			id: placementID,
			createdAt,
			createdBy,
			placementID,
			employeeID,
			clientId: getCell(row, "I"),
			jobTitle: getCell(row, "D"),
			description: "",
			closingReason: `<p>${getCell(row, "F")}</p>`,
			draft: false,
			endDate: getCell(row, "H"),
			fillableSections: [],
			isExist: true,
			metaInfo: {},
			netTerms: getNetTerms(),
			paidWhenPaid: getNetTerms() === "0",
			projectEndDate: getCell(row, "H"),
			startDate: getCell(row, "G"),
		};
		const documents: Models.Placements.Documents = {
			id: "documents",
			createdAt,
			createdBy,
			placementID,
			documents: [
				{
					documentType: "PO",
					effectiveDate: getCell(row, "G"),
					effectiveUntilDate: getCell(row, "H"),
					status: "Active",
					work_doc: {
						name: (() => {
							const name = getCell(row, "BT");
							const ext = name.split(".").pop();
							return `${name.replace(`.${ext}`, "")}_${createdAt}.${ext}`;
						})(),
						url: getCell(row, "BU").replace(
							"Module_attachment_floders",
							"Module_attachment_folders"
						),
					},
				},
			],
		};
		const workLocation: Models.Placements.WorkLocation = {
			id: "worklocation",
			placementID: getCell(row, "L"),
			amendmentRequired: false,
			city: getCell(row, "BE"),
			country: getCell(row, "BF"),
			createdAt,
			createdBy,
			email: getCell(row, "BA"),
			line1: getCell(row, "BC"),
			line2: getCell(row, "BD"),
			managers: [],
			phoneExtension: "",
			phonenumber: getCell(row, "BB"),
			state: getCell(row, "BG"),
			type: "Onsite",
			zip: getCell(row, "BH"),
		};
		const timesheetDetails: Models.Placements.Timesheet = {
			id: "timesheets",
			approvalBy: [createdBy],
			attachMandatory: getCell(row, "BP") === "Mandatory",
			createdAt,
			createdBy,
			enableTask: false,
			linkToProject: "",
			makeMandatory: getCell(row, "BP") === "Mandatory",
			placementID,
			cycle: [
				{
					date: getCell(row, "G"),
					range:
						Models.Placements.frequencies[
							getCell(row, "BM") as keyof typeof Models.Placements.frequencies
						],
					startDay: getCell(row, "BO"),
				},
			],
		};
		const clientDetails: Models.Placements.ClientDetails = {
			id: "client_details",
			createdAt,
			createdBy,
			placementID,
			clients: [
				{
					clientId: getCell(row, "I"),
					clientType: "Billable Client",
					comments: "",
					contingencyinPayment: "",
					identification: "",
					liquidatedDamages: "",
					prohibibitionPeriod: "",
					rightToHire: "",
					selectAddress: "",
					subContracting: "",
					workLocation: false,
				},
			],
		};
		const invoiceDetails: Models.Placements.Invoice = {
			id: "invoices",
			createdAt,
			createdBy,
			placementID,
			attachFlairExpense: false,
			attachFlairTimesheets: false,
			bcc: [],
			billingAddress: "",
			caluculationType: "",
			cc: [],
			frequency:
				Models.Placements.frequencies[
					getCell(row, "AI") as Models.Placements.InvoiceFrequency
				],
			frequencyStartDate: getCell(row, "AK"),
			OT: getCell(row, "AM") === "Yes",
			POnumber: getCell(row, "AL") === "Yes",
			pointOfContactMailId: "",
			pointOfContactName: "",
			pointOfContactPhone: "",
			to: [],
		};
		const recruitmentDetails: Models.Placements.RecruitmentDetails = {
			companyIDs: [createdBy],
			createdAt,
			createdBy,
			placementID,
			id: "recruitment_details",
			recruitersList: [],
		};
		const expenseDetails: Models.Placements.ExpenseDetails = {
			approvalBy: [createdBy],
			createdAt,
			createdBy,
			placementID,
			id: "expense_details",
		};
		const paymentDetails: Models.Placements.PaymentDetails = {
			createdAt,
			createdBy,
			id: "payments",
			placementID,
			data: (() => {
				const payType: Models.Placements.PayRateType =
					getCell(row, "N") === "Hourly" ? "Hourly" : "FixedPay";

				const billingRate = Number(getCell(row, "AA"));
				const salary = Number(getCell(row, "P"));

				const details: Models.Placements.PaymentHistory = {
					OTbillingRate: 0,
					OTpayRate: 0,
					billingRate,
					billingType: payType === "Hourly" ? "Per Month" : "Per Month",
					effectiveDate: getCell(row, "W"),
					effectiveUntil: getCell(row, "H"),
					employeePayRate: 0,
					fixedPay: 0,
					payType,
					percentage: 0,
					purchaseOrderNumber: "",
				};

				if (payType === "Hourly") {
					const percentage = 75;
					const employeePayRate = Number(
						((billingRate * percentage) / 100).toFixed(2)
					);
					details.percentage = percentage;
					details.employeePayRate = employeePayRate;
				} else {
					details.fixedPay = salary;
				}
				return [details];
			})(),
		};

		placementsData.push({
			clientDetails,
			documents,
			expenseDetails,
			general,
			invoiceDetails,
			paymentDetails,
			recruitmentDetails,
			timesheetDetails,
			workLocation,
		});
	}

	return placementsData;
}
