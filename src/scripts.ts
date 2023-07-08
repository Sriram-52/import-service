import { db } from "./db/admin";
import * as fs from "fs";

interface Employee {
	employeeData: Record<string, any>;
	placements: Record<string, any>[];
}

async function addLookupDataToEmployees() {
	const data: Record<string, Employee> = {};

	// step 1: get all employees
	(await db.collection("EMPLOYEES").get()).docs.forEach(
		(doc) =>
			(data[doc.id] = {
				...data[doc.id],
				employeeData: {
					...doc.data()?.personal,
					status: doc.data()?.status,
					employeeStatus: doc.data()?.employeeStatus,
				},
			})
	);

	// step 2: get all employee's placements
	const promises = Object.keys(data).map(async (empId) => {
		const data = await db
			.collection(`EMPLOYEES/${empId}/PLACEMENTS`)
			.where("draft", "==", false)
			.where("isExist", "==", true)
			.get();
		return { empId, data };
	});
	const placementsData = await Promise.all(promises);
	placementsData.forEach((placement) => {
		data[placement.empId] = {
			...data[placement.empId],
			placements: placement.data.docs
				.map((doc) => ({
					startDate: doc.data()?.startDate,
					endDate: doc.data()?.endDate,
					closingReason: doc.data()?.closingReason,
					placementId: doc.id,
				}))
				.filter((p) => !p.placementId.startsWith("J")),
		};
	});

	/**
	 * Step 3: Main logic
	 * Algorithm:
	 * 1. For each employee, first mark the employeeStatus as "Training" with the date as joiningdate of the employee
	 * 2. Now, sort the placements of the employee in ascending order of startDate
	 * 3. For the first placement, mark the employeeStatus as "Working" with the date as startDate of the placement
	 * 4. Now, we need to check if he is on bench between the first placement and the second placement
	 *    by checking if the endDate of the first placement is less than the startDate of the second placement
	 *    and also check if there is any placement is active between the first placement and the second placement
	 *    i.e by checking the endDate of the first placement should not lie between the startDate and endDate of any rest placement
	 * 5. If both the above conditions are true, then mark the employeeStatus as "Bench" with the date as endDate of the first placement
	 */
	const lookupData: Record<
		string,
		{
			history: any[];
		}
	> = {};
	Object.keys(data).forEach((empId) => {
		const { employeeData, placements } = data[empId];

		if (employeeData.dateofjoining) {
			lookupData[empId] = {
				history: [
					{
						date: new Date(employeeData.dateofjoining).toISOString(),
						employeeStatus: "Training",
					},
				],
			};
		}

		// step 2
		const sortedPlacements = [...placements].sort(
			(a, b) =>
				new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		);
		/**
		 * PC-1 01/01/2022 - 12/31/2022  closed (1)
		 * PC-3 01/01/2023 - 04/30/2023  closed (3)
		 * PC-2 05/15/2022 - 12/30/2023         (2)
		 */
		for (const placement of sortedPlacements) {
			const history: any[] = lookupData[empId]?.history || [];

			// step 3
			if (
				history.length === 1 ||
				history[history.length - 1]?.employeeStatus !== "Working"
			) {
				console.log(`placement - ${placement.placementId} - ${empId}`);
				lookupData[empId] = {
					...lookupData[empId],
					history: [
						...(lookupData[empId]?.history || []),
						{
							date: new Date(placement.startDate).toISOString(),
							employeeStatus: "Working",
							placementId: placement.placementId, // PC-1
						},
					],
				};
			}

			if (placements.length === 1) {
				if (placement?.closingReason) {
					lookupData[empId] = {
						history: [
							...(lookupData[empId]?.history || []),
							{
								date: new Date(placement.endDate).toISOString(),
								employeeStatus: "Bench",
								placementId: placement.placementId,
							},
						],
					};
				}
			} else if (
				placement?.closingReason && // PC-1
				placements
					.filter(
						(i) => i.placementId !== placement.placementId && i?.closingReason
					)
					.some(
						(p) =>
							new Date(placement.endDate).getTime() > // 05/31/2022
								new Date(p.startDate).getTime() && // 07/13/2022
							new Date(placement.endDate).getTime() < // 05/31/2022
								new Date(p.endDate).getTime() // 04/30/2023
					)
			) {
				// step 5
				lookupData[empId] = {
					...lookupData[empId],
					history: [
						...(lookupData[empId]?.history || []),
						{
							date: new Date(placement.endDate).toISOString(),
							employeeStatus: "Bench",
							placementId: placement.placementId,
						},
					],
				};
			}
		}

		// step 6
		if (
			lookupData[empId]?.history[lookupData[empId]?.history.length - 1]
				?.employeeStatus === "Working"
		) {
			if (placements.every((p) => p?.closingReason)) {
				const sortedPlacementsByEndDate = [...placements].sort(
					(a, b) =>
						new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
				);
				if (sortedPlacementsByEndDate[0]) {
					lookupData[empId] = {
						...lookupData[empId],
						history: [
							...(lookupData[empId]?.history || []),
							{
								date: new Date(
									sortedPlacementsByEndDate[0].endDate
								).toISOString(),
								employeeStatus: "Bench",
								placementId: sortedPlacementsByEndDate[0].placementId,
							},
						],
					};
				}
			}
		}
	});

	const lookUpPromises = Object.keys(lookupData).map((empId) => {
		const lookUpRef = db
			.collection(`EMPLOYEES/${empId}/LOOKUP`)
			.doc("employee_status");
		return lookUpRef.set({
			id: lookUpRef.id,
			info: lookupData[empId].history.map((h) => ({
				createdAt: h.date,
				status: h.employeeStatus,
			})),
		});
	});

	const settleResults = await Promise.allSettled(lookUpPromises);
	settleResults.forEach((result) => {
		if (result.status === "rejected") {
			console.log(result.reason);
		}
	});

	// // step 4: write the lookup data whose current employeeStatus is "Working" to a file
	// const workingEmployees = Object.keys(lookupData);
	// // .filter(
	// // 	(empId) => lookupData[empId].history.at(-1)?.employeeStatus === "Working"
	// // );
	// const workingEmployeesData = workingEmployees.map((empId) => ({
	// 	empId,
	// 	...lookupData[empId].history[lookupData[empId].history.length - 1],
	// }));
	// fs.writeFileSync(
	// 	"./workingEmployees.json",
	// 	JSON.stringify(workingEmployeesData, null, 2)
	// );
	// fs.writeFileSync("./lookUpData.json", JSON.stringify(lookupData, null, 2));
}

addLookupDataToEmployees();
