// ============================================================
// Vaccination Service — Firestore CRUD for Immunization Tracking
// Sub-collection: patients/{patientId}/vaccinations
// ============================================================

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const PATIENTS = "patients";
const VACCINATIONS = "vaccinations";

// ═══════════════════════════════════════════════════
// VACCINE MASTER LISTS — India National Immunization Schedule
// ═══════════════════════════════════════════════════

/**
 * Child vaccine schedule (age-based, in weeks from birth)
 */
export const CHILD_VACCINES = [
  {
    key: "bcg",
    name: "BCG",
    dose: 1,
    weeksDue: 0,
    category: "child",
    label_mr: "बीसीजी",
  },
  {
    key: "opv0",
    name: "OPV",
    dose: 0,
    weeksDue: 0,
    category: "child",
    label_mr: "ओपीव्ही-0",
  },
  {
    key: "hepb1",
    name: "Hepatitis B",
    dose: 1,
    weeksDue: 0,
    category: "child",
    label_mr: "हिपॅटायटिस बी-1",
  },
  {
    key: "opv1",
    name: "OPV",
    dose: 1,
    weeksDue: 6,
    category: "child",
    label_mr: "ओपीव्ही-1",
  },
  {
    key: "penta1",
    name: "Pentavalent",
    dose: 1,
    weeksDue: 6,
    category: "child",
    label_mr: "पेन्टाव्हॅलेंट-1",
  },
  {
    key: "hepb2",
    name: "Hepatitis B",
    dose: 2,
    weeksDue: 6,
    category: "child",
    label_mr: "हिपॅटायटिस बी-2",
  },
  {
    key: "opv2",
    name: "OPV",
    dose: 2,
    weeksDue: 10,
    category: "child",
    label_mr: "ओपीव्ही-2",
  },
  {
    key: "penta2",
    name: "Pentavalent",
    dose: 2,
    weeksDue: 10,
    category: "child",
    label_mr: "पेन्टाव्हॅलेंट-2",
  },
  {
    key: "opv3",
    name: "OPV",
    dose: 3,
    weeksDue: 14,
    category: "child",
    label_mr: "ओपीव्ही-3",
  },
  {
    key: "penta3",
    name: "Pentavalent",
    dose: 3,
    weeksDue: 14,
    category: "child",
    label_mr: "पेन्टाव्हॅलेंट-3",
  },
  {
    key: "hepb3",
    name: "Hepatitis B",
    dose: 3,
    weeksDue: 14,
    category: "child",
    label_mr: "हिपॅटायटिस बी-3",
  },
  {
    key: "mr1",
    name: "Measles / MR",
    dose: 1,
    weeksDue: 39,
    category: "child",
    label_mr: "गोवर / एमआर-1",
  }, // 9 months
  {
    key: "mr2",
    name: "Measles / MR",
    dose: 2,
    weeksDue: 70,
    category: "child",
    label_mr: "गोवर / एमआर-2",
  }, // 16-24 months
  {
    key: "dpt_booster1",
    name: "DPT Booster",
    dose: 1,
    weeksDue: 70,
    category: "child",
    label_mr: "डीपीटी बूस्टर-1",
  }, // 16-24 months
  {
    key: "dpt_booster2",
    name: "DPT Booster",
    dose: 2,
    weeksDue: 260,
    category: "child",
    label_mr: "डीपीटी बूस्टर-2",
  }, // 5 years
];

/**
 * Maternal (pregnancy) vaccine schedule (weeks from registration/LMP)
 */
export const MATERNAL_VACCINES = [
  {
    key: "tt1",
    name: "TT1 (Tetanus Toxoid)",
    dose: 1,
    weeksDue: 0,
    category: "maternal",
    label_mr: "टीटी-1",
  },
  {
    key: "tt2",
    name: "TT2 (Tetanus Toxoid)",
    dose: 2,
    weeksDue: 4,
    category: "maternal",
    label_mr: "टीटी-2",
  },
  {
    key: "tt_boost",
    name: "TT Booster",
    dose: 3,
    weeksDue: 36,
    category: "maternal",
    label_mr: "टीटी बूस्टर",
  },
];

