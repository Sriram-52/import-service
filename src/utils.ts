import Excel from "exceljs";
import moment from "moment";
import { storage } from "./db/admin";
import { v4 as uuidv4 } from "uuid";

export const getCell = (row: Excel.Row, col: number | string) => {
	const cell = row.getCell(col);
	return cell.value?.toString() ?? "";
};

export const adminUserId = "NET000000";
export const reportingManagerId = "NET000025";

export const parseDate = (date: string) => {
	let parsedDate = new Date(date).toISOString();
	return moment(parsedDate, "YYYY-MM-DD").format("MM/DD/YYYY");
};

export const getDayFromDate = (date: string) => {
	let parsedDate = new Date(date).toISOString();
	return moment(parsedDate, "YYYY-MM-DD").format("dddd");
};

export const uploadFile = async (
	filepath: string,
	filename: string,
	storagepath: string
) => {
	const bucket = storage.bucket();
	const response = await bucket.upload(
		`/Users/sriram/Downloads/1685953801_company_backup_6058_185/${filepath}`,
		{
			destination: `${storagepath}/${filename}`,
			metadata: {
				metadata: {
					firebaseStorageDownloadTokens: uuidv4(),
				},
			},
		}
	);
	const [_, metadata] = response;
	const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${
		storage.bucket().name
	}/o/${encodeURIComponent(metadata?.name)}?alt=media`;
	return fileUrl;
};
