import { db } from "../db/admin";
import { transformPlacementsData } from "../mappers/placement";
import { uploadFile } from "../utils";

export const importPlacements = async () => {
	const placements = await transformPlacementsData();
	console.log(`Total placements to import: ${placements.length}`);
	for await (const placement of placements) {
		try {
			console.log(
				`Creating general section for ${placement.general.placementID}`
			);
			const placementRef = db
				.collection(`EMPLOYEES/${placement.general.employeeID}/PLACEMENTS`)
				.doc(placement.general.placementID);
			await placementRef.set(placement.general);

			console.log(
				`Creating documents section for ${placement.general.placementID}`
			);
			const documentsSection = placement.documents;
			const documentsRef = placementRef
				.collection("SETTINGS")
				.doc(documentsSection.id);
			for await (const document of documentsSection.documents) {
				if (!document.work_doc.url) {
					continue;
				}
				const url = await uploadFile(
					document.work_doc.url,
					document.work_doc.name,
					`Placements/${placement.general.placementID}/Documents`
				);
				document.work_doc.url = url;
			}
			await documentsRef.set(documentsSection);

			console.log(
				`Creating work location section for ${placement.general.placementID}`
			);
			const workLocationSection = placement.workLocation;
			const workLocationRef = placementRef
				.collection("SETTINGS")
				.doc(workLocationSection.id);
			await workLocationRef.set(workLocationSection);

			console.log(
				`Creating timesheet section for ${placement.general.placementID}`
			);
			const timesheetSection = placement.timesheetDetails;
			const timesheetRef = placementRef
				.collection("SETTINGS")
				.doc(timesheetSection.id);
			await timesheetRef.set(timesheetSection);

			console.log(
				`Creating client_details section for ${placement.general.placementID}`
			);
			const clientDetailsSection = placement.clientDetails;
			const clientDetailsRef = placementRef
				.collection("SETTINGS")
				.doc(clientDetailsSection.id);
			const ref = db.collection(
				`CLIENTS/${placement.general.clientId}/CLIENTS_LOCATIONS`
			);
			const snapshot = await ref.orderBy("createdAt").limit(1).get();
			const locations = snapshot.docs.map((doc) => doc.data());
			clientDetailsSection.clients[0].selectAddress = locations[0]?.id || "";
			await clientDetailsRef.set(clientDetailsSection);

			console.log(
				`Creating invoices section for ${placement.general.placementID}`
			);
			const invoicesSection = placement.invoiceDetails;
			const invoicesRef = placementRef
				.collection("SETTINGS")
				.doc(invoicesSection.id);
			await invoicesRef.set(invoicesSection);

			console.log(
				`Creating recruitment_details section for ${placement.general.placementID}`
			);
			const recruitmentDetailsSection = placement.recruitmentDetails;
			const recruitmentDetailsRef = placementRef
				.collection("SETTINGS")
				.doc(recruitmentDetailsSection.id);
			await recruitmentDetailsRef.set(recruitmentDetailsSection);

			console.log(
				`Creating expense_details section for ${placement.general.placementID}`
			);
			const expenseDetailsSection = placement.expenseDetails;
			const expenseDetailsRef = placementRef
				.collection("SETTINGS")
				.doc(expenseDetailsSection.id);
			await expenseDetailsRef.set(expenseDetailsSection);

			console.log(
				`Creating payment_details section for ${placement.general.placementID}`
			);
			const paymentDetailsSection = placement.paymentDetails;
			const paymentDetailsRef = placementRef
				.collection("SETTINGS")
				.doc(paymentDetailsSection.id);
			await paymentDetailsRef.set(paymentDetailsSection);

			console.log(`Successfully imported ${placement.general.placementID}`);
			console.log("--------------------------------------------------");
		} catch (error) {
			console.log(`Error importing ${placement.general.placementID}`);
			console.log(error);
			console.log("--------------------------------------------------");
		}
	}
};
