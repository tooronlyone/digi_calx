import os
import uuid
import shutil
import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas, auth
from .database import Base, engine, get_db

PLATFORM_COMMISSION_RATE = 0.10  # fallback default; the live rate is stored in PlatformConfig


def get_commission_rate(db: Session) -> float:
    config = db.query(models.PlatformConfig).first()
    if not config:
        config = models.PlatformConfig(commission_rate=PLATFORM_COMMISSION_RATE)
        db.add(config)
        db.flush()
    return config.commission_rate


def attach_rating(db: Session, org: models.Organization) -> models.Organization:
    """Annotate an Organization ORM instance with avg_rating/rating_count (not persisted)."""
    avg, count = db.query(
        func.avg(models.Rating.overall), func.count(models.Rating.id)
    ).filter(models.Rating.lab_org_id == org.id).first()
    org.avg_rating = round(avg, 2) if avg else None
    org.rating_count = count or 0
    return org

Base.metadata.create_all(bind=engine)

ADMIN_EMAIL = os.environ.get("DIGICALX_ADMIN_EMAIL", "admin@digicalx.pk")
ADMIN_PASSWORD = os.environ.get("DIGICALX_ADMIN_PASSWORD", "DigiCalX@Admin123")


def seed_admin():
    """Create the default platform admin account on first startup, if one doesn't exist yet."""
    from .database import SessionLocal
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.is_admin == True).first()  # noqa: E712
        if not existing:
            admin = models.User(
                email=ADMIN_EMAIL,
                hashed_password=auth.hash_password(ADMIN_PASSWORD),
                full_name="Platform Administrator",
                role="admin",
                organization_id=None,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
        if not db.query(models.PlatformConfig).first():
            db.add(models.PlatformConfig(commission_rate=PLATFORM_COMMISSION_RATE))
            db.commit()
    finally:
        db.close()


seed_admin()

app = FastAPI(title="Digi_CalX API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/auth/register", response_model=schemas.TokenOut)
def register(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    if payload.org_type not in ("factory", "lab"):
        raise HTTPException(400, "org_type must be 'factory' or 'lab'")
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    org = models.Organization(
        name=payload.org_name,
        org_type=payload.org_type,
        city=payload.city,
    )
    db.add(org)
    db.flush()

    user = models.User(
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        full_name=payload.full_name,
        role="admin",
        organization_id=org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.TokenOut(access_token=token, user=user)


@app.post("/auth/login", response_model=schemas.TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.TokenOut(access_token=token, user=user)


@app.post("/auth/login-json", response_model=schemas.TokenOut)
def login_json(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.TokenOut(access_token=token, user=user)


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Labs (discovery)
# ---------------------------------------------------------------------------
@app.get("/labs", response_model=List[schemas.OrgOut])
def list_labs(db: Session = Depends(get_db)):
    labs = db.query(models.Organization).filter(models.Organization.org_type == "lab").all()
    return [attach_rating(db, lab) for lab in labs]


@app.get("/labs/{lab_id}/capabilities", response_model=List[schemas.CapabilityOut])
def lab_capabilities(lab_id: int, db: Session = Depends(get_db)):
    return db.query(models.Capability).filter(
        models.Capability.lab_org_id == lab_id, models.Capability.status == "active"
    ).all()


# ---------------------------------------------------------------------------
# Assets (factory)
# ---------------------------------------------------------------------------
@app.post("/assets", response_model=schemas.AssetOut)
def create_asset(payload: schemas.AssetIn, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "factory")
    asset = models.Asset(organization_id=current_user.organization_id, **payload.dict())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@app.get("/assets", response_model=List[schemas.AssetOut])
def list_assets(db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "factory")
    return db.query(models.Asset).filter(
        models.Asset.organization_id == current_user.organization_id
    ).order_by(models.Asset.id.desc()).all()


@app.get("/assets/{asset_id}", response_model=schemas.AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db),
               current_user: models.User = Depends(auth.get_current_user)):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset or asset.organization_id != current_user.organization_id:
        raise HTTPException(404, "Asset not found")
    return asset


# ---------------------------------------------------------------------------
# Capabilities (lab)
# ---------------------------------------------------------------------------
@app.post("/capabilities", response_model=schemas.CapabilityOut)
def create_capability(payload: schemas.CapabilityIn, db: Session = Depends(get_db),
                       current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "lab")
    cap = models.Capability(lab_org_id=current_user.organization_id, **payload.dict())
    db.add(cap)
    db.commit()
    db.refresh(cap)
    return cap


@app.get("/capabilities", response_model=List[schemas.CapabilityOut])
def list_my_capabilities(db: Session = Depends(get_db),
                          current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "lab")
    return db.query(models.Capability).filter(
        models.Capability.lab_org_id == current_user.organization_id
    ).order_by(models.Capability.id.desc()).all()


@app.patch("/capabilities/{cap_id}", response_model=schemas.CapabilityOut)
def update_capability(cap_id: int, payload: schemas.CapabilityIn, db: Session = Depends(get_db),
                       current_user: models.User = Depends(auth.get_current_user)):
    cap = db.query(models.Capability).filter(models.Capability.id == cap_id).first()
    if not cap or cap.lab_org_id != current_user.organization_id:
        raise HTTPException(404, "Capability not found")
    for k, v in payload.dict().items():
        setattr(cap, k, v)
    db.commit()
    db.refresh(cap)
    return cap


# ---------------------------------------------------------------------------
# Matching engine
# ---------------------------------------------------------------------------
def run_matching(db: Session, req: models.ServiceRequest) -> List[schemas.MatchOut]:
    asset = req.asset
    caps = db.query(models.Capability).filter(
        models.Capability.status == "active",
        models.Capability.measurand == asset.measurand,
        models.Capability.category == asset.category,
    ).all()

    results = []
    for cap in caps:
        explanation = ["Measurand matches", "Instrument category matches"]

        if asset.range_min is not None and asset.range_max is not None and \
           cap.range_min is not None and cap.range_max is not None:
            if not (cap.range_min <= asset.range_min and cap.range_max >= asset.range_max):
                continue
            explanation.append(f"Range {cap.range_min}-{cap.range_max} {cap.unit or ''} covers asset range")

        if req.accredited_required and not cap.accredited:
            continue
        if req.accredited_required:
            explanation.append("Accredited scope verified for this service")

        if req.service_mode != "either" and cap.location_mode != "both" and cap.location_mode != req.service_mode:
            continue
        explanation.append(f"Service mode '{cap.location_mode}' compatible")

        lab = db.query(models.Organization).filter(models.Organization.id == cap.lab_org_id).first()
        if not lab:
            continue
        attach_rating(db, lab)
        results.append(schemas.MatchOut(capability=cap, lab=lab, explanation=explanation))

    return results


# ---------------------------------------------------------------------------
# Service Requests
# ---------------------------------------------------------------------------
@app.post("/requests", response_model=schemas.ServiceRequestOut)
def create_request(payload: schemas.ServiceRequestIn, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "factory")
    asset = db.query(models.Asset).filter(models.Asset.id == payload.asset_id).first()
    if not asset or asset.organization_id != current_user.organization_id:
        raise HTTPException(404, "Asset not found")

    req = models.ServiceRequest(
        factory_org_id=current_user.organization_id,
        status="REQUEST_SUBMITTED",
        **payload.dict(),
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@app.get("/requests", response_model=List[schemas.ServiceRequestOut])
def list_requests(db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.organization.org_type == "factory":
        return db.query(models.ServiceRequest).filter(
            models.ServiceRequest.factory_org_id == current_user.organization_id
        ).order_by(models.ServiceRequest.id.desc()).all()
    else:
        # Lab: show all submitted requests that at least technically match one of their capabilities
        all_reqs = db.query(models.ServiceRequest).filter(
            models.ServiceRequest.status == "REQUEST_SUBMITTED"
        ).order_by(models.ServiceRequest.id.desc()).all()
        eligible = []
        for r in all_reqs:
            matches = run_matching(db, r)
            if any(m.lab.id == current_user.organization_id for m in matches):
                eligible.append(r)
        return eligible


@app.get("/requests/{req_id}", response_model=schemas.ServiceRequestOut)
def get_request(req_id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    req = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return req


@app.get("/requests/{req_id}/matches", response_model=List[schemas.MatchOut])
def get_matches(req_id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    req = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return run_matching(db, req)


# ---------------------------------------------------------------------------
# Quotes
# ---------------------------------------------------------------------------
@app.post("/requests/{req_id}/quotes", response_model=schemas.QuoteOut)
def create_quote(req_id: int, payload: schemas.QuoteIn, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "lab")
    req = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    quote = models.Quote(
        request_id=req_id,
        lab_org_id=current_user.organization_id,
        **payload.dict(),
    )
    db.add(quote)
    if req.status == "REQUEST_SUBMITTED":
        req.status = "QUOTES_AVAILABLE"
    db.commit()
    db.refresh(quote)
    return quote


@app.get("/requests/{req_id}/quotes", response_model=List[schemas.QuoteOut])
def list_quotes_for_request(req_id: int, db: Session = Depends(get_db),
                             current_user: models.User = Depends(auth.get_current_user)):
    quotes = db.query(models.Quote).filter(models.Quote.request_id == req_id).order_by(models.Quote.price).all()
    for q in quotes:
        if q.lab_org:
            attach_rating(db, q.lab_org)
    return quotes


@app.get("/quotes/mine", response_model=List[schemas.QuoteOut])
def list_my_quotes(db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "lab")
    return db.query(models.Quote).filter(
        models.Quote.lab_org_id == current_user.organization_id
    ).order_by(models.Quote.id.desc()).all()


@app.post("/quotes/{quote_id}/accept", response_model=schemas.JobOut)
def accept_quote(quote_id: int, payload: schemas.QuoteAcceptIn, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "factory")
    if payload.transport_mode not in ("self", "calx"):
        raise HTTPException(400, "transport_mode must be 'self' or 'calx'")

    quote = db.query(models.Quote).filter(models.Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(404, "Quote not found")
    req = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == quote.request_id).first()
    if req.factory_org_id != current_user.organization_id:
        raise HTTPException(403, "Not your request")
    if req.status in ("LAB_SELECTED", "BOOKING_CONFIRMED", "CLOSED"):
        raise HTTPException(400, "Request already booked")

    quote.status = "accepted"
    # reject other quotes
    others = db.query(models.Quote).filter(
        models.Quote.request_id == req.id, models.Quote.id != quote.id
    ).all()
    for o in others:
        o.status = "rejected"

    req.status = "BOOKING_CONFIRMED"

    transport_cost_used = quote.transport_cost if payload.transport_mode == "calx" else 0.0
    total = quote.price + transport_cost_used

    job = models.Job(
        request_id=req.id,
        quote_id=quote.id,
        factory_org_id=req.factory_org_id,
        lab_org_id=quote.lab_org_id,
        asset_id=req.asset_id,
        status="AWAITING_PAYMENT",
        transport_mode=payload.transport_mode,
        transport_cost=transport_cost_used,
        calibration_price=quote.price,
        total_amount=total,
        platform_commission_rate=get_commission_rate(db),
    )
    db.add(job)
    db.flush()

    payment = models.Payment(
        job_id=job.id, payer_org_id=req.factory_org_id, kind="booking",
        amount=total, status="pending",
    )
    db.add(payment)

    db.add(models.JobStatusHistory(
        job_id=job.id, status="AWAITING_PAYMENT", actor="factory",
        note=f"Quote accepted, transport via {payload.transport_mode}. Total due: PKR {total:,.0f}"
    ))
    db.commit()
    db.refresh(job)
    return job


@app.post("/jobs/{job_id}/pay", response_model=schemas.JobOut)
def pay_booking(job_id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    """Dummy payment gateway: instantly marks the pending booking payment as paid."""
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.factory_org_id:
        raise HTTPException(403, "Only the factory can pay for this job")
    if job.status != "AWAITING_PAYMENT":
        raise HTTPException(400, "No booking payment is due for this job")

    payment = db.query(models.Payment).filter(
        models.Payment.job_id == job.id, models.Payment.kind == "booking", models.Payment.status == "pending"
    ).first()
    if not payment:
        raise HTTPException(404, "Pending booking payment not found")

    payment.status = "paid"
    payment.paid_at = datetime.datetime.utcnow()
    job.status = "BOOKING_CONFIRMED"
    db.add(models.JobStatusHistory(
        job_id=job.id, status="BOOKING_CONFIRMED", actor="factory",
        note=f"Payment received (dummy gateway): PKR {payment.amount:,.0f}"
    ))
    db.commit()
    db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# Jobs & state machine
# ---------------------------------------------------------------------------
SIMPLE_TRANSITIONS = [
    "AWAITING_HANDOVER", "IN_TRANSIT_TO_LAB", "RECEIVED", "CALIBRATION_IN_PROGRESS",
    "CERTIFICATE_REVIEW", "READY_FOR_RETURN", "RETURN_IN_TRANSIT", "DELIVERED",
    "CLOSED", "ON_HOLD", "CANCELLED",
]


def _job_for_user(db: Session, job_id: int, current_user: models.User) -> models.Job:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if current_user.organization_id not in (job.factory_org_id, job.lab_org_id):
        raise HTTPException(403, "Not authorized for this job")
    return job


@app.get("/jobs", response_model=List[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db),
              current_user: models.User = Depends(auth.get_current_user)):
    org_id = current_user.organization_id
    return db.query(models.Job).filter(
        (models.Job.factory_org_id == org_id) | (models.Job.lab_org_id == org_id)
    ).order_by(models.Job.id.desc()).all()


@app.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db),
            current_user: models.User = Depends(auth.get_current_user)):
    return _job_for_user(db, job_id, current_user)


@app.get("/jobs/{job_id}/history", response_model=List[schemas.JobHistoryOut])
def get_job_history(job_id: int, db: Session = Depends(get_db),
                     current_user: models.User = Depends(auth.get_current_user)):
    _job_for_user(db, job_id, current_user)
    return db.query(models.JobStatusHistory).filter(
        models.JobStatusHistory.job_id == job_id
    ).order_by(models.JobStatusHistory.id).all()


def settle_job_payout(db: Session, job: models.Job):
    """On job close: sum paid payments, deduct platform commission, credit the lab's wallet."""
    already_settled = db.query(models.WalletTransaction).filter(
        models.WalletTransaction.job_id == job.id, models.WalletTransaction.tx_type == "payout"
    ).first()
    if already_settled:
        return

    paid_total = db.query(func.coalesce(func.sum(models.Payment.amount), 0.0)).filter(
        models.Payment.job_id == job.id, models.Payment.status == "paid"
    ).scalar()
    if not paid_total:
        return

    commission = round(paid_total * job.platform_commission_rate, 2)
    payout = round(paid_total - commission, 2)

    db.add(models.WalletTransaction(
        organization_id=job.lab_org_id, job_id=job.id, amount=paid_total, tx_type="payout",
        description=f"Job {job.id} settled: PKR {paid_total:,.0f} collected from factory"
    ))
    db.add(models.WalletTransaction(
        organization_id=job.lab_org_id, job_id=job.id, amount=-commission, tx_type="commission",
        description=f"Digi_CalX platform commission ({job.platform_commission_rate*100:.0f}%) on job {job.id}"
    ))


@app.post("/jobs/{job_id}/transitions", response_model=schemas.JobOut)
def transition_job(job_id: int, payload: schemas.JobTransitionIn, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    if payload.status not in SIMPLE_TRANSITIONS:
        raise HTTPException(400, f"'{payload.status}' must go through its dedicated endpoint")
    if job.status in ("AWAITING_PAYMENT", "ADJUSTMENT_PAYMENT_DUE") and payload.status != "CANCELLED":
        raise HTTPException(400, "A payment is due on this job before it can proceed")
    job.status = payload.status
    actor = "lab" if current_user.organization_id == job.lab_org_id else "factory"
    db.add(models.JobStatusHistory(job_id=job.id, status=payload.status, actor=actor, note=payload.note))

    if payload.status == "CLOSED":
        settle_job_payout(db, job)

    db.commit()
    db.refresh(job)
    return job


@app.get("/wallet", response_model=schemas.WalletOut)
def get_wallet(db: Session = Depends(get_db),
               current_user: models.User = Depends(auth.get_current_user)):
    auth.require_org_type(current_user, "lab")
    org_id = current_user.organization_id
    balance = db.query(func.coalesce(func.sum(models.WalletTransaction.amount), 0.0)).filter(
        models.WalletTransaction.organization_id == org_id
    ).scalar()
    txns = db.query(models.WalletTransaction).filter(
        models.WalletTransaction.organization_id == org_id
    ).order_by(models.WalletTransaction.id.desc()).all()
    return schemas.WalletOut(balance=round(balance or 0.0, 2), transactions=txns)


@app.post("/jobs/{job_id}/as-found", response_model=schemas.JobOut)
def submit_as_found(job_id: int, payload: schemas.AsFoundIn, db: Session = Depends(get_db),
                     current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.lab_org_id:
        raise HTTPException(403, "Only the assigned lab can submit as-found results")
    job.as_found_result = payload.as_found_result
    job.conformity = payload.conformity
    note = f"As-found recorded, conformity={payload.conformity}"
    if payload.conformity == "fail":
        job.status = "CUSTOMER_DECISION_REQUIRED"
        if payload.proposed_adjustment_cost is not None:
            job.proposed_adjustment_cost = payload.proposed_adjustment_cost
            note += f". Proposed adjustment charge: PKR {payload.proposed_adjustment_cost:,.0f}"
    else:
        job.status = "RESULT_REVIEW"
    db.add(models.JobStatusHistory(job_id=job.id, status=job.status, actor="lab", note=note))
    db.commit()
    db.refresh(job)
    return job


@app.post("/jobs/{job_id}/adjustment-decision", response_model=schemas.JobOut)
def adjustment_decision(job_id: int, payload: schemas.AdjustmentDecisionIn, db: Session = Depends(get_db),
                         current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.factory_org_id:
        raise HTTPException(403, "Only the factory can authorize adjustment")
    job.adjustment_requested = True

    if payload.authorized:
        cost = job.proposed_adjustment_cost or 0.0
        if cost > 0:
            # extra charge must be paid (dummy gateway) before the lab can proceed
            payment = models.Payment(
                job_id=job.id, payer_org_id=job.factory_org_id, kind="adjustment",
                amount=cost, status="pending",
            )
            db.add(payment)
            job.status = "ADJUSTMENT_PAYMENT_DUE"
            note = payload.note or f"Adjustment authorized, payment of PKR {cost:,.0f} due"
        else:
            # no extra charge was proposed - authorize immediately
            job.adjustment_authorized = True
            job.status = "ADJUSTMENT_AUTHORIZED"
            note = payload.note or "Adjustment authorized (no extra charge)"
    else:
        job.status = "RESULT_REVIEW"  # report as-found only, no adjustment
        note = payload.note or "Adjustment declined"

    db.add(models.JobStatusHistory(job_id=job.id, status=job.status, actor="factory", note=note))
    db.commit()
    db.refresh(job)
    return job


@app.post("/jobs/{job_id}/pay-adjustment", response_model=schemas.JobOut)
def pay_adjustment(job_id: int, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    """Dummy payment gateway: instantly marks the pending adjustment/repair charge as paid."""
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.factory_org_id:
        raise HTTPException(403, "Only the factory can pay for this job")
    if job.status != "ADJUSTMENT_PAYMENT_DUE":
        raise HTTPException(400, "No adjustment payment is due for this job")

    payment = db.query(models.Payment).filter(
        models.Payment.job_id == job.id, models.Payment.kind == "adjustment", models.Payment.status == "pending"
    ).first()
    if not payment:
        raise HTTPException(404, "Pending adjustment payment not found")

    payment.status = "paid"
    payment.paid_at = datetime.datetime.utcnow()
    job.adjustment_authorized = True
    job.status = "ADJUSTMENT_AUTHORIZED"
    db.add(models.JobStatusHistory(
        job_id=job.id, status="ADJUSTMENT_AUTHORIZED", actor="factory",
        note=f"Adjustment payment received (dummy gateway): PKR {payment.amount:,.0f}"
    ))
    db.commit()
    db.refresh(job)
    return job


@app.get("/jobs/{job_id}/payments", response_model=List[schemas.PaymentOut])
def list_job_payments(job_id: int, db: Session = Depends(get_db),
                       current_user: models.User = Depends(auth.get_current_user)):
    _job_for_user(db, job_id, current_user)
    return db.query(models.Payment).filter(models.Payment.job_id == job_id).order_by(models.Payment.id).all()


@app.post("/jobs/{job_id}/as-left", response_model=schemas.JobOut)
def submit_as_left(job_id: int, payload: schemas.AsLeftIn, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.lab_org_id:
        raise HTTPException(403, "Only the assigned lab can submit as-left results")
    if not job.adjustment_authorized:
        raise HTTPException(400, "Adjustment was not authorized for this job")
    job.as_left_result = payload.as_left_result
    job.status = "RESULT_REVIEW"
    db.add(models.JobStatusHistory(
        job_id=job.id, status=job.status, actor="lab", note="As-left recalibration recorded"
    ))
    db.commit()
    db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# Certificates
# ---------------------------------------------------------------------------
@app.post("/jobs/{job_id}/certificates", response_model=schemas.CertificateOut)
def issue_certificate(job_id: int, cert_number: str = Form(...),
                       file: Optional[UploadFile] = File(None),
                       db: Session = Depends(get_db),
                       current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.lab_org_id:
        raise HTTPException(403, "Only the assigned lab can issue a certificate")

    file_path = None
    if file is not None:
        ext = os.path.splitext(file.filename)[1] or ".pdf"
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, safe_name)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        file_path = f"/files/{safe_name}"

    existing_count = db.query(models.Certificate).filter(models.Certificate.job_id == job_id).count()
    cert = models.Certificate(
        job_id=job_id,
        cert_number=cert_number,
        version=existing_count + 1,
        file_path=file_path,
    )
    db.add(cert)
    job.status = "CERTIFICATE_ISSUED"
    db.add(models.JobStatusHistory(
        job_id=job.id, status="CERTIFICATE_ISSUED", actor="lab", note=f"Certificate {cert_number} issued"
    ))
    db.commit()
    db.refresh(cert)
    return cert


@app.get("/jobs/{job_id}/certificates", response_model=List[schemas.CertificateOut])
def list_certificates(job_id: int, db: Session = Depends(get_db),
                       current_user: models.User = Depends(auth.get_current_user)):
    _job_for_user(db, job_id, current_user)
    return db.query(models.Certificate).filter(models.Certificate.job_id == job_id).order_by(models.Certificate.version).all()


# ---------------------------------------------------------------------------
# Ratings
# ---------------------------------------------------------------------------
@app.post("/jobs/{job_id}/ratings", response_model=schemas.RatingOut)
def create_rating(job_id: int, payload: schemas.RatingIn, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    if current_user.organization_id != job.factory_org_id:
        raise HTTPException(403, "Only the factory can rate a completed job")
    rating = models.Rating(
        job_id=job_id, factory_org_id=job.factory_org_id, lab_org_id=job.lab_org_id, **payload.dict()
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@app.get("/jobs/{job_id}/ratings", response_model=List[schemas.RatingOut])
def list_ratings(job_id: int, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    _job_for_user(db, job_id, current_user)
    return db.query(models.Rating).filter(models.Rating.job_id == job_id).all()


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------
@app.post("/jobs/{job_id}/disputes", response_model=schemas.DisputeOut)
def open_dispute(job_id: int, payload: schemas.DisputeIn, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    job = _job_for_user(db, job_id, current_user)
    dispute = models.Dispute(
        job_id=job_id, opened_by_org_id=current_user.organization_id, **payload.dict()
    )
    db.add(dispute)
    job.status = "DISPUTED"
    db.add(models.JobStatusHistory(
        job_id=job.id, status="DISPUTED", actor="factory" if current_user.organization_id == job.factory_org_id else "lab",
        note=f"Dispute opened: {payload.dispute_type}"
    ))
    db.commit()
    db.refresh(dispute)
    return dispute


@app.get("/jobs/{job_id}/disputes", response_model=List[schemas.DisputeOut])
def list_job_disputes(job_id: int, db: Session = Depends(get_db),
                       current_user: models.User = Depends(auth.get_current_user)):
    _job_for_user(db, job_id, current_user)
    return db.query(models.Dispute).filter(models.Dispute.job_id == job_id).all()


@app.get("/disputes", response_model=List[schemas.DisputeOut])
def list_my_disputes(db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    jobs = db.query(models.Job.id).filter(
        (models.Job.factory_org_id == current_user.organization_id) |
        (models.Job.lab_org_id == current_user.organization_id)
    ).subquery()
    return db.query(models.Dispute).filter(models.Dispute.job_id.in_(jobs)).order_by(models.Dispute.id.desc()).all()


@app.get("/")
def root():
    return {"service": "Digi_CalX API", "status": "ok", "version": "1.0"}


# ---------------------------------------------------------------------------
# Admin (platform-wide oversight)
# ---------------------------------------------------------------------------
@app.get("/admin/stats", response_model=schemas.AdminStatsOut)
def admin_stats(db: Session = Depends(get_db), admin: models.User = Depends(auth.get_current_admin)):
    total_factories = db.query(models.Organization).filter(models.Organization.org_type == "factory").count()
    total_labs = db.query(models.Organization).filter(models.Organization.org_type == "lab").count()
    total_assets = db.query(models.Asset).count()
    total_requests = db.query(models.ServiceRequest).count()
    total_quotes = db.query(models.Quote).count()
    total_jobs = db.query(models.Job).count()

    status_rows = db.query(models.Job.status, func.count(models.Job.id)).group_by(models.Job.status).all()
    jobs_by_status = {s: c for s, c in status_rows}

    open_disputes = db.query(models.Dispute).filter(models.Dispute.status == "open").count()

    gross_collected = db.query(func.coalesce(func.sum(models.Payment.amount), 0.0)).filter(
        models.Payment.status == "paid"
    ).scalar() or 0.0
    commission_earned = db.query(func.coalesce(func.sum(models.WalletTransaction.amount), 0.0)).filter(
        models.WalletTransaction.tx_type == "commission"
    ).scalar() or 0.0

    return schemas.AdminStatsOut(
        total_factories=total_factories,
        total_labs=total_labs,
        total_assets=total_assets,
        total_requests=total_requests,
        total_quotes=total_quotes,
        total_jobs=total_jobs,
        jobs_by_status=jobs_by_status,
        open_disputes=open_disputes,
        gross_collected=round(gross_collected, 2),
        platform_commission_earned=round(abs(commission_earned), 2),
        commission_rate=get_commission_rate(db),
    )


@app.get("/admin/organizations", response_model=List[schemas.OrgAdminOut])
def admin_list_organizations(org_type: Optional[str] = None, db: Session = Depends(get_db),
                              admin: models.User = Depends(auth.get_current_admin)):
    q = db.query(models.Organization)
    if org_type:
        q = q.filter(models.Organization.org_type == org_type)
    orgs = q.order_by(models.Organization.id.desc()).all()
    for o in orgs:
        if o.org_type == "lab":
            attach_rating(db, o)
    return orgs


@app.post("/admin/organizations/{org_id}/verify", response_model=schemas.OrgAdminOut)
def admin_verify_organization(org_id: int, verified: bool = True, db: Session = Depends(get_db),
                               admin: models.User = Depends(auth.get_current_admin)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    org.verified = verified
    db.commit()
    db.refresh(org)
    if org.org_type == "lab":
        attach_rating(db, org)
    return org


@app.get("/admin/jobs", response_model=List[schemas.JobOut])
def admin_list_jobs(status: Optional[str] = None, db: Session = Depends(get_db),
                     admin: models.User = Depends(auth.get_current_admin)):
    q = db.query(models.Job)
    if status:
        q = q.filter(models.Job.status == status)
    return q.order_by(models.Job.id.desc()).all()


@app.get("/admin/jobs/{job_id}", response_model=schemas.JobOut)
def admin_get_job(job_id: int, db: Session = Depends(get_db),
                   admin: models.User = Depends(auth.get_current_admin)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/admin/jobs/{job_id}/history", response_model=List[schemas.JobHistoryOut])
def admin_get_job_history(job_id: int, db: Session = Depends(get_db),
                           admin: models.User = Depends(auth.get_current_admin)):
    return db.query(models.JobStatusHistory).filter(
        models.JobStatusHistory.job_id == job_id
    ).order_by(models.JobStatusHistory.id).all()


@app.get("/admin/disputes", response_model=List[schemas.DisputeOut])
def admin_list_disputes(status: Optional[str] = None, db: Session = Depends(get_db),
                         admin: models.User = Depends(auth.get_current_admin)):
    q = db.query(models.Dispute)
    if status:
        q = q.filter(models.Dispute.status == status)
    return q.order_by(models.Dispute.id.desc()).all()


@app.post("/admin/disputes/{dispute_id}/resolve", response_model=schemas.DisputeOut)
def admin_resolve_dispute(dispute_id: int, payload: schemas.DisputeResolveIn, db: Session = Depends(get_db),
                           admin: models.User = Depends(auth.get_current_admin)):
    if payload.status not in ("dismissed", "partially_upheld", "upheld"):
        raise HTTPException(400, "status must be dismissed, partially_upheld, or upheld")
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(404, "Dispute not found")
    dispute.status = payload.status
    dispute.resolution = payload.resolution
    dispute.resolved_by = admin.email
    dispute.resolved_at = datetime.datetime.utcnow()

    job = db.query(models.Job).filter(models.Job.id == dispute.job_id).first()
    if job and job.status == "DISPUTED":
        job.status = "ON_HOLD"
        db.add(models.JobStatusHistory(
            job_id=job.id, status="ON_HOLD", actor="admin",
            note=f"Dispute #{dispute.id} resolved ({payload.status}) by {admin.email}"
        ))

    db.commit()
    db.refresh(dispute)
    return dispute


@app.get("/admin/payments", response_model=List[schemas.PaymentOut])
def admin_list_payments(db: Session = Depends(get_db), admin: models.User = Depends(auth.get_current_admin)):
    return db.query(models.Payment).order_by(models.Payment.id.desc()).all()


@app.get("/admin/wallet-transactions", response_model=List[schemas.AdminWalletTxOut])
def admin_list_wallet_transactions(db: Session = Depends(get_db),
                                    admin: models.User = Depends(auth.get_current_admin)):
    txns = db.query(models.WalletTransaction).order_by(models.WalletTransaction.id.desc()).all()
    out = []
    for t in txns:
        org = db.query(models.Organization).filter(models.Organization.id == t.organization_id).first()
        out.append(schemas.AdminWalletTxOut(
            id=t.id, job_id=t.job_id, amount=t.amount, tx_type=t.tx_type, description=t.description,
            created_at=t.created_at, organization_id=t.organization_id,
            organization_name=org.name if org else None,
        ))
    return out


@app.get("/admin/commission-rate", response_model=schemas.CommissionRateOut)
def admin_get_commission_rate(db: Session = Depends(get_db), admin: models.User = Depends(auth.get_current_admin)):
    return schemas.CommissionRateOut(commission_rate=get_commission_rate(db))


@app.post("/admin/commission-rate", response_model=schemas.CommissionRateOut)
def admin_set_commission_rate(payload: schemas.CommissionRateIn, db: Session = Depends(get_db),
                               admin: models.User = Depends(auth.get_current_admin)):
    if not (0 <= payload.commission_rate <= 1):
        raise HTTPException(400, "commission_rate must be between 0 and 1 (e.g. 0.10 for 10%)")
    config = db.query(models.PlatformConfig).first()
    if not config:
        config = models.PlatformConfig()
        db.add(config)
    config.commission_rate = payload.commission_rate
    db.commit()
    return schemas.CommissionRateOut(commission_rate=config.commission_rate)