/** Combined master list */
export const ALL_VACCINES = [...CHILD_VACCINES, ...MATERNAL_VACCINES];

// ═══════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════

/**
 * Determine vaccine status from scheduled date and given date
 */
export function getVaccineStatus(scheduledDate, givenDate) {
  if (givenDate) return "completed";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sched = new Date(scheduledDate);
  sched.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((sched - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due";
  return "upcoming";
}

/**
 * Get number of days overdue (negative if not yet due)
 */
export function getDaysOverdue(scheduledDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sched = new Date(scheduledDate);
  sched.setHours(0, 0, 0, 0);
  return Math.floor((now - sched) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════

/**
 * Get all vaccinations for a patient
 */
export async function getVaccinations(patientId) {
  const colRef = collection(db, PATIENTS, patientId, VACCINATIONS);
  const snap = await getDocs(colRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const sa = new Date(a.scheduledDate || 0).getTime();
      const sb = new Date(b.scheduledDate || 0).getTime();
      return sa - sb;
    });
}

/**
 * Mark a vaccine as given
 */
export async function markVaccineGiven(patientId, vaccineDocId, data) {
  const docRef = doc(db, PATIENTS, patientId, VACCINATIONS, vaccineDocId);
  await updateDoc(docRef, {
    status: "completed",
    givenDate: data.givenDate || new Date().toISOString(),
    notes: data.notes || "",
    updatedBy: data.updatedBy || "",
    updatedAt: Timestamp.now(),
  });
}

/**
 * Auto-schedule child vaccines based on date of birth
 */
export async function autoScheduleChildVaccines(
  patientId,
  dateOfBirth,
  createdBy,
) {
  const dob = new Date(dateOfBirth);
  const batch = writeBatch(db);
  const colRef = collection(db, PATIENTS, patientId, VACCINATIONS);

  // Check existing vaccines first
  const existing = await getVaccinations(patientId);
  const existingKeys = new Set(existing.map((v) => v.vaccineKey));

  let scheduled = 0;
  CHILD_VACCINES.forEach((vax) => {
    if (existingKeys.has(vax.key)) return; // Skip already scheduled

    const scheduledDate = new Date(dob);
    scheduledDate.setDate(scheduledDate.getDate() + vax.weeksDue * 7);

    const newDocRef = doc(colRef);
    batch.set(newDocRef, {
      vaccineKey: vax.key,
      vaccineName: vax.name,
      doseNumber: vax.dose,
      category: "child",
      scheduledDate: scheduledDate.toISOString(),
      givenDate: null,
      status: getVaccineStatus(scheduledDate, null),
      notes: "",
      createdBy: createdBy || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    scheduled++;
  });

  if (scheduled > 0) await batch.commit();
  return scheduled;
}

/**
 * Auto-schedule maternal vaccines based on registration date
 */
export async function autoScheduleMaternalVaccines(
  patientId,
  registrationDate,
  createdBy,
) {
  const regDate = new Date(registrationDate);
  const batch = writeBatch(db);
  const colRef = collection(db, PATIENTS, patientId, VACCINATIONS);

  // Check existing vaccines first
  const existing = await getVaccinations(patientId);
  const existingKeys = new Set(existing.map((v) => v.vaccineKey));

  let scheduled = 0;
  MATERNAL_VACCINES.forEach((vax) => {
    if (existingKeys.has(vax.key)) return;

    const scheduledDate = new Date(regDate);
    scheduledDate.setDate(scheduledDate.getDate() + vax.weeksDue * 7);

    const newDocRef = doc(colRef);
    batch.set(newDocRef, {
      vaccineKey: vax.key,
      vaccineName: vax.name,
      doseNumber: vax.dose,
      category: "maternal",
      scheduledDate: scheduledDate.toISOString(),
      givenDate: null,
      status: getVaccineStatus(scheduledDate, null),
      notes: "",
      createdBy: createdBy || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    scheduled++;
  });

  if (scheduled > 0) await batch.commit();
  return scheduled;
}

/**
 * Get ALL due/overdue vaccinations across ALL patients (admin/PHC — no user filter)
 * Returns enriched records with patient info
 */
export async function getAllDueVaccinations() {
  const patientsSnap = await getDocs(collection(db, PATIENTS));
  const results = [];

  await Promise.all(
    patientsSnap.docs.map(async (patDoc) => {
      const patData = patDoc.data();
      const vaxSnap = await getDocs(
        collection(db, PATIENTS, patDoc.id, VACCINATIONS),
      );
      vaxSnap.docs.forEach((vaxDoc) => {
        const vax = vaxDoc.data();
        if (vax.givenDate) return; // Already completed

        const status = getVaccineStatus(vax.scheduledDate, null);
        if (status === "due" || status === "overdue") {
          results.push({
            id: vaxDoc.id,
            ...vax,
            patientDocId: patDoc.id,
            patientName: patData.name || "",
            patientAge: patData.age || "",
            patientVillage: patData.village || "",
            patientContact: patData.contact || "",
            computedStatus: status,
            daysOverdue: getDaysOverdue(vax.scheduledDate),
          });
        }
      });
    }),
  );

  // Sort: overdue first (most overdue at top), then due
  return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Get due/overdue vaccinations only for patients registered by a specific ASHA worker
 */
export async function getDueVaccinationsByUser(userId) {
  const q = query(collection(db, PATIENTS), where("createdBy", "==", userId));
  const patientsSnap = await getDocs(q);
  const results = [];

  await Promise.all(
    patientsSnap.docs.map(async (patDoc) => {
      const patData = patDoc.data();
      const vaxSnap = await getDocs(
        collection(db, PATIENTS, patDoc.id, VACCINATIONS),
      );
      vaxSnap.docs.forEach((vaxDoc) => {
        const vax = vaxDoc.data();
        if (vax.givenDate) return;

        const status = getVaccineStatus(vax.scheduledDate, null);
        if (status === "due" || status === "overdue") {
          results.push({
            id: vaxDoc.id,
            ...vax,
            patientDocId: patDoc.id,
            patientName: patData.name || "",
            patientAge: patData.age || "",
            patientVillage: patData.village || "",
            patientContact: patData.contact || "",
            computedStatus: status,
            daysOverdue: getDaysOverdue(vax.scheduledDate),
          });
        }
      });
    }),
  );

  return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Build WhatsApp reminder URL (pre-filled, does not auto-send)
 */
export function buildVaccineReminderURL(
  patientName,
  vaccineName,
  scheduledDate,
  phone,
) {
  const dateStr = new Date(scheduledDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const message = encodeURIComponent(
    `Namaste! Reminder for ${patientName}:\n\n` +
      `💉 Vaccine: ${vaccineName}\n` +
      `📅 Due Date: ${dateStr}\n\n` +
      `Please visit your nearest PHC/Sub-centre.\n` +
      `— CareBridge ASHA Worker`,
  );
  const cleanPhone = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${cleanPhone ? "91" + cleanPhone : ""}?text=${message}`;
}

/**
 * Get village-level vaccination summary for PHC oversight.
 * Returns: { villages: [...], patients: [...], totals }
 */
export async function getVillageVaccinationSummary() {
  const patientsSnap = await getDocs(collection(db, PATIENTS));
  const villageMap = {}; // village -> { totalChildren, fullyVaccinated, due, overdue }
  const patientList = []; // enriched patient records

  await Promise.all(
    patientsSnap.docs.map(async (patDoc) => {
      const pat = patDoc.data();
      const vaxSnap = await getDocs(
        collection(db, PATIENTS, patDoc.id, VACCINATIONS),
      );
      if (vaxSnap.empty) return; // skip patients without vaccination records

      const village = pat.village || "Unknown";
      if (!villageMap[village])
        villageMap[village] = {
          village,
          totalChildren: 0,
          fullyVaccinated: 0,
          due: 0,
          overdue: 0,
        };

      const vaccines = vaxSnap.docs.map((d) => {
        const v = d.data();
        return {
          id: d.id,
          ...v,
          computedStatus: getVaccineStatus(v.scheduledDate, v.givenDate),
          daysOverdue: getDaysOverdue(v.scheduledDate),
        };
      });

      let completed = 0,
        due = 0,
        overdue = 0;
      vaccines.forEach((v) => {
        if (v.computedStatus === "completed") completed++;
        else if (v.computedStatus === "due") due++;
        else if (v.computedStatus === "overdue") overdue++;
      });

      const isChild = (pat.age || 99) <= 5;
      if (isChild) {
        villageMap[village].totalChildren++;
        if (overdue === 0 && due === 0 && vaccines.length > 0)
          villageMap[village].fullyVaccinated++;
      }
      villageMap[village].due += due;
      villageMap[village].overdue += overdue;

      patientList.push({
        patientDocId: patDoc.id,
        name: pat.name || "",
        age: pat.age || "",
        gender: pat.gender || "",
        village,
        contact: pat.contact || "",
        vaccines,
        totalVaccines: vaccines.length,
        completed,
        due,
        overdue,
        // NEWS2 data (latest) for missed-immunization alert
        latestNews2: pat.latestNews2Score ?? null,
        latestRiskLevel: pat.latestRiskLevel ?? null,
      });
    }),
  );

  const villages = Object.values(villageMap).sort(
    (a, b) => b.overdue - a.overdue,
  );
  const totals = villages.reduce(
    (acc, v) => ({
      totalChildren: acc.totalChildren + v.totalChildren,
      fullyVaccinated: acc.fullyVaccinated + v.fullyVaccinated,
      due: acc.due + v.due,
      overdue: acc.overdue + v.overdue,
    }),
    { totalChildren: 0, fullyVaccinated: 0, due: 0, overdue: 0 },
  );

  return { villages, patients: patientList, totals };
}

/**
 * Admin-level vaccination governance summary.
 * Returns: { villageStats, ashaStats, monthlyTrend, ttCoverage, totals, alerts }
 */
export async function getAdminVaccinationSummary() {
  const patientsSnap = await getDocs(collection(db, PATIENTS));
  const villageMap = {}; // village -> aggregated stats
  const ashaMap = {}; // createdBy -> { name, total, completed }
  const monthlyCompleted = {}; // 'YYYY-MM' -> count
  let ttTotal = 0,
    ttCompleted = 0; // TT coverage
  let totalOverdueDays = 0,
    overdueCount = 0;

  await Promise.all(
    patientsSnap.docs.map(async (patDoc) => {
      const pat = patDoc.data();
      const vaxSnap = await getDocs(
        collection(db, PATIENTS, patDoc.id, VACCINATIONS),
      );
      if (vaxSnap.empty) return;

      const village = pat.village || "Unknown";
      if (!villageMap[village])
        villageMap[village] = {
          village,
          totalEligible: 0,
          fullyVaccinated: 0,
          totalVax: 0,
          completed: 0,
          due: 0,
          overdue: 0,
          ttTotal: 0,
          ttCompleted: 0,
          totalOverdueDays: 0,
          overdueCount: 0,
        };
      const vs = villageMap[village];

      const isChild = (pat.age || 99) <= 5;
      if (isChild) vs.totalEligible++;

      let patCompleted = 0,
        patDue = 0,
        patOverdue = 0;

      vaxSnap.docs.forEach((vaxDoc) => {
        const v = vaxDoc.data();
        const status = getVaccineStatus(v.scheduledDate, v.givenDate);

        vs.totalVax++;
        if (status === "completed") {
          vs.completed++;
          patCompleted++;

          // Monthly trend
          if (v.givenDate) {
            const month = v.givenDate.substring(0, 7); // 'YYYY-MM'
            monthlyCompleted[month] = (monthlyCompleted[month] || 0) + 1;
          }
        } else if (status === "due") {
          vs.due++;
          patDue++;
        } else if (status === "overdue") {
          vs.overdue++;
          patOverdue++;
          const days = getDaysOverdue(v.scheduledDate);
          vs.totalOverdueDays += days;
          vs.overdueCount++;
          totalOverdueDays += days;
          overdueCount++;
        }

        // TT coverage
        if (v.category === "maternal") {
          ttTotal++;
          vs.ttTotal++;
          if (status === "completed") {
            ttCompleted++;
            vs.ttCompleted++;
          }
        }

        // ASHA tracking
        const asha = v.createdBy || "Unassigned";
        if (!ashaMap[asha])
          ashaMap[asha] = { name: asha, total: 0, completed: 0 };
        ashaMap[asha].total++;
        if (status === "completed") ashaMap[asha].completed++;
      });

      if (isChild && patOverdue === 0 && patDue === 0 && patCompleted > 0)
        vs.fullyVaccinated++;
    }),
  );

  // Build village stats with percentages
  const villageStats = Object.values(villageMap)
    .map((vs) => ({
      ...vs,
      fullyVaccinatedPct:
        vs.totalEligible > 0
          ? Math.round((vs.fullyVaccinated / vs.totalEligible) * 100)
          : 0,
      duePct: vs.totalVax > 0 ? Math.round((vs.due / vs.totalVax) * 100) : 0,
      overduePct:
        vs.totalVax > 0 ? Math.round((vs.overdue / vs.totalVax) * 100) : 0,
      ttCoveragePct:
        vs.ttTotal > 0 ? Math.round((vs.ttCompleted / vs.ttTotal) * 100) : null,
      avgOverdueDays:
        vs.overdueCount > 0
          ? Math.round(vs.totalOverdueDays / vs.overdueCount)
          : 0,
    }))
    .sort((a, b) => b.overdue - a.overdue);

  // ASHA stats with completion rate
  const ashaStats = Object.values(ashaMap)
    .map((a) => ({
      ...a,
      completionRate:
        a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0,
    }))
    .sort((a, b) => a.completionRate - b.completionRate);

  // Monthly trend sorted chronologically
  const monthlyTrend = Object.entries(monthlyCompleted)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // Totals
  const allVax = villageStats.reduce((s, v) => s + v.totalVax, 0);
  const allCompleted = villageStats.reduce((s, v) => s + v.completed, 0);
  const allDue = villageStats.reduce((s, v) => s + v.due, 0);
  const allOverdue = villageStats.reduce((s, v) => s + v.overdue, 0);
  const allEligible = villageStats.reduce((s, v) => s + v.totalEligible, 0);
  const allFullyVacc = villageStats.reduce((s, v) => s + v.fullyVaccinated, 0);
  const totals = {
    totalVax: allVax,
    completed: allCompleted,
    due: allDue,
    overdue: allOverdue,
    totalEligible: allEligible,
    fullyVaccinated: allFullyVacc,
    coveragePct:
      allEligible > 0 ? Math.round((allFullyVacc / allEligible) * 100) : 0,
    overduePct: allVax > 0 ? Math.round((allOverdue / allVax) * 100) : 0,
    avgOverdueDays:
      overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0,
    ttCoveragePct: ttTotal > 0 ? Math.round((ttCompleted / ttTotal) * 100) : 0,
  };

  // Alerts: villages with overdue% > 20%
  const alerts = villageStats.filter((v) => v.overduePct > 20);

  return { villageStats, ashaStats, monthlyTrend, totals, alerts };
}
