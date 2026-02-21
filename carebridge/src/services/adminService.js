// ============================================================
// Admin Service — Aggregation functions for admin dashboards
// All computed client-side from visits data
// ============================================================

/**
 * PHC-wise summary table (Feature 1)
 * Groups visits by the PHC doctor who reviewed them (or 'Unassigned')
 */
export function getPHCSummary(visits) {
    const phcMap = {};

    visits.forEach((v) => {
        // Use reviewedBy as PHC identifier, fallback to 'Unassigned'
        const phc = v.reviewedBy || 'Unassigned';
        if (!phcMap[phc]) {
            phcMap[phc] = {
                name: phc,
                totalCases: 0,
                highNEWS2: 0,
                escalated: 0,
                approvedReferrals: 0,
                underMonitoring: 0,
                pending: 0,
            };
        }
        phcMap[phc].totalCases++;
        if (v.riskLevel === 'Red' || (v.news2Score && v.news2Score >= 7)) {
            phcMap[phc].highNEWS2++;
        }
        if (v.status === 'Pending PHC Review' || v.reviewRequestedAt) {
            phcMap[phc].escalated++;
        }
        if (v.status === 'Referral Approved') phcMap[phc].approvedReferrals++;
        if (v.status === 'Under Monitoring') phcMap[phc].underMonitoring++;
        if (v.status === 'Pending PHC Review') phcMap[phc].pending++;
    });

    return Object.values(phcMap).sort((a, b) => b.totalCases - a.totalCases);
}

/**
 * Global summary (Feature 2)
 */
export function getGlobalSummary(visits) {
    return {
        totalCases: visits.length,
        highRiskCases: visits.filter(
            (v) => v.riskLevel === 'Red' || (v.news2Score && v.news2Score >= 7)
        ).length,
        pendingSecondOpinions: visits.filter(
            (v) => v.status === 'Pending PHC Review'
        ).length,
        referralsApproved: visits.filter(
            (v) => v.status === 'Referral Approved'
        ).length,
        underMonitoring: visits.filter(
            (v) => v.status === 'Under Monitoring'
        ).length,
        awaitingClarification: visits.filter(
            (v) => v.status === 'Awaiting ASHA Response'
        ).length,
    };
}

/**
 * PHC risk indicators — controlled risk load % (Feature 3)
 * Green = <20% high NEWS2, Yellow = 20–40%, Red = >40%
 */
export function getPHCRiskIndicators(visits) {
    const phcMap = {};

    visits.forEach((v) => {
        const phc = v.reviewedBy || v.createdByName || 'Unknown';
        if (!phcMap[phc]) {
            phcMap[phc] = { name: phc, total: 0, highRisk: 0 };
        }
        phcMap[phc].total++;
        if (v.riskLevel === 'Red' || (v.news2Score && v.news2Score >= 7)) {
            phcMap[phc].highRisk++;
        }
    });

    return Object.values(phcMap).map((p) => {
        const pct = p.total > 0 ? Math.round((p.highRisk / p.total) * 100) : 0;
        let level = 'green';
        if (pct >= 40) level = 'red';
        else if (pct >= 20) level = 'yellow';
        return { ...p, highRiskPct: pct, level };
    });
}

/**
 * High NEWS2 counts per PHC (Feature 4)
 */
