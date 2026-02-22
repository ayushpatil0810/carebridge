// ============================================================
// CSV Export Utility — Download data as CSV files
// ============================================================

/**
 * Convert an array of objects to CSV string
 * @param {Array<object>} data - Array of row objects
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @returns {string} CSV content
 */
export function toCSV(data, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        let val = row[c.key];
        if (val === null || val === undefined) val = "";
        // Handle Firestore timestamps
        if (val && typeof val === "object" && val.toDate) {
          val = val.toDate().toISOString();
        }
        // Escape double quotes
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(","),
  );
  return [header, ...rows].join("\n");
}

/**
 * Trigger a CSV file download in the browser
 * @param {string} csvContent - CSV string
 * @param {string} filename - Download filename (without extension)
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export visit data as CSV
 */
export function exportVisitsCSV(visits) {
  const columns = [
    { key: "patientId", label: "Patient ID" },
    { key: "patientName", label: "Patient Name" },
    { key: "patientVillage", label: "Village" },
    { key: "chiefComplaint", label: "Chief Complaint" },
    { key: "news2Score", label: "NEWS2 Score" },
    { key: "riskLevel", label: "Risk Level" },
    { key: "status", label: "Status" },
    { key: "emergencyFlag", label: "Emergency" },
    { key: "createdByName", label: "Created By" },
    { key: "createdAt", label: "Created At" },
    { key: "doctorNote", label: "Doctor Note" },
    { key: "phcDecision", label: "PHC Decision" },
  ];
  const csv = toCSV(visits, columns);
  downloadCSV(csv, "carebridge_visits");
}

/**
 * Export performance stats as CSV
 */
export function exportPerformanceCSV(stats, type = "asha") {
  if (type === "asha") {
    const columns = [
      { key: "name", label: "ASHA Worker" },
      { key: "totalCases", label: "Total Cases" },
      { key: "reviewedCases", label: "Reviewed Cases" },
      { key: "redCases", label: "Red Cases" },
      { key: "yellowCases", label: "Yellow Cases" },
      { key: "greenCases", label: "Green Cases" },
      { key: "avgResponseTimeFormatted", label: "Avg Response Time" },
      { key: "approvalRate", label: "Approval Rate (%)" },
    ];
    const csv = toCSV(stats, columns);
    downloadCSV(csv, "carebridge_asha_performance");
  } else {
    const columns = [
      { key: "name", label: "PHC Doctor" },
      { key: "casesReviewed", label: "Cases Reviewed" },
      { key: "avgResponseTimeFormatted", label: "Avg Response Time" },
      { key: "approvalsGiven", label: "Approvals Given" },
      { key: "monitoringAssigned", label: "Monitoring Assigned" },
    ];
    const csv = toCSV(stats, columns);
    downloadCSV(csv, "carebridge_phc_performance");
  }
}

/**
 * Export village-level case load data
 */
export function exportVillageCaseLoadCSV(villageCaseLoad) {
  const columns = [
    { key: "village", label: "Village" },
    { key: "total", label: "Total Cases" },
    { key: "red", label: "Red Cases" },
    { key: "yellow", label: "Yellow Cases" },
    { key: "green", label: "Green Cases" },
    { key: "pending", label: "Pending Review" },
  ];
  const csv = toCSV(villageCaseLoad, columns);
  downloadCSV(csv, "carebridge_village_caseload");
}
