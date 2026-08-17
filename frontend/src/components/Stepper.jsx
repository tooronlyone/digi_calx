export const JOB_FLOW = [
  "AWAITING_PAYMENT",
  "BOOKING_CONFIRMED",
  "AWAITING_HANDOVER",
  "RECEIVED",
  "CALIBRATION_IN_PROGRESS",
  "RESULT_REVIEW",
  "CERTIFICATE_ISSUED",
  "RETURN_IN_TRANSIT",
  "DELIVERED",
  "CLOSED",
];

const BRANCH_AFTER = {
  CUSTOMER_DECISION_REQUIRED: "CALIBRATION_IN_PROGRESS",
  ADJUSTMENT_PAYMENT_DUE: "CALIBRATION_IN_PROGRESS",
  ADJUSTMENT_AUTHORIZED: "CALIBRATION_IN_PROGRESS",
  ADJUSTMENT_IN_PROGRESS: "CALIBRATION_IN_PROGRESS",
  RECALIBRATION_IN_PROGRESS: "CALIBRATION_IN_PROGRESS",
  DISPUTED: null,
  ON_HOLD: null,
  CANCELLED: null,
};

export function statusLabel(status) {
  return (status || "").replaceAll("_", " ");
}

export default function Stepper({ status }) {
  let effectiveIndex = JOB_FLOW.indexOf(status);
  const isBranch = effectiveIndex === -1 && status in BRANCH_AFTER;
  if (isBranch && BRANCH_AFTER[status]) {
    effectiveIndex = JOB_FLOW.indexOf(BRANCH_AFTER[status]);
  }

  return (
    <div>
      <div className="stepper">
        {JOB_FLOW.map((s, i) => {
          const complete = i < effectiveIndex || (i === effectiveIndex && !isBranch);
          const current = i === effectiveIndex;
          return (
            <div key={s} className={"step" + (complete ? " complete" : "") + (current ? " current" : "")}>
              {i > 0 && <div className="step-connector" />}
              <div className="step-dot" />
              <div className="step-code">{statusLabel(s)}</div>
            </div>
          );
        })}
      </div>
      {isBranch && (
        <div className="pill warn mt-16">{statusLabel(status)}</div>
      )}
    </div>
  );
}