export function getHighNEWS2ByPHC(visits) {
    const map = {};
    visits.forEach((v) => {
        if (v.riskLevel !== 'Red' && !(v.news2Score && v.news2Score >= 7)) return;
        const phc = v.reviewedBy || 'Unassigned';
        map[phc] = (map[phc] || 0) + 1;
    });
    return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * High NEWS2 counts per village (Feature 4)
 */
export function getHighNEWS2ByVillage(visits) {
    const map = {};
    visits.forEach((v) => {
        if (v.riskLevel !== 'Red' && !(v.news2Score && v.news2Score >= 7)) return;
        const village = v.patientVillage || 'Unknown';
        map[village] = (map[village] || 0) + 1;
    });
    return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * PHC response time analytics (Feature 5)
 */
export function getPHCResponseTimes(visits) {
    const phcMap = {};

    visits.forEach((v) => {
        if (!v.responseTimeMs || !v.reviewedBy) return;
        const phc = v.reviewedBy;
        if (!phcMap[phc]) {
            phcMap[phc] = { name: phc, totalMs: 0, count: 0, times: [] };
        }
        phcMap[phc].totalMs += v.responseTimeMs;
        phcMap[phc].count++;
        phcMap[phc].times.push(v.responseTimeMs);
    });

    const results = Object.values(phcMap).map((p) => ({
        name: p.name,
        avgMs: Math.round(p.totalMs / p.count),
        minMs: Math.min(...p.times),
        maxMs: Math.max(...p.times),
        casesReviewed: p.count,
    }));

    results.sort((a, b) => a.avgMs - b.avgMs);

    return {
        phcs: results,
        fastest: results[0] || null,
        delayed: results.filter((r) => r.avgMs > 3600000), // >1 hour
        overallAvgMs:
            results.length > 0
                ? Math.round(
                    results.reduce((sum, r) => sum + r.avgMs, 0) / results.length
                )
                : 0,
    };
}

/**
 * Village-wise case load (Feature 8)
 */
export function getVillageCaseLoad(visits) {
    const map = {};

    visits.forEach((v) => {
        const village = v.patientVillage || 'Unknown';
        if (!map[village]) {
            map[village] = {
                name: village,
                totalCases: 0,
                highRisk: 0,
                monitoring: 0,
                pending: 0,
            };
        }
        map[village].totalCases++;
        if (v.riskLevel === 'Red' || (v.news2Score && v.news2Score >= 7)) {
            map[village].highRisk++;
        }
        if (v.status === 'Under Monitoring') map[village].monitoring++;
        if (v.status === 'Pending PHC Review') map[village].pending++;
    });

    return Object.values(map).sort((a, b) => b.totalCases - a.totalCases);
}

/**
 * ASHA performance metrics (Feature 9)
 */
export function getASHAPerformanceMetrics(visits) {
    const map = {};

    visits.forEach((v) => {
        const asha = v.createdByName || v.createdBy || 'Unknown';
        if (!map[asha]) {
            map[asha] = {
                name: asha,
                totalCases: 0,
                highRiskIdentified: 0,
                escalated: 0,
                approvedReferrals: 0,
                reviewedCases: 0,
            };
        }
        map[asha].totalCases++;
        if (v.riskLevel === 'Red' || (v.news2Score && v.news2Score >= 7)) {
            map[asha].highRiskIdentified++;
        }
        if (v.reviewRequestedAt || v.status === 'Pending PHC Review') {
            map[asha].escalated++;
        }
        if (v.status === 'Referral Approved') map[asha].approvedReferrals++;
        if (
            v.reviewedAt ||
            v.status === 'Reviewed' ||
            v.status === 'Referral Approved'
        ) {
            map[asha].reviewedCases++;
        }
    });

    return Object.values(map).map((s) => ({
        ...s,
        highRiskRate:
            s.totalCases > 0
                ? Math.round((s.highRiskIdentified / s.totalCases) * 100)
                : 0,
        escalationAccuracy:
            s.escalated > 0
                ? Math.round((s.approvedReferrals / s.escalated) * 100)
                : 0,
    }));
}

/**
 * PHC performance metrics (Feature 9)
 */
export function getPHCPerformanceMetrics(visits) {
    const map = {};

    visits.forEach((v) => {
        if (!v.reviewedBy) return;
        const phc = v.reviewedBy;
        if (!map[phc]) {
            map[phc] = {
                name: phc,
                totalReviewed: 0,
                approvedReferrals: 0,
                monitoring: 0,
                clarifications: 0,
                responseTimes: [],
                closedCases: 0,
            };
        }
        map[phc].totalReviewed++;
        if (v.status === 'Referral Approved') map[phc].approvedReferrals++;
        if (v.status === 'Under Monitoring') map[phc].monitoring++;
        if (v.clarificationMessage) map[phc].clarifications++;
        if (v.responseTimeMs) map[phc].responseTimes.push(v.responseTimeMs);
        if (
            v.status === 'Reviewed' ||
            v.status === 'Referral Approved' ||
            v.status === 'Completed'
        ) {
            map[phc].closedCases++;
        }
    });

    return Object.values(map).map((p) => ({
        ...p,
        avgResponseMs:
            p.responseTimes.length > 0
                ? Math.round(
                    p.responseTimes.reduce((a, b) => a + b, 0) /
                    p.responseTimes.length
                )
                : null,
        closureRate:
            p.totalReviewed > 0
                ? Math.round((p.closedCases / p.totalReviewed) * 100)
                : 0,
        referralRate:
            p.totalReviewed > 0
                ? Math.round((p.approvedReferrals / p.totalReviewed) * 100)
                : 0,
        monitoringRate:
            p.totalReviewed > 0
                ? Math.round((p.monitoring / p.totalReviewed) * 100)
                : 0,
    }));
}

/**
 * Escalation volume stats per PHC (Deep Clinical Support)
 * Returns total escalations, high NEWS2 cases, monitor vs referral ratio
 */
export function getEscalationVolumeStats(visits) {
    const escalated = visits.filter(v => v.reviewRequestedAt || v.status === 'Pending PHC Review');
    const highNEWS2 = escalated.filter(v => v.news2Score && v.news2Score >= 7);
    const monitoring = visits.filter(v => v.status === 'Under Monitoring');
    const referrals = visits.filter(v => v.status === 'Referral Approved');
    const pending = visits.filter(v => v.status === 'Pending PHC Review');

    // SLA breaches: cases pending > 60 minutes
    const now = Date.now();
    const slaBreaches = pending.filter(v => {
        if (!v.reviewRequestedAt) return false;
        const reqTime = v.reviewRequestedAt.toDate
            ? v.reviewRequestedAt.toDate()
            : new Date(v.reviewRequestedAt);
        return (now - reqTime.getTime()) > 3600000; // >1 hour
    });

    return {
        totalEscalations: escalated.length,
        highNEWS2Cases: highNEWS2.length,
        monitoringCount: monitoring.length,
        referralCount: referrals.length,
        pendingCount: pending.length,
        slaBreaches: slaBreaches.length,
        monitorReferralRatio: referrals.length > 0
            ? (monitoring.length / referrals.length).toFixed(1)
            : monitoring.length > 0 ? '∞' : '0',
    };
}

/**
 * Repeat Escalation Indicator (Deep Clinical Support)
 * Identifies patients who have been escalated multiple times
 */
export function getRepeatEscalations(visits) {
    const patientMap = {};

    visits.forEach(v => {
        if (!v.reviewRequestedAt && v.status !== 'Pending PHC Review') return;
        const pid = v.patientId || v.patientDocId || '';
        if (!pid) return;
        if (!patientMap[pid]) {
            patientMap[pid] = {
                patientId: pid,
                patientName: v.patientName || 'Unknown',
                village: v.patientVillage || 'Unknown',
                count: 0,
                latestRisk: v.riskLevel || '',
                latestNews2: v.news2Score || 0,
                visits: [],
            };
        }
        patientMap[pid].count++;
        patientMap[pid].visits.push({
            visitId: v.id,
            date: v.createdAt?.toDate?.() || null,
            risk: v.riskLevel,
            news2: v.news2Score,
            status: v.status,
        });
        // Keep latest risk info
        if (v.createdAt?.toDate?.() > (patientMap[pid].latestDate || new Date(0))) {
            patientMap[pid].latestRisk = v.riskLevel || '';
            patientMap[pid].latestNews2 = v.news2Score || 0;
            patientMap[pid].latestDate = v.createdAt?.toDate?.();
        }
    });

    return Object.values(patientMap)
        .filter(p => p.count > 1)
        .sort((a, b) => b.count - a.count);
}
