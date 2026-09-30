/**
 * RecoverIQ — Pure JavaScript Deterministic Rule Engine
 * Mirrors recovery_agent.py 100% for client-side processing of unseen data.
 */

export function cleanValue(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

export function safeFloat(value, defaultValue = 0.0) {
  if (value === null || value === undefined) return defaultValue;
  const normalized = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return defaultValue;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : defaultValue;
}

export function safeInt(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!/^[+-]?\d+$/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isSafeInteger(num) ? num : null;
}

export function groupByOrgAndUnit(records) {
  const grouped = {};
  if (!Array.isArray(records)) return grouped;

  for (const record of records) {
    const orgId = cleanValue(record.org_id);
    const unitId = cleanValue(record.unit_id);

    if (!orgId || !unitId) continue;

    const key = `${orgId}::${unitId}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(record);
  }
  return grouped;
}

export function filterEvidenceForCharge(charge, evidence) {
  const chargeOrderId = cleanValue(charge.order_id);
  const chargeShipmentId = cleanValue(charge.fba_shipment_id);
  const chargeSku = cleanValue(charge.sku);
  const filtered = {};

  Object.keys(evidence).forEach(source => {
    filtered[source] = (evidence[source] || []).filter(record => {
      const recordOrderId = cleanValue(record.order_id);
      const recordShipmentId = cleanValue(record.fba_shipment_id);
      const recordSku = cleanValue(record.sku || record.ordered_sku);

      if (chargeOrderId && recordOrderId && chargeOrderId !== recordOrderId) return false;
      if (chargeShipmentId && recordShipmentId && chargeShipmentId !== recordShipmentId) return false;
      if (chargeSku && recordSku && chargeSku !== recordSku) return false;

      return true;
    });
  });

  return filtered;
}

export function chargeIdentifier(charge) {
  return cleanValue(charge.line_id || charge.eval_case_id || charge.charge_id || charge.id);
}

export function evidenceReference(source, record) {
  const photoRefsStr = cleanValue(record.photo_refs);
  let photos = [];
  if (photoRefsStr) {
    photos = photoRefsStr.split('|').map(s => s.trim()).filter(Boolean);
    if (photos.length === 1 && photos[0].includes(',')) {
      photos = photos[0].split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    source,
    record_id: cleanValue(record.record_id),
    unit_id: cleanValue(record.unit_id),
    org_id: cleanValue(record.org_id),
    captured_at: cleanValue(record.captured_at),
    operator_id: cleanValue(record.operator_id),
    photo_refs: photos
  };
}

export function evidenceRefsFor(source, records) {
  if (!Array.isArray(records)) return [];
  return records.map(record => evidenceReference(source, record));
}

export function makeCheck(checkKey, verdict, confidence, detail, evidenceRefs = [], latencyMs = 0) {
  return {
    check_key: checkKey,
    verdict: verdict, // 'PASS', 'FAIL', 'UNCERTAIN'
    confidence: Number(parseFloat(confidence).toFixed(3)),
    detail: detail,
    model_version: 'deterministic-fixture-policy-v0.3-js',
    latency_ms: latencyMs,
    evidence_refs: evidenceRefs || []
  };
}

export function receivingCheck(records) {
  if (!records || records.length === 0) {
    return makeCheck('receiving_evidence', 'UNCERTAIN', 0.0, 'No receiving evidence is available for this unit.');
  }

  const record = records[0];
  const cartonDamage = cleanValue(record.carton_damage);
  const unitDamage = cleanValue(record.unit_damage);
  const qualityFlags = cleanValue(record.quality_flags);
  const identityMatch = cleanValue(record.identity_match);
  const refs = evidenceRefsFor('receiving', records);

  if (identityMatch === 'uncertain') {
    return makeCheck(
      'receiving_evidence',
      'UNCERTAIN',
      0.45,
      'Receiving identity match is uncertain, so the evidence cannot be safely attributed to the charged unit.',
      refs
    );
  }

  const observedIssue = (
    (cartonDamage && cartonDamage !== 'none') ||
    (unitDamage && unitDamage !== 'none') ||
    Boolean(qualityFlags)
  );

  if (observedIssue) {
    return makeCheck(
      'receiving_evidence',
      'PASS',
      0.90,
      'Receiving evidence contains an observed carton damage, unit damage, or quality issue that supports an inbound defect condition.',
      refs
    );
  }

  return makeCheck(
    'receiving_evidence',
    'FAIL',
    0.90,
    'Receiving evidence shows no recorded carton damage, unit damage, or quality flag.',
    refs
  );
}

export function lostInboundCheck(records) {
  if (!records || records.length === 0) {
    return makeCheck('lost_inbound_quantity', 'UNCERTAIN', 0.0, 'No receiving evidence is available.');
  }

  const record = records[0];
  const ordered = safeInt(record.qty_ordered);
  const received = safeInt(record.qty_received);
  const refs = evidenceRefsFor('receiving', records);

  if (ordered === null || received === null) {
    return makeCheck('lost_inbound_quantity', 'UNCERTAIN', 0.0, 'Receiving quantity fields are missing or invalid.', refs);
  }

  if (received < ordered) {
    const shortage = ordered - received;
    return makeCheck(
      'lost_inbound_quantity',
      'PASS',
      0.95,
      `Receiving evidence records ${received} units received against ${ordered} ordered, indicating a shortage of ${shortage} units.`,
      refs
    );
  }

  if (received === ordered) {
    return makeCheck(
      'lost_inbound_quantity',
      'FAIL',
      0.95,
      `Receiving evidence records the full ordered quantity (${received}/${ordered}), contradicting a lost-inbound charge.`,
      refs
    );
  }

  return makeCheck(
    'lost_inbound_quantity',
    'UNCERTAIN',
    0.40,
    `Received quantity (${received}) exceeds ordered quantity (${ordered}); insufficient data.`,
    refs
  );
}

export function returnCheck(records) {
  if (!records || records.length === 0) {
    return makeCheck(
      'return_evidence',
      'UNCERTAIN',
      0.0,
      "No return evidence matches this charge's available identifiers. Missing or unmatched evidence cannot establish whether the item was returned."
    );
  }

  const refs = evidenceRefsFor('returns', records);

  for (const record of records) {
    const identity = cleanValue(record.identity_match);

    if (identity === 'yes') {
      return makeCheck(
        'return_evidence',
        'FAIL',
        0.90,
        'A return record exists and the returned item identity matches the ordered SKU.',
        refs
      );
    }

    if (identity === 'uncertain') {
      return makeCheck(
        'return_evidence',
        'UNCERTAIN',
        0.45,
        'Return evidence exists but identity matching is uncertain.',
        refs
      );
    }
  }

  return makeCheck(
    'return_evidence',
    'UNCERTAIN',
    0.50,
    'Return evidence exists, but identity information does not establish a reliable match.',
    refs
  );
}

export function warehouseDamageCheck(evidence) {
  const refs = [];
  Object.keys(evidence).forEach(source => {
    refs.push(...evidenceRefsFor(source, evidence[source] || []));
  });

  return makeCheck(
    'warehouse_damage_attribution',
    'UNCERTAIN',
    0.0,
    'The available fixture evidence does not provide an authoritative timestamp/location attribution proving that damage occurred in the warehouse.',
    refs
  );
}

export function weightTierCheck(evidence) {
  const refs = [];
  Object.keys(evidence).forEach(source => {
    refs.push(...evidenceRefsFor(source, evidence[source] || []));
  });

  return makeCheck(
    'weight_tier_evidence',
    'UNCERTAIN',
    0.0,
    'The supplied upstream fixture does not contain authoritative measured package weight/dimensions or fee-tier schedule required to validate this charge.',
    refs
  );
}

export function analyseCharge(charge, evidence) {
  const chargeType = cleanValue(charge.charge_type);

  if (chargeType === 'inbound_defect_fee') {
    return [receivingCheck(evidence.receiving || [])];
  }
  if (chargeType === 'lost_inbound') {
    return [lostInboundCheck(evidence.receiving || [])];
  }
  if (chargeType === 'refund_issued_item_not_returned') {
    return [returnCheck(evidence.returns || [])];
  }
  if (chargeType === 'fulfilment_fee_weight_tier') {
    return [weightTierCheck(evidence)];
  }
  if (chargeType === 'damaged_in_warehouse') {
    return [warehouseDamageCheck(evidence)];
  }

  return [
    makeCheck('charge_type_support', 'UNCERTAIN', 0.0, `Unknown or unsupported charge type: ${chargeType}`)
  ];
}

function evidenceForCharge(charge, groupedEvidence, upstreamStore) {
  const orgId = cleanValue(charge.org_id);
  const unitId = cleanValue(charge.unit_id);
  if (orgId && unitId) {
    const key = `${orgId}::${unitId}`;
    return {
      receiving: groupedEvidence.receiving[key] || [],
      prep: groupedEvidence.prep[key] || [],
      pack: groupedEvidence.pack[key] || [],
      returns: groupedEvidence.returns[key] || []
    };
  }

  const shipmentId = cleanValue(charge.fba_shipment_id);
  const orderId = cleanValue(charge.order_id);
  if (!orgId || (!shipmentId && !orderId)) {
    return { receiving: [], prep: [], pack: [], returns: [] };
  }

  const evidence = {};
  for (const source of ['receiving', 'prep', 'pack', 'returns']) {
    evidence[source] = (upstreamStore[source] || []).filter((record) => {
      if (cleanValue(record.org_id) !== orgId) return false;
      const recordShipmentId = cleanValue(record.fba_shipment_id || record.shipment_id);
      const recordOrderId = cleanValue(record.order_id);
      const shipmentMatches = Boolean(shipmentId && recordShipmentId === shipmentId);
      const orderMatches = Boolean(orderId && recordOrderId === orderId);
      if (!shipmentMatches && !orderMatches) return false;
      return filterEvidenceForCharge(charge, { [source]: [record] })[source].length > 0;
    });
  }
  return evidence;
}

export function deriveRecoveryDecision(checks) {
  if (!checks || checks.length === 0) return 'UNCERTAIN';

  const verdicts = checks.map(c => c.verdict);

  if (verdicts.includes('UNCERTAIN')) return 'UNCERTAIN';
  if (verdicts.every(v => v === 'FAIL')) return 'SUPPORTED';
  if (verdicts.some(v => v === 'PASS')) return 'CONTRADICTED';

  return 'UNCERTAIN';
}

function generateHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildCase(charge, evidence, duplicate = false) {
  evidence = filterEvidenceForCharge(charge, evidence);
  const lineId = chargeIdentifier(charge) || `FEE-${Math.floor(Math.random() * 10000)}`;
  const checks = duplicate
    ? [makeCheck('duplicate_charge', 'UNCERTAIN', 0.0, `Charge identifier ${lineId} appears more than once for this organization; this duplicate row is not eligible for recovery.`)]
    : analyseCharge(charge, evidence);
  const rawAmount = cleanValue(charge.amount_usd ?? charge.amount);
  const parsedAmount = rawAmount === null ? Number.NaN : Number(rawAmount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= 0;
  if (!amountValid) {
    checks.push(makeCheck(
      'charge_amount',
      'UNCERTAIN',
      0.0,
      'The charge amount is missing or invalid; a defensible claim amount cannot be established.'
    ));
  }
  const decision = deriveRecoveryDecision(checks);
  const amount = amountValid ? parsedAmount : 0.0;
  const claimable = decision === 'SUPPORTED' && amountValid;
  const generatedAt = new Date().toISOString();
  const reason = checks.map(c => c.detail).join(' ');

  const allEvidence = [];
  Object.keys(evidence).forEach(source => {
    (evidence[source] || []).forEach(record => {
      allEvidence.push(evidenceReference(source, record));
    });
  });

  const supportingEvidence = [];
  checks.forEach(c => {
    supportingEvidence.push(...(c.evidence_refs || []));
  });

  const outcomeStatus = decision === 'UNCERTAIN' ? 'pending_review' : 'resolved';
  const outcome = {
    recovery_decision: decision,
    claimable: claimable,
    amount_usd: claimable ? amount : 0.0,
    reason: reason,
    status: outcomeStatus,
    decided_by: 'deterministic_rule_engine',
    decided_at: generatedAt
  };

  const caseObj = {
    record_id: lineId,
    schema_version: '1.0',
    case_id: lineId,
    generated_at: generatedAt,
    status: outcomeStatus,
    charge: {
      line_id: lineId,
      report_type: cleanValue(charge.report_type) || 'fee_report',
      charge_type: cleanValue(charge.charge_type) || 'unknown',
      unit_id: cleanValue(charge.unit_id) || 'N/A',
      org_id: cleanValue(charge.org_id) || 'org_demo_alpha',
      sku: cleanValue(charge.sku) || 'N/A',
      fnsku: cleanValue(charge.fnsku) || '',
      fba_shipment_id: cleanValue(charge.fba_shipment_id) || '',
      order_id: cleanValue(charge.order_id) || '',
      quantity: safeInt(charge.quantity) || 1,
      amount_usd: amount,
      posted_date: cleanValue(charge.posted_date) || new Date().toISOString().slice(0, 10)
    },
    decision: outcome,
    outcome: outcome,
    checks: checks,
    evidence: allEvidence,
    overrides: [],
    trace: {
      charge_to_unit: cleanValue(charge.unit_id) || 'N/A',
      charge_to_org: cleanValue(charge.org_id) || 'N/A',
      upstream_evidence: allEvidence,
      evidence_interpretation: checks.map(c => ({
        check_key: c.check_key,
        verdict: c.verdict,
        confidence: c.confidence,
        detail: c.detail,
        evidence_record_ids: (c.evidence_refs || []).map(r => r.record_id).filter(Boolean)
      })),
      evaluated_evidence: allEvidence,
      supporting_evidence: decision === 'SUPPORTED' ? supportingEvidence : [],
      claim_decision: decision
    },
    content_hash: generateHash(JSON.stringify({ charge, decision, checks, evidence: allEvidence }))
  };

  return caseObj;
}

/**
 * Main Entry Point to evaluate ANY fee records array against operational evidence store
 */
export function evaluateUnseenDataset(feeRecords, upstreamStore) {
  // Group upstream evidence by (org_id, unit_id)
  const groupedUpstream = {
    receiving: groupByOrgAndUnit(upstreamStore.receiving || []),
    prep: groupByOrgAndUnit(upstreamStore.prep || []),
    pack: groupByOrgAndUnit(upstreamStore.pack || []),
    returns: groupByOrgAndUnit(upstreamStore.returns || [])
  };

  const cases = [];
  const seenChargeIds = new Set();

  for (const charge of feeRecords) {
    const orgId = cleanValue(charge.org_id);
    const unitId = cleanValue(charge.unit_id);
    const chargeId = chargeIdentifier(charge);
    const chargeKey = orgId && chargeId ? `${orgId}::${chargeId}` : null;
    const duplicate = chargeKey ? seenChargeIds.has(chargeKey) : false;

    if (chargeKey) seenChargeIds.add(chargeKey);

    const evidenceForUnit = evidenceForCharge(charge, groupedUpstream, upstreamStore);

    const caseObj = buildCase(charge, evidenceForUnit, duplicate);
    cases.push(caseObj);
  }

  return cases;
}
