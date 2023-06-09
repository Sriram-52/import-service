import Excel from "exceljs";
import moment from "moment";

export const getCell = (row: Excel.Row, col: number) => {
	const cell = row.getCell(col);
	return cell.value?.toString() ?? "";
};

export const adminUserId = "KUBE000000";
export const reportingManagerId = "KUBE000070";

export const parseDate = (date: string) => {
	let parsedDate = new Date(date).toISOString();
	return moment(parsedDate, "YYYY-MM-DD").format("MM/DD/YYYY");
};

export const getDayFromDate = (date: string) => {
	let parsedDate = new Date(date).toISOString();
	return moment(parsedDate, "YYYY-MM-DD").format("dddd");
};
